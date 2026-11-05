import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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

/**
 * Two-step sign-in: after the password, a 6-digit code is emailed. Only an HMAC of the code is
 * stored; a challenge allows 5 attempts and expires after 10 minutes. A new code cancels older ones.
 */
export const loginChallenges = pgTable(
  "login_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ip: varchar("ip", { length: 64 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_challenges_admin_idx").on(t.adminId)],
);
