import "server-only";
import { enqueueReminders } from "@/features/booking/server/booking.jobs";
import { expireStalePending } from "@/features/booking/server/booking.service";
import { applyRetentionPolicy } from "@/features/customer/server/retention.repository";
import { syncExchangeRates } from "@/features/settings/server/fx.service";
import { addDays, toISODate } from "@/lib/dates";
import { pruneFinishedJobs } from "@/server/jobs/queue";
import { logger } from "@/server/logger";
import { pruneRateLimits } from "@/server/security/rate-limit";

/** Runs each task, logging failures without stopping the others */
async function runAll(tasks: Record<string, () => Promise<unknown>>) {
  const results: Record<string, unknown> = {};
  for (const [name, task] of Object.entries(tasks)) {
    try {
      results[name] = await task();
    } catch (err) {
      results[name] = { error: err instanceof Error ? err.message : String(err) };
      logger.error({ event: "scheduled.failed", task: name, err }, "scheduled task failed");
    }
  }
  return results;
}

/** Once a day at 00:00 UTC, 02:00–03:00 in Cairo (see vercel.json) */
export function runDaily(now = new Date()) {
  const today = toISODate(now);
  return runAll({
    expiredPending: () => expireStalePending(today),
    remindersQueued: () => enqueueReminders(addDays(today, 1)),
    exchangeRates: () => syncExchangeRates(),
  });
}

/** Once a week */
export function runWeekly() {
  return runAll({
    retention: () => applyRetentionPolicy(),
    rateLimitRowsPruned: () => pruneRateLimits(),
    finishedJobsPruned: () => pruneFinishedJobs(30),
  });
}
