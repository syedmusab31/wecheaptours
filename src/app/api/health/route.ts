import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { pingDatabase } from "@/server/db/health";
import { oldestQueuedAgeSeconds } from "@/server/jobs/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Jobs waiting longer than this mean the cron worker has stopped */
const MAX_QUEUE_AGE_SECONDS = 10 * 60;

/** For the uptime monitor: 503 when the database is down or background jobs are stuck */
export async function GET() {
  const dbLatencyMs = await pingDatabase();
  const oldestJobAgeSeconds = dbLatencyMs === null ? null : await oldestQueuedAgeSeconds().catch(() => null);
  const jobsOk = oldestJobAgeSeconds !== null && oldestJobAgeSeconds <= MAX_QUEUE_AGE_SECONDS;
  const ok = dbLatencyMs !== null && jobsOk;
  return NextResponse.json(
    {
      ok,
      db: dbLatencyMs === null ? "down" : "up",
      dbLatencyMs,
      jobs: jobsOk ? "ok" : "stuck",
      oldestJobAgeSeconds,
      release: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
