import {
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { availabilitySlots } from "./availability";
import { categoryEnum, productOptions, products, promoCodes } from "./catalog";
import { customers } from "./customers";

/** Allowed moves between these states live in features/booking/domain/booking-status.ts */
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "declined",
  "expired",
  "completed",
  "cancelled",
  "no_show",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "deposit_paid",
  "paid",
  "refunded",
  "partially_refunded",
]);
export const actorTypeEnum = pgEnum("actor_type", ["guest", "admin", "system"]);
export const paymentKindEnum = pgEnum("payment_kind", ["deposit", "balance", "full", "refund"]);
export const paymentRecordStatusEnum = pgEnum("payment_record_status", ["pending", "succeeded", "failed"]);

export type PriceLine = { label: string; amountCents: number };
export type BookedTier = { key: string; label: string; count: number };
export type BookedAddon = { id: number; name: string; quantity: number; amountCents: number };

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 20 }).notNull().unique(),
    /** Sent by the checkout form once per submit: a double-click or a retry returns the same booking */
    idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    optionId: integer("option_id").references(() => productOptions.id, { onDelete: "set null" }),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    // Snapshots: what the guest booked, even if the product changes later
    productTitle: varchar("product_title", { length: 200 }).notNull(),
    optionName: varchar("option_name", { length: 120 }).notNull().default(""),
    category: categoryEnum("category").notNull(),
    travelDate: date("travel_date").notNull(),
    endDate: date("end_date"),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    infants: integer("infants").notNull().default(0),
    /** Senior, student… guests, with the labels as booked */
    tierGuests: jsonb("tier_guests").$type<BookedTier[]>().notNull().default([]),
    units: integer("units").notNull().default(1),
    // Money in minor units of `currency`
    unitPriceCents: integer("unit_price_cents").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    depositCents: integer("deposit_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    /** The currency and rate the guest saw at checkout */
    displayCurrency: char("display_currency", { length: 3 }).notNull().default("USD"),
    fxRate: numeric("fx_rate", { precision: 12, scale: 6 }).notNull().default("1"),
    priceLines: jsonb("price_lines").$type<PriceLine[]>().notNull().default([]),
    addons: jsonb("addons").$type<BookedAddon[]>().notNull().default([]),
    promoCodeId: integer("promo_code_id").references(() => promoCodes.id, { onDelete: "set null" }),
    promoCode: varchar("promo_code", { length: 40 }).notNull().default(""),
    status: bookingStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    customerEmail: varchar("customer_email", { length: 200 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }).notNull(),
    customerCountry: varchar("customer_country", { length: 80 }).notNull().default(""),
    pickupLocation: varchar("pickup_location", { length: 240 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("bookings_status_idx").on(t.status),
    index("bookings_customer_email_idx").on(t.customerEmail),
    index("bookings_travel_date_idx").on(t.travelDate),
    index("bookings_created_at_id_idx").on(t.createdAt, t.id),
  ],
);

/** Seats a booking holds on each slot (one row for a tour, one per night for a stay) */
export const bookingReservations = pgTable(
  "booking_reservations",
  {
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    slotId: integer("slot_id")
      .notNull()
      .references(() => availabilitySlots.id, { onDelete: "restrict" }),
    seats: integer("seats").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.slotId] })],
);

/** Every status change, written in the same transaction as the change itself */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    fromStatus: bookingStatusEnum("from_status"),
    toStatus: bookingStatusEnum("to_status").notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: integer("actor_id"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    /** "stripe", "manual", … */
    provider: varchar("provider", { length: 20 }).notNull(),
    /** The provider's id for this payment; unique so a replayed webhook is ignored */
    providerRef: varchar("provider_ref", { length: 200 }).notNull().unique(),
    kind: paymentKindEnum("kind").notNull(),
    /** Refunds are stored as positive amounts with kind = refund */
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    status: paymentRecordStatusEnum("status").notNull(),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_booking_idx").on(t.bookingId)],
);
