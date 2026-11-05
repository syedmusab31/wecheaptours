import "server-only";
import { logger } from "@/server/logger";
import { claimJobs, completeJob, failJob } from "./queue";

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;
export type JobHandlers = Record<string, JobHandler>;

const MAX_ATTEMPTS = 5;

/**
 * Runs due jobs until none are left or the time budget is used. Every handler must be safe to run
 * twice (it checks the current state before acting), because a job is retried after a failure.
 */
export async function runJobs(handlers: JobHandlers, opts: { limit?: number; budgetMs?: number } = {}) {
  const started = Date.now();
  const budget = opts.budgetMs ?? 20_000;
  let done = 0;
  let failed = 0;
  while (Date.now() - started < budget) {
    const batch = await claimJobs(opts.limit ?? 10);
    if (!batch.length) break;
    for (const job of batch) {
      const log = logger.child({ jobId: job.id, jobType: job.type, attempt: job.attempts });
      const handler = handlers[job.type];
      try {
        if (!handler) throw new Error(`No handler for job type "${job.type}"`);
        await handler(job.payload);
        await completeJob(job.id);
        done++;
        log.info({ event: "job.done" }, "job done");
      } catch (err) {
        failed++;
        await failJob(job, err instanceof Error ? err.message : String(err), MAX_ATTEMPTS);
        log.error({ event: "job.failed", err }, "job failed");
      }
    }
    if (opts.limit && done + failed >= opts.limit) break;
  }
  return { done, failed };
}
