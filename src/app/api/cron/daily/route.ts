import { NextResponse } from "next/server";
import { jobHandlers } from "@/jobs/handlers";
import { runDaily } from "@/jobs/scheduled";
import { runJobs } from "@/server/jobs/worker";
import { isAuthorizedCron } from "@/server/security/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily: expire stale requests, queue tomorrow's reminders, refresh exchange rates */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = { ...(await runDaily()), jobs: await runJobs(jobHandlers) };
  return NextResponse.json({ ok: true, ...result });
}
