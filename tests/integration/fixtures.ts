import { db } from "@/server/db/client";
import { countries, destinations, products, type NewProduct } from "@/server/db/schema";

export async function createDestination(slug = "luxor") {
  await db.insert(countries).values({ code: "EG", name: "Egypt", currency: "EGP" }).onConflictDoNothing();
  const [row] = await db
    .insert(destinations)
    .values({ slug, name: slug[0].toUpperCase() + slug.slice(1), countryCode: "EG" })
    .returning();
  return row;
}

export async function createProduct(over: Partial<NewProduct> = {}) {
  const [row] = await db
    .insert(products)
    .values({
      slug: `product-${Math.random().toString(36).slice(2, 8)}`,
      category: "tour",
      title: "Valley of the Kings day trip",
      priceCents: 4000,
      priceUnit: "person",
      maxGuests: 12,
      ...over,
    })
    .returning();
  return row;
}

export function isoInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
