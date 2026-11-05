import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

/** One row per guest email. Bookings and enquiries keep their own snapshot of name and phone. */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull().default(""),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  country: varchar("country", { length: 80 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
