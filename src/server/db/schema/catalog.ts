import {
  boolean,
  char,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", ["tour", "cruise", "transfer", "stay", "package"]);
export const priceUnitEnum = pgEnum("price_unit", ["person", "group", "night", "vehicle"]);
export const addonUnitEnum = pgEnum("addon_unit", ["person", "booking"]);

export type ItineraryStep = { time?: string; title: string; detail?: string };
export type GuestTier = { key: string; label: string; share: number };

/** Countries we sell in. Adding one is an admin task, not a code change. */
export const countries = pgTable("countries", {
  /** ISO 3166-1 alpha-2, e.g. EG, JO */
  code: char("code", { length: 2 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  /** ISO 4217 local currency, e.g. EGP */
  currency: char("currency", { length: 3 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const destinations = pgTable(
  "destinations",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code),
    tagline: varchar("tagline", { length: 200 }).notNull().default(""),
    description: text("description").notNull().default(""),
    image: text("image").notNull().default(""),
    /** Map position (WGS84). Without it the destination is listed under the map instead of pinned. */
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("destinations_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops"))],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    category: categoryEnum("category").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 300 }).notNull().default(""),
    description: text("description").notNull().default(""),
    destinationId: integer("destination_id").references(() => destinations.id, { onDelete: "set null" }),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    /** Base price in minor units (cents) of `currency` */
    priceCents: integer("price_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    priceUnit: priceUnitEnum("price_unit").notNull().default("person"),
    /** Shown on cards, e.g. "Full day · 9 hours" or "4 nights" */
    durationLabel: varchar("duration_label", { length: 80 }).notNull().default(""),
    /** Used for duration filters. Multi-day products: days × 24 × 60 */
    durationMinutes: integer("duration_minutes").notNull().default(480),
    highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
    included: jsonb("included").$type<string[]>().notNull().default([]),
    excluded: jsonb("excluded").$type<string[]>().notNull().default([]),
    itinerary: jsonb("itinerary").$type<ItineraryStep[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    languages: jsonb("languages").$type<string[]>().notNull().default(["English"]),
    meetingPoint: text("meeting_point").notNull().default(""),
    isPrivate: boolean("is_private").notNull().default(false),
    pickupIncluded: boolean("pickup_included").notNull().default(true),
    minGuests: integer("min_guests").notNull().default(1),
    maxGuests: integer("max_guests").notNull().default(12),
    /** Stays only */
    bedrooms: integer("bedrooms"),
    /** Stays: minimum nights */
    minNights: integer("min_nights").notNull().default(1),
    /** Extra guest types on per-person prices, e.g. [{ key: "senior", label: "Senior (65+)", share: 0.8 }] */
    guestTiers: jsonb("guest_tiers").$type<GuestTier[]>().notNull().default([]),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_idx").on(t.category),
    index("products_destination_idx").on(t.destinationId),
    index("products_is_active_category_idx").on(t.isActive, t.category),
    index("products_is_active_is_featured_idx").on(t.isActive, t.isFeatured),
    index("products_tags_gin_idx").using("gin", t.tags),
    // Trigram indexes (pg_trgm) make the search box's ILIKE '%word%' use an index instead of a full scan
    index("products_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
    index("products_summary_trgm_idx").using("gin", t.summary.op("gin_trgm_ops")),
  ],
);

/** Variants of one product, each with its own price and limits ("Shared group" vs "Private car") */
export const productOptions = pgTable(
  "product_options",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 300 }).notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    priceUnit: priceUnitEnum("price_unit").notNull().default("person"),
    minGuests: integer("min_guests").notNull().default(1),
    maxGuests: integer("max_guests").notNull().default(12),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("product_options_product_idx").on(t.productId)],
);

/**
 * Price adjustments by date range, weekday or group size, e.g. "Christmas week +25%".
 * A rule applies when every condition it sets matches; the percentages of all matching rules add up.
 */
export const priceRules = pgTable(
  "price_rules",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Null: applies to every option */
    optionId: integer("option_id").references(() => productOptions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    /** 0 = Sunday … 6 = Saturday; null = any day */
    weekdays: jsonb("weekdays").$type<number[]>(),
    minGuests: integer("min_guests"),
    /** e.g. 25 for +25%, -10 for −10% */
    percentChange: numeric("percent_change", { precision: 6, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("price_rules_product_idx").on(t.productId)],
);

export const productAddons = pgTable(
  "product_addons",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    unit: addonUnitEnum("unit").notNull().default("person"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("product_addons_product_idx").on(t.productId)],
);

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  /** Stored upper-case */
  code: varchar("code", { length: 40 }).notNull().unique(),
  description: varchar("description", { length: 200 }).notNull().default(""),
  /** Exactly one of percentOff / amountOffCents is set */
  percentOff: integer("percent_off"),
  amountOffCents: integer("amount_off_cents"),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
