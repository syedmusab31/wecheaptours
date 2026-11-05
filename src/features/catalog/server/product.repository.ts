import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import {
  countries,
  destinations,
  products,
  type Category,
  type NewProduct,
  type Product,
} from "@/server/db/schema";
import { DURATION_BUCKETS } from "../catalog.constants";
import type { ProductWithDest, SearchFilters } from "../catalog.types";

const productWithDestination = {
  product: products,
  destinationName: destinations.name,
  destinationSlug: destinations.slug,
  country: countries.name,
  countryCode: destinations.countryCode,
};

type JoinedRow = {
  product: Product;
  destinationName: string | null;
  destinationSlug: string | null;
  country: string | null;
  countryCode: string | null;
};

function flatten(rows: JoinedRow[]): ProductWithDest[] {
  return rows.map((r) => ({
    ...r.product,
    destinationName: r.destinationName,
    destinationSlug: r.destinationSlug,
    country: r.country,
    countryCode: r.countryCode,
  }));
}

function selectWithDestination() {
  return db
    .select(productWithDestination)
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .leftJoin(countries, eq(destinations.countryCode, countries.code));
}

// ── Public reads ────────────────────────────────────────────────────────

export async function getFeatured(limit = 8) {
  const rows = await selectWithDestination()
    .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
    .orderBy(desc(products.reviewCount), asc(products.priceCents))
    .limit(limit);
  return flatten(rows);
}

export async function getByCategory(category: Category, limit = 12) {
  const rows = await selectWithDestination()
    .where(and(eq(products.isActive, true), eq(products.category, category)))
    .orderBy(desc(products.isFeatured), asc(products.priceCents))
    .limit(limit);
  return flatten(rows);
}

export async function getProductBySlug(slug: string) {
  const rows = await selectWithDestination().where(and(eq(products.slug, slug), eq(products.isActive, true)));
  return flatten(rows)[0] ?? null;
}

export async function getRelated(product: ProductWithDest, limit = 4) {
  const sameCategory = eq(products.category, product.category);
  const rows = await selectWithDestination()
    .where(
      and(
        eq(products.isActive, true),
        ne(products.id, product.id),
        product.destinationId
          ? or(eq(products.destinationId, product.destinationId), sameCategory)
          : sameCategory,
      ),
    )
    .orderBy(
      sql`case when ${products.destinationId} = ${product.destinationId ?? -1} then 0 else 1 end`,
      desc(products.reviewCount),
    )
    .limit(limit);
  return flatten(rows);
}

export async function searchProducts(filters: SearchFilters, limit = 60) {
  const where: SQL[] = [eq(products.isActive, true)];
  if (filters.category && filters.category !== "all") where.push(eq(products.category, filters.category));
  if (filters.destination) where.push(eq(destinations.slug, filters.destination));
  if (filters.country) {
    // Accepts a code ("EG") or a name ("Egypt")
    where.push(
      or(
        eq(destinations.countryCode, filters.country.toUpperCase()),
        ilike(countries.name, filters.country),
      )!,
    );
  }
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_\\]/g, "")}%`;
    where.push(
      or(ilike(products.title, like), ilike(products.summary, like), ilike(destinations.name, like))!,
    );
  }
  if (filters.minPrice != null) where.push(gte(products.priceCents, Math.round(filters.minPrice * 100)));
  if (filters.maxPrice != null) where.push(lte(products.priceCents, Math.round(filters.maxPrice * 100)));
  if (filters.duration?.length) {
    const ranges = filters.duration
      .map((key) => DURATION_BUCKETS[key])
      .filter(Boolean)
      .map((b) =>
        and(gte(products.durationMinutes, b.min * 60), lte(products.durationMinutes, b.max * 60 + 59))!,
      );
    if (ranges.length) where.push(or(...ranges)!);
  }
  if (filters.tags?.length) {
    // Each tag is a bound parameter: values are never spliced into the SQL text.
    const tags = sql.join(
      filters.tags.map((tag) => sql`${tag}`),
      sql`, `,
    );
    where.push(sql`${products.tags} ?| array[${tags}]::text[]`);
  }
  if (filters.privateOnly) where.push(eq(products.isPrivate, true));
  if (filters.pickup) where.push(eq(products.pickupIncluded, true));
  if (filters.guests) where.push(gte(products.maxGuests, filters.guests));

  const order =
    filters.sort === "cheapest"
      ? [asc(products.priceCents)]
      : filters.sort === "rating"
        ? [desc(products.rating), desc(products.reviewCount)]
        : filters.sort === "shortest"
          ? [asc(products.durationMinutes), asc(products.priceCents)]
          : [desc(products.isFeatured), desc(products.reviewCount), asc(products.priceCents)];

  const rows = await selectWithDestination()
    .where(and(...where))
    .orderBy(...order)
    .limit(limit);
  return flatten(rows);
}

/** Facet counts shown next to the category tabs on the results page */
export async function categoryCounts(destinationSlug?: string) {
  const rows = await db
    .select({ category: products.category, count: sql<number>`count(*)::int` })
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(
      and(eq(products.isActive, true), destinationSlug ? eq(destinations.slug, destinationSlug) : undefined),
    )
    .groupBy(products.category);
  return Object.fromEntries(rows.map((r) => [r.category, r.count])) as Partial<Record<Category, number>>;
}

/** Which destinations have products in each category (drives the search box options) */
export async function getAvailability() {
  const rows = await db
    .selectDistinct({ category: products.category, slug: destinations.slug })
    .from(products)
    .innerJoin(destinations, eq(products.destinationId, destinations.id))
    .where(eq(products.isActive, true));
  const map: Partial<Record<Category, string[]>> = {};
  for (const r of rows) (map[r.category] ??= []).push(r.slug);
  return map;
}

export async function getProductsByIds(ids: number[]) {
  if (!ids.length) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}

export async function getActiveProductForBooking(id: number, exec: Executor = db) {
  const [product] = await exec
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.isActive, true)));
  return product ?? null;
}

export async function getProductTitle(id: number) {
  const [row] = await db
    .select({ id: products.id, title: products.title })
    .from(products)
    .where(eq(products.id, id));
  return row ?? null;
}

export async function listForSitemap() {
  return db
    .select({ slug: products.slug, category: products.category, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.isActive, true));
}

// ── Admin ───────────────────────────────────────────────────────────────

export async function listForAdmin(category?: Category) {
  return db
    .select({ product: products, destinationName: destinations.name })
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(category ? eq(products.category, category) : undefined)
    .orderBy(asc(products.category), asc(destinations.sortOrder), asc(products.priceCents));
}

export async function listTitles() {
  return db.select({ id: products.id, title: products.title }).from(products).orderBy(asc(products.title));
}

export async function getProductById(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product ?? null;
}

export async function insertProduct(values: NewProduct, exec: Executor = db) {
  const [row] = await exec.insert(products).values(values).returning();
  return row;
}

export async function updateProduct(id: number, values: Partial<NewProduct>, exec: Executor = db) {
  const [row] = await exec.update(products).set(values).where(eq(products.id, id)).returning();
  return row ?? null;
}

export async function deleteProduct(id: number, exec: Executor = db) {
  await exec.delete(products).where(eq(products.id, id));
}

/** Recalculates the denormalised rating from published reviews */
export async function recomputeRating(productId: number, exec: Executor = db) {
  await exec.execute(sql`
    update products set
      rating = coalesce((select round(avg(rating)::numeric, 1) from reviews where product_id = ${productId} and is_published), 0),
      review_count = (select count(*) from reviews where product_id = ${productId} and is_published)
    where id = ${productId}`);
}
