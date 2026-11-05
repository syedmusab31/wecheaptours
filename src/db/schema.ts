import {
  boolean,
  date,
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
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["new", "quoted", "closed"]);
export const countryEnum = pgEnum("country", ["Egypt", "Jordan"]);

export type ItineraryStep = { time?: string; title: string; detail?: string };

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  country: countryEnum("country").notNull(),
  tagline: varchar("tagline", { length: 200 }).notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    category: categoryEnum("category").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 300 }).notNull().default(""),
    description: text("description").notNull().default(""),
    destinationId: integer("destination_id").references(() => destinations.id, {
      onDelete: "set null",
    }),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    /** Base price in USD */
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    priceUnit: priceUnitEnum("price_unit").notNull().default("person"),
    /** Shown on cards, e.g. "Full day · 9 hours" or "4 nights" */
    durationLabel: varchar("duration_label", { length: 80 }).notNull().default(""),
    /** Used for duration filters. Multi-day products: days × 24 */
    durationHours: integer("duration_hours").notNull().default(8),
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
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.category),
    index("products_destination_idx").on(t.destinationId),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 20 }).notNull().unique(),
    accessToken: varchar("access_token", { length: 64 }).notNull(),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    productTitle: varchar("product_title", { length: 200 }).notNull(),
    category: categoryEnum("category").notNull(),
    travelDate: date("travel_date").notNull(),
    endDate: date("end_date"),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    infants: integer("infants").notNull().default(0),
    units: integer("units").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    deposit: numeric("deposit", { precision: 10, scale: 2 }).notNull().default("0"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    country: varchar("country", { length: 80 }).notNull().default(""),
    pickupLocation: varchar("pickup_location", { length: 240 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_status_idx").on(t.status), index("bookings_email_idx").on(t.email)],
);

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  topic: varchar("topic", { length: 40 }).notNull().default("general"),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  travelDate: date("travel_date"),
  guests: integer("guests"),
  budget: varchar("budget", { length: 60 }).notNull().default(""),
  message: text("message").notNull().default(""),
  status: enquiryStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  authorName: varchar("author_name", { length: 120 }).notNull(),
  authorCountry: varchar("author_country", { length: 80 }).notNull().default(""),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 160 }).notNull().default(""),
  body: text("body").notNull(),
  travelMonth: varchar("travel_month", { length: 40 }).notNull().default(""),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().default("Admin"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
});

export type Destination = typeof destinations.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export type PriceUnit = (typeof priceUnitEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
