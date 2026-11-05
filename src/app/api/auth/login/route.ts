import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema } from "@/features/identity/identity.schema";
import { beginSignIn } from "@/features/identity/server/auth.service";
import {
  CHALLENGE_COOKIE,
  SESSION_COOKIE,
  TRUSTED_DEVICE_COOKIE,
  challengeCookieOptions,
  sessionCookieOptions,
} from "@/features/identity/server/session";
import { readJson, toErrorResponse } from "@/server/http";
import { isSameOrigin } from "@/server/security/origin";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

/** Step 1 of signing in: email + password. Emails a code unless this device is remembered. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  try {
    const ip = clientIp(req.headers);
    const parsed = loginSchema.safeParse(await readJson(req));
    await enforceRateLimit("login", ip, parsed.success ? parsed.data.email : "");
    if (!parsed.success)
      return NextResponse.json({ error: "Enter your email and password." }, { status: 422 });

    const result = await beginSignIn({
      ...parsed.data,
      ip,
      trustedDevice: (await cookies()).get(TRUSTED_DEVICE_COOKIE)?.value,
    });
    if (result.status === "signed_in") {
      const res = NextResponse.json({ ok: true, step: "done" });
      res.cookies.set(SESSION_COOKIE, result.sessionToken, sessionCookieOptions);
      return res;
    }
    const res = NextResponse.json({ ok: true, step: "code", sentTo: result.maskedEmail });
    res.cookies.set(CHALLENGE_COOKIE, result.challengeId, challengeCookieOptions);
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
