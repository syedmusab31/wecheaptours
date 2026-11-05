import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Fixed-window request counters for rate limiting, shared by every server instance */
export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 200 }).primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "done", "failed"]);

/**
 * Background jobs (outbox). Services insert a job in the same transaction as the business write;
 * the cron worker runs it with retries. See src/server/jobs.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 60 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    /** Optional: a second job with the same key is not queued (e.g. one reminder per booking) */
    dedupeKey: varchar("dedupe_key", { length: 200 }).unique(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    status: jobStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("jobs_status_run_at_idx").on(t.status, t.runAt)],
);
