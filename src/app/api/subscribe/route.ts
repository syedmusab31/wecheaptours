import { NextResponse } from "next/server";
import { subscribeSchema } from "@/features/newsletter/newsletter.schema";
import { subscribe } from "@/features/newsletter/server/newsletter.service";
import { firstError } from "@/lib/validation";
import { readJson, toErrorResponse } from "@/server/http";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await enforceRateLimit("subscribe", clientIp(req.headers));
    const parsed = subscribeSchema.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
    await subscribe(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
