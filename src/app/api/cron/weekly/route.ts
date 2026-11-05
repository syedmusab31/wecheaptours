import { NextResponse } from "next/server";
import { runWeekly } from "@/jobs/scheduled";
import { isAuthorizedCron } from "@/server/security/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Weekly: data retention and housekeeping */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runWeekly();
  return NextResponse.json({ ok: true, ...result });
}
