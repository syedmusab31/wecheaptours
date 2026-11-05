import { NextResponse } from "next/server";
import { loginSchema } from "@/features/identity/identity.schema";
import { login } from "@/features/identity/server/auth.service";
import { SESSION_COOKIE, sessionCookieOptions } from "@/features/identity/server/session";
import { readJson, toErrorResponse } from "@/server/http";
import { isSameOrigin } from "@/server/security/origin";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  try {
    const body = await readJson(req);
    const parsed = loginSchema.safeParse(body);
    const email = parsed.success ? parsed.data.email : "";
    await enforceRateLimit("login", clientIp(req.headers), email);
    if (!parsed.success)
      return NextResponse.json({ error: "Enter your email and password." }, { status: 422 });

    const token = await login(parsed.data.email, parsed.data.password);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
