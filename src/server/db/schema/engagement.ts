import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { products } from "./catalog";
import { customers } from "./customers";

export const enquiryStatusEnum = pgEnum("enquiry_status", ["new", "quoted", "closed"]);

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  topic: varchar("topic", { length: 40 }).notNull().default("general"),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
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
