import { eq, sql } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import { describeDb, resetDatabase } from "./helpers";

describeDb("job worker", () => {
  beforeEach(resetDatabase);

  it("retries a failed job later and finishes it once the handler succeeds", async () => {
    const { db } = await import("@/server/db/client");
    const { jobs } = await import("@/server/db/schema");
    const { enqueue } = await import("@/server/jobs/queue");
    const { runJobs } = await import("@/server/jobs/worker");

    await enqueue(db, "test.flaky", { n: 1 });
    let calls = 0;
    const handlers = {
      "test.flaky": async () => {
        calls++;
        if (calls === 1) throw new Error("SMTP timeout");
      },
    };

    expect(await runJobs(handlers)).toEqual({ done: 0, failed: 1 });
    const [afterFailure] = await db.select().from(jobs);
    expect(afterFailure).toMatchObject({ status: "queued", attempts: 1, lastError: "SMTP timeout" });
    expect(afterFailure.runAt.getTime()).toBeGreaterThan(Date.now());

    // Make it due again and rerun
    await db
      .update(jobs)
      .set({ runAt: sql`now() - interval '1 second'` })
      .where(eq(jobs.id, afterFailure.id));
    expect(await runJobs(handlers)).toEqual({ done: 1, failed: 0 });
    const [done] = await db.select().from(jobs);
    expect(done).toMatchObject({ status: "done", attempts: 2, lastError: null });
  });

  it("skips a second job with the same dedupe key and fails unknown job types", async () => {
    const { db } = await import("@/server/db/client");
    const { jobs } = await import("@/server/db/schema");
    const { enqueue } = await import("@/server/jobs/queue");
    const { runJobs } = await import("@/server/jobs/worker");
    await enqueue(db, "nobody.handles.this", {}, { dedupeKey: "once" });
    await enqueue(db, "nobody.handles.this", {}, { dedupeKey: "once" });
    expect(await db.select().from(jobs)).toHaveLength(1);
    expect(await runJobs({})).toEqual({ done: 0, failed: 1 });
  });
});
