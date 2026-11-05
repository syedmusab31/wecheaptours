import { timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is refused. */
export function isAuthorizedCron(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
