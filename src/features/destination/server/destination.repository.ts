import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { countries, destinations, products } from "@/server/db/schema";

export type NewDestination = typeof destinations.$inferInsert;
export type NewCountry = typeof countries.$inferInsert;

/** Destination columns plus the country's name as `country` (what the UI shows) */
const destinationWithCountry = {
  id: destinations.id,
  slug: destinations.slug,
  name: destinations.name,
  countryCode: destinations.countryCode,
  country: countries.name,
  tagline: destinations.tagline,
  description: destinations.description,
  image: destinations.image,
  sortOrder: destinations.sortOrder,
  isActive: destinations.isActive,
};
export type DestinationView = {
  id: number;
  slug: string;
  name: string;
  countryCode: string;
  country: string;
  tagline: string;
  description: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
};

function selectDestinations() {
  return db
    .select(destinationWithCountry)
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryCode, countries.code));
}

export async function getDestinations(): Promise<DestinationView[]> {
  return selectDestinations()
    .where(eq(destinations.isActive, true))
    .orderBy(asc(countries.sortOrder), asc(destinations.sortOrder));
}

export async function getDestinationBySlug(slug: string): Promise<DestinationView | null> {
  const [row] = await selectDestinations().where(eq(destinations.slug, slug));
  return row ?? null;
}

/** Lowest active price (cents) per destination, for "from $X" on destination tiles */
export async function getDestinationFromPrices() {
  const rows = await db
    .select({
      destinationId: products.destinationId,
      minCents: sql<number>`min(${products.priceCents})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .groupBy(products.destinationId);
  return new Map(rows.map((r) => [r.destinationId, { minCents: r.minCents, count: r.count }]));
}

export async function listForSitemap() {
  return db.select({ slug: destinations.slug }).from(destinations).where(eq(destinations.isActive, true));
}

// ── Admin ───────────────────────────────────────────────────────────────

export async function listAll(): Promise<DestinationView[]> {
  return selectDestinations().orderBy(asc(countries.sortOrder), asc(destinations.sortOrder));
}

export async function listWithProductCounts() {
  return db
    .select({ destination: destinationWithCountry, productCount: sql<number>`count(${products.id})::int` })
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryCode, countries.code))
    .leftJoin(products, eq(products.destinationId, destinations.id))
    .groupBy(destinations.id, countries.code)
    .orderBy(asc(countries.sortOrder), asc(destinations.sortOrder));
}

export async function getDestinationById(id: number) {
  const [row] = await db.select().from(destinations).where(eq(destinations.id, id));
  return row ?? null;
}

export async function insertDestination(values: NewDestination, exec: Executor = db) {
  const [row] = await exec.insert(destinations).values(values).returning();
  return row;
}

export async function updateDestination(id: number, values: Partial<NewDestination>, exec: Executor = db) {
  const [row] = await exec.update(destinations).set(values).where(eq(destinations.id, id)).returning();
  return row ?? null;
}

// ── Countries ───────────────────────────────────────────────────────────

export async function listCountries(opts: { activeOnly?: boolean } = {}) {
  return db
    .select()
    .from(countries)
    .where(opts.activeOnly ? eq(countries.isActive, true) : undefined)
    .orderBy(asc(countries.sortOrder), asc(countries.name));
}

export async function upsertCountry(values: NewCountry) {
  const [row] = await db
    .insert(countries)
    .values(values)
    .onConflictDoUpdate({
      target: countries.code,
      set: {
        name: values.name,
        currency: values.currency,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      },
    })
    .returning();
  return row;
}
