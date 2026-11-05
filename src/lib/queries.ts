import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { destinations, products, reviews, type Category, type Product } from "@/db/schema";

export type ProductWithDest = Product & { destinationName: string | null; destinationSlug: string | null; country: "Egypt" | "Jordan" | null };

const productSelect = {
  product: products,
  destinationName: destinations.name,
  destinationSlug: destinations.slug,
  country: destinations.country,
};

function flatten(rows: { product: Product; destinationName: string | null; destinationSlug: string | null; country: "Egypt" | "Jordan" | null }[]): ProductWithDest[] {
  return rows.map((r) => ({ ...r.product, destinationName: r.destinationName, destinationSlug: r.destinationSlug, country: r.country }));
}

export async function getDestinations() {
  return db.select().from(destinations).where(eq(destinations.isActive, true)).orderBy(asc(destinations.sortOrder));
}

export async function getDestinationBySlug(slug: string) {
  const [d] = await db.select().from(destinations).where(eq(destinations.slug, slug));
  return d ?? null;
}

/** Lowest active price per destination, for "from $X" on destination tiles */
export async function getDestinationFromPrices() {
  const rows = await db
    .select({ destinationId: products.destinationId, min: sql<string>`min(${products.price})`, count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.isActive, true))
    .groupBy(products.destinationId);
  return new Map(rows.map((r) => [r.destinationId, { min: Number(r.min), count: r.count }]));
}

export async function getFeatured(limit = 8) {
  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
    .orderBy(desc(products.reviewCount), asc(products.price))
    .limit(limit);
  return flatten(rows);
}

export async function getByCategory(category: Category, limit = 12) {
  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(and(eq(products.isActive, true), eq(products.category, category)))
    .orderBy(desc(products.isFeatured), asc(products.price))
    .limit(limit);
  return flatten(rows);
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)));
  return flatten(rows)[0] ?? null;
}

export async function getRelated(p: ProductWithDest, limit = 4) {
  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(
      and(
        eq(products.isActive, true),
        sql`${products.id} <> ${p.id}`,
        p.destinationId ? or(eq(products.destinationId, p.destinationId), eq(products.category, p.category)) : eq(products.category, p.category),
      ),
    )
    .orderBy(sql`case when ${products.destinationId} = ${p.destinationId ?? -1} then 0 else 1 end`, desc(products.reviewCount))
    .limit(limit);
  return flatten(rows);
}

export async function getProductReviews(productId: number, limit = 6) {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isPublished, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function getReviewStats() {
  const [r] = await db
    .select({ avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.isPublished, true));
  return { avg: Number(r?.avg ?? 0), count: r?.count ?? 0 };
}

export async function getLatestReviews(limit = 6) {
  return db
    .select({ review: reviews, productTitle: products.title, productSlug: products.slug, category: products.category })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(reviews.isPublished, true), gte(reviews.rating, 4)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// ── Search ──────────────────────────────────────────────────────────────

export type SearchParams = {
  category?: Category | "all";
  q?: string;
  destination?: string; // slug
  country?: "Egypt" | "Jordan";
  minPrice?: number;
  maxPrice?: number;
  duration?: string[]; // short | half | full | multi
  tags?: string[];
  privateOnly?: boolean;
  pickup?: boolean;
  guests?: number;
  sort?: "recommended" | "cheapest" | "rating" | "shortest";
};

export const DURATION_BUCKETS: Record<string, { label: string; min: number; max: number }> = {
  short: { label: "Up to 3 hours", min: 0, max: 3 },
  half: { label: "4 to 6 hours", min: 4, max: 6 },
  full: { label: "7 to 14 hours", min: 7, max: 14 },
  multi: { label: "Overnight or longer", min: 15, max: 100_000 },
};

export async function searchProducts(p: SearchParams) {
  const where: SQL[] = [eq(products.isActive, true)];
  if (p.category && p.category !== "all") where.push(eq(products.category, p.category));
  if (p.destination) where.push(eq(destinations.slug, p.destination));
  if (p.country) where.push(eq(destinations.country, p.country));
  if (p.q) {
    const like = `%${p.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(products.title, like), ilike(products.summary, like), ilike(destinations.name, like))!);
  }
  if (p.minPrice != null) where.push(gte(products.price, String(p.minPrice)));
  if (p.maxPrice != null) where.push(lte(products.price, String(p.maxPrice)));
  if (p.duration?.length) {
    const ors = p.duration
      .map((d) => DURATION_BUCKETS[d])
      .filter(Boolean)
      .map((b) => and(gte(products.durationHours, b.min), lte(products.durationHours, b.max))!);
    if (ors.length) where.push(or(...ors)!);
  }
  if (p.tags?.length) where.push(sql`${products.tags} ?| ${sql.raw(`array[${p.tags.map((t) => `'${t.replace(/[^a-z-]/g, "")}'`).join(",")}]`)}`);
  if (p.privateOnly) where.push(eq(products.isPrivate, true));
  if (p.pickup) where.push(eq(products.pickupIncluded, true));
  if (p.guests) where.push(gte(products.maxGuests, p.guests));

  const order =
    p.sort === "cheapest"
      ? [asc(products.price)]
      : p.sort === "rating"
        ? [desc(products.rating), desc(products.reviewCount)]
        : p.sort === "shortest"
          ? [asc(products.durationHours), asc(products.price)]
          : [desc(products.isFeatured), desc(products.reviewCount), asc(products.price)];

  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(and(...where))
    .orderBy(...order)
    .limit(60);
  return flatten(rows);
}

/** Facet counts shown next to the category tabs on the results page */
export async function categoryCounts(destinationSlug?: string) {
  const rows = await db
    .select({ category: products.category, count: sql<number>`count(*)::int` })
    .from(products)
    .leftJoin(destinations, eq(products.destinationId, destinations.id))
    .where(and(eq(products.isActive, true), destinationSlug ? eq(destinations.slug, destinationSlug) : undefined))
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
