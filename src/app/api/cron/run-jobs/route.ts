import { NextResponse } from "next/server";
import { jobHandlers } from "@/jobs/handlers";
import { runJobs } from "@/server/jobs/worker";
import { isAuthorizedCron } from "@/server/security/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every minute: sends queued emails and other background work, with retries */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runJobs(jobHandlers, { budgetMs: 50_000 });
  return NextResponse.json({ ok: true, ...result });
}
