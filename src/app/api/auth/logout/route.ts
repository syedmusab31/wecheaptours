import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearSessionCookieOptions } from "@/features/identity/server/session";
import { isSameOrigin } from "@/server/security/origin";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", clearSessionCookieOptions);
  return res;
}
