import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyCodeSchema } from "@/features/identity/identity.schema";
import { verifySignInCode } from "@/features/identity/server/auth.service";
import {
  CHALLENGE_COOKIE,
  SESSION_COOKIE,
  TRUSTED_DEVICE_COOKIE,
  clearSessionCookieOptions,
  sessionCookieOptions,
  trustedDeviceCookieOptions,
} from "@/features/identity/server/session";
import { firstError } from "@/lib/validation";
import { readJson, toErrorResponse } from "@/server/http";
import { isSameOrigin } from "@/server/security/origin";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

/** Step 2 of signing in: the 6-digit code from the email */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  try {
    await enforceRateLimit("otpVerify", clientIp(req.headers));
    const challengeId = (await cookies()).get(CHALLENGE_COOKIE)?.value;
    if (!challengeId || !/^[0-9a-f-]{36}$/.test(challengeId)) {
      return NextResponse.json({ error: "Sign in again to get a new code." }, { status: 401 });
    }
    const parsed = verifyCodeSchema.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });

    const { sessionToken, trustedDeviceToken } = await verifySignInCode({ challengeId, ...parsed.data });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);
    res.cookies.set(CHALLENGE_COOKIE, "", { ...clearSessionCookieOptions });
    if (trustedDeviceToken)
      res.cookies.set(TRUSTED_DEVICE_COOKIE, trustedDeviceToken, trustedDeviceCookieOptions);
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
