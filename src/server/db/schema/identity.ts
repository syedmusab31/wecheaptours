import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** owner: everything · manager: catalogue, bookings, exports · agent: bookings and enquiries only */
export const adminRoleEnum = pgEnum("admin_role", ["owner", "manager", "agent"]);

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().default("Admin"),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").notNull().default("owner"),
  isActive: boolean("is_active").notNull().default(true),
  /** Bumped on password change, "sign out everywhere" and deactivation: older sessions stop working. */
  sessionVersion: integer("session_version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
