import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createDirectPool } from "@/server/db/pool";
import { DEFAULT_RATES } from "@/lib/money";
import { COORDINATES, DESTINATIONS } from "./data/destinations";
import { PRODUCTS } from "./data/products";
import { DEMO_REVIEWS } from "./data/reviews";
import * as schema from "@/server/db/schema";

const {
  countries,
  destinations,
  products,
  reviews,
  adminUsers,
  settings,
  productOptions,
  productAddons,
  priceRules,
  availabilitySlots,
  promoCodes,
} = schema;

const COUNTRIES = [
  { code: "EG", name: "Egypt", currency: "EGP", sortOrder: 0 },
  { code: "JO", name: "Jordan", currency: "JOD", sortOrder: 1 },
];
const COUNTRY_CODE: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.name, c.code]));

async function main() {
  const pool = createDirectPool();
  const db = drizzle(pool, { schema });

  // Countries
  for (const c of COUNTRIES) await db.insert(countries).values(c).onConflictDoNothing();
  console.log(`✓ ${COUNTRIES.length} countries`);

  // Destinations (upsert by slug)
  for (const [i, { country, ...d }] of DESTINATIONS.entries()) {
    const countryCode = COUNTRY_CODE[country];
    const [latitude, longitude] = COORDINATES[d.slug] ?? [null, null];
    await db
      .insert(destinations)
      .values({ ...d, countryCode, latitude, longitude, sortOrder: i })
      .onConflictDoUpdate({
        target: destinations.slug,
        set: {
          name: d.name,
          countryCode,
          latitude,
          longitude,
          tagline: d.tagline,
          description: d.description,
          image: d.image,
          sortOrder: i,
        },
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
      priceCents: Math.round(p.price * 100),
      priceUnit: p.priceUnit,
      durationLabel: p.durationLabel,
      durationMinutes: Math.round(p.durationHours * 60),
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

  // Demo pricing extras, a calendar and a promo code: only once, on a fresh database
  const giza = productId.get("giza-pyramids-sphinx-day-tour");
  const [{ optionCount }] = await db.select({ optionCount: sql<number>`count(*)::int` }).from(productOptions);
  if (giza && optionCount === 0) {
    await db.insert(productOptions).values([
      {
        productId: giza,
        name: "Small group",
        description: "Up to 12 guests, shared minivan",
        priceCents: 4500,
        priceUnit: "person",
        maxGuests: 12,
        sortOrder: 0,
      },
      {
        productId: giza,
        name: "Private car and guide",
        description: "Just your party",
        priceCents: 12000,
        priceUnit: "group",
        maxGuests: 6,
        sortOrder: 1,
      },
    ]);
    await db.insert(productAddons).values([
      { productId: giza, name: "Lunch with a pyramid view", priceCents: 1200, unit: "person" },
      { productId: giza, name: "Entry inside the Great Pyramid", priceCents: 2000, unit: "person" },
    ]);
    await db.insert(priceRules).values({
      productId: giza,
      name: "Holiday season +20%",
      startsOn: `${new Date().getFullYear()}-12-20`,
      endsOn: `${new Date().getFullYear() + 1}-01-05`,
      percentChange: "20",
    });
    // A live calendar for the next 60 days, so availability can be tried out
    const rows = Array.from({ length: 60 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        productId: giza,
        startsOn: iso,
        capacity: 12,
        status: (d.getDay() === 5 ? "closed" : "open") as "open" | "closed",
      };
    });
    await db.insert(availabilitySlots).values(rows).onConflictDoNothing();
    await db
      .insert(promoCodes)
      .values({ code: "WELCOME10", description: "Demo code", percentOff: 10 })
      .onConflictDoNothing();
    console.log("✓ demo options, extras, price rule, 60-day calendar and promo code WELCOME10");
  }

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
    await db
      .insert(adminUsers)
      .values({ email, name: "Admin", role: "owner", passwordHash: await bcrypt.hash(password, 10) });
    console.log(`✓ admin user ${email}`);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
