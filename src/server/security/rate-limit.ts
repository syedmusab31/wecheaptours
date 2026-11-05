import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { rateLimits } from "@/server/db/schema";
import { RateLimitError } from "@/server/errors";

type Rule = { limit: number; windowSeconds: number; scope: "ip" | "ip+subject" };

/** Limits per action (docs: Phase 3.1). A request must pass every rule of its action. */
export const RATE_LIMITS = {
  login: [
    { limit: 5, windowSeconds: 15 * 60, scope: "ip+subject" },
    { limit: 20, windowSeconds: 60 * 60, scope: "ip" },
  ],
  booking: [{ limit: 10, windowSeconds: 60 * 60, scope: "ip" }],
  enquiry: [{ limit: 5, windowSeconds: 60 * 60, scope: "ip" }],
  subscribe: [{ limit: 5, windowSeconds: 60 * 60, scope: "ip" }],
  bookingLookup: [{ limit: 10, windowSeconds: 60 * 60, scope: "ip" }],
  otpVerify: [{ limit: 20, windowSeconds: 15 * 60, scope: "ip" }],
  otpResend: [{ limit: 3, windowSeconds: 15 * 60, scope: "ip+subject" }],
} satisfies Record<string, Rule[]>;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/** Counts one hit in a fixed window and returns the count so far plus seconds until reset. */
async function hit(key: string, windowSeconds: number) {
  const expired = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds})`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({
      count: rateLimits.count,
      resetIn: sql<number>`greatest(1, ceil(extract(epoch from (${rateLimits.windowStart} + make_interval(secs => ${windowSeconds}) - now()))))::int`,
    });
  return row;
}

/**
 * Throws RateLimitError when `ip` (and optionally `subject`, e.g. an email) has used up the action's budget.
 * Fails open if the database is unreachable: a broken limiter must not take bookings down.
 */
export async function enforceRateLimit(action: RateLimitAction, ip: string, subject?: string) {
  for (const rule of RATE_LIMITS[action] as Rule[]) {
    const id = rule.scope === "ip+subject" && subject ? `${ip}|${subject.toLowerCase()}` : ip;
    const key = `${action}:${rule.windowSeconds}:${id}`.slice(0, 200);
    let result;
    try {
      result = await hit(key, rule.windowSeconds);
    } catch {
      return;
    }
    if (result.count > rule.limit) throw new RateLimitError(result.resetIn);
  }
}

/** Counts an event in a fixed window and returns how many happened so far (for alerts, not blocking) */
export async function countEvent(key: string, windowSeconds: number): Promise<number> {
  try {
    return (await hit(key.slice(0, 200), windowSeconds)).count;
  } catch {
    return 0;
  }
}

/** Deletes counters whose window ended more than a day ago (run by the cleanup job). */
export async function pruneRateLimits() {
  const res = await db.execute(
    sql`delete from ${rateLimits} where ${rateLimits.windowStart} < now() - interval '1 day'`,
  );
  return res.rowCount ?? 0;
}

/** Client IP behind Vercel / a proxy: first entry of x-forwarded-for */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
