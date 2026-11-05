import "server-only";
import { and, asc, eq, inArray, lt, lte, or, sql } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { jobs, type Job } from "@/server/db/schema";

export type EnqueueOptions = { runAt?: Date; dedupeKey?: string };

/**
 * Queues a job. Pass the transaction of the business write (the outbox pattern): the job is saved
 * together with the booking, or not at all. With a `dedupeKey`, a second identical job is skipped.
 */
export async function enqueue(
  exec: Executor,
  type: string,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {},
) {
  await exec
    .insert(jobs)
    .values({ type, payload, runAt: opts.runAt ?? new Date(), dedupeKey: opts.dedupeKey ?? null })
    .onConflictDoNothing({ target: jobs.dedupeKey });
}

/** Locked longer than this = the worker died; the job is picked up again */
const STALE_LOCK_MINUTES = 10;

/** Claims up to `limit` due jobs. SKIP LOCKED lets several workers run without taking the same job. */
export async function claimJobs(limit: number): Promise<Job[]> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        or(
          and(eq(jobs.status, "queued"), lte(jobs.runAt, sql`now()`)),
          and(
            eq(jobs.status, "running"),
            lt(jobs.lockedAt, sql`now() - make_interval(mins => ${STALE_LOCK_MINUTES})`),
          ),
        ),
      )
      .orderBy(asc(jobs.runAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (!due.length) return [];
    return tx
      .update(jobs)
      .set({ status: "running", lockedAt: sql`now()`, attempts: sql`${jobs.attempts} + 1` })
      .where(
        inArray(
          jobs.id,
          due.map((j) => j.id),
        ),
      )
      .returning();
  });
}

export async function completeJob(id: number) {
  await db
    .update(jobs)
    .set({ status: "done", finishedAt: new Date(), lockedAt: null, lastError: null })
    .where(eq(jobs.id, id));
}

/** Retries with exponential backoff (1, 4, 9, 16 minutes…) until `maxAttempts`, then marks it failed */
export async function failJob(job: Job, error: string, maxAttempts: number) {
  const final = job.attempts >= maxAttempts;
  await db
    .update(jobs)
    .set({
      status: final ? "failed" : "queued",
      lastError: error.slice(0, 2000),
      lockedAt: null,
      runAt: final ? job.runAt : new Date(Date.now() + job.attempts ** 2 * 60_000),
      finishedAt: final ? new Date() : null,
    })
    .where(eq(jobs.id, job.id));
}

/** Age in seconds of the oldest job still waiting (for the health check) */
export async function oldestQueuedAgeSeconds(): Promise<number> {
  const [row] = await db
    .select({ age: sql<number | null>`extract(epoch from now() - min(${jobs.runAt}))::int` })
    .from(jobs)
    .where(and(eq(jobs.status, "queued"), lte(jobs.runAt, sql`now()`)));
  return Math.max(0, row?.age ?? 0);
}

export async function pruneFinishedJobs(olderThanDays = 30) {
  const res = await db.execute(
    sql`delete from ${jobs} where ${jobs.status} = 'done' and ${jobs.finishedAt} < now() - make_interval(days => ${olderThanDays})`,
  );
  return res.rowCount ?? 0;
}
