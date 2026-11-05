import { jsonb, pgTable, varchar } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
});
