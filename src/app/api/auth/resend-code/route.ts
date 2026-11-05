import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resendSignInCode } from "@/features/identity/server/auth.service";
import { CHALLENGE_COOKIE, challengeCookieOptions } from "@/features/identity/server/session";
import { toErrorResponse } from "@/server/http";
import { isSameOrigin } from "@/server/security/origin";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

/** "Send a new code" on the code screen: at most 3 per 15 minutes */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  try {
    const challengeId = (await cookies()).get(CHALLENGE_COOKIE)?.value;
    if (!challengeId || !/^[0-9a-f-]{36}$/.test(challengeId)) {
      return NextResponse.json({ error: "Sign in again to get a new code." }, { status: 401 });
    }
    const ip = clientIp(req.headers);
    await enforceRateLimit("otpResend", ip, challengeId);
    const result = await resendSignInCode(challengeId, ip);
    if (result.status !== "code_sent") return NextResponse.json({ error: "Sign in again." }, { status: 401 });
    const res = NextResponse.json({ ok: true, sentTo: result.maskedEmail });
    res.cookies.set(CHALLENGE_COOKIE, result.challengeId, challengeCookieOptions);
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
