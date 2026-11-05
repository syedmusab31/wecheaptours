import { date, index, integer, pgEnum, pgTable, serial, time, unique } from "drizzle-orm/pg-core";
import { products } from "./catalog";

/** Stored as the start time of a departure that has no fixed time */
export const ANY_TIME = "00:00:00";

export const slotStatusEnum = pgEnum("slot_status", ["open", "closed"]);

/**
 * Bookable capacity per product and date (and start time, for products with several departures).
 * Stays use one slot per night. Products with no slots at all are sold "on request".
 */
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    /** "00:00:00" = no fixed departure time (a plain unique key: drizzle-kit can't diff NULLS NOT DISTINCT) */
    startTime: time("start_time").notNull().default(ANY_TIME),
    /** Seats (per-person products) or units (vehicles, groups, a whole property) */
    capacity: integer("capacity").notNull(),
    reserved: integer("reserved").notNull().default(0),
    status: slotStatusEnum("status").notNull().default("open"),
    /** Overrides the category's lead time for this slot */
    cutoffHours: integer("cutoff_hours"),
  },
  (t) => [
    unique("availability_slots_product_date_time_uq").on(t.productId, t.startsOn, t.startTime),
    index("availability_slots_product_date_idx").on(t.productId, t.startsOn),
  ],
);
