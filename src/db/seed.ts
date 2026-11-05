import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DEFAULT_RATES } from "../lib/currency";
import { DESTINATIONS } from "./data/destinations";
import { PRODUCTS } from "./data/products";
import { DEMO_REVIEWS } from "./data/reviews";
import * as schema from "./schema";

const { destinations, products, reviews, adminUsers, settings } = schema;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
  const db = drizzle(pool, { schema });

  // Destinations (upsert by slug)
  for (const [i, d] of DESTINATIONS.entries()) {
    await db
      .insert(destinations)
      .values({ ...d, sortOrder: i })
      .onConflictDoUpdate({
        target: destinations.slug,
        set: { name: d.name, country: d.country, tagline: d.tagline, description: d.description, image: d.image, sortOrder: i },
      });
  }
  const destRows = await db.select().from(destinations);
  const destId = new Map(destRows.map((d) => [d.slug, d.id]));
  console.log(`✓ ${destRows.length} destinations`);

  // Products (upsert by slug)
  for (const p of PRODUCTS) {
    const values = {
      slug: p.slug,
      category: p.category,
      title: p.title,
      summary: p.summary,
      description: p.description,
      destinationId: destId.get(p.destination) ?? null,
      images: p.images,
      price: String(p.price),
      priceUnit: p.priceUnit,
      durationLabel: p.durationLabel,
      durationHours: p.durationHours,
      highlights: p.highlights,
      included: p.included ?? [],
      excluded: p.excluded ?? [],
      itinerary: p.itinerary ?? [],
      tags: p.tags ?? [],
      languages: p.languages ?? ["English", "Arabic"],
      meetingPoint: p.meetingPoint ?? "",
      isPrivate: p.isPrivate ?? false,
      pickupIncluded: p.pickupIncluded ?? true,
      minGuests: p.minGuests ?? 1,
      maxGuests: p.maxGuests ?? 12,
      bedrooms: p.bedrooms ?? null,
      minNights: p.minNights ?? 1,
      isFeatured: p.isFeatured ?? false,
    };
    await db.insert(products).values(values).onConflictDoUpdate({ target: products.slug, set: values });
  }
  const productRows = await db.select({ id: products.id, slug: products.slug }).from(products);
  const productId = new Map(productRows.map((p) => [p.slug, p.id]));
  console.log(`✓ ${PRODUCTS.length} products`);

  // Demo reviews: only on an empty reviews table, so re-seeding never duplicates
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(reviews);
  if (count === 0) {
    await db.insert(reviews).values(
      DEMO_REVIEWS.filter((r) => productId.has(r.product)).map((r) => ({
        productId: productId.get(r.product)!,
        authorName: r.authorName,
        authorCountry: r.authorCountry,
        rating: r.rating,
        title: r.title,
        body: r.body,
        travelMonth: r.travelMonth,
      })),
    );
    console.log(`✓ ${DEMO_REVIEWS.length} demo reviews`);
  }

  // Product rating = average of published reviews
  await db.execute(sql`
    update products p set
      rating = coalesce((select round(avg(r.rating)::numeric, 1) from reviews r where r.product_id = p.id and r.is_published), 0),
      review_count = (select count(*) from reviews r where r.product_id = p.id and r.is_published)
  `);

  // Settings
  const defaults: Record<string, unknown> = {
    rates: DEFAULT_RATES,
    demoMode: true,
    contact: {
      phone: "+20 100 000 0000",
      whatsapp: "201000000000",
      email: "hello@wecheaptours.com",
      address: "Cairo, Egypt",
      licence: "Egyptian Tourism Authority licence no. — (add in Admin → Settings)",
    },
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }
  console.log("✓ settings");

  // First admin
  const email = (process.env.ADMIN_EMAIL || "admin@wecheaptours.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (existing.length === 0) {
    await db.insert(adminUsers).values({ email, name: "Admin", passwordHash: await bcrypt.hash(password, 10) });
    console.log(`✓ admin user ${email}`);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
