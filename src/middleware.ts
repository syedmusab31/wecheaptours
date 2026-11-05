import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  shouldRefresh,
  signSession,
  verifySession,
} from "@/features/identity/server/session";
import { buildCsp, makeNonce } from "@/server/security/csp";
import { env } from "@/config/env";

/**
 * Runs on every page and API request:
 * - a request ID and a per-request CSP nonce
 * - the admin gate (signature only; the database check for revoked sessions runs in requireAdmin)
 * - sliding renewal of admin sessions
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const nonce = makeNonce();
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV !== "production" });
  const cspHeader = env.CSP_REPORT_ONLY ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

  const finish = (res: NextResponse) => {
    res.headers.set(cspHeader, csp);
    res.headers.set("x-request-id", requestId);
    // The guest booking URL carries its access token: never leak it in Referer.
    if (pathname.startsWith("/booking/")) res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  };

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const session =
    isAdminPage || isAdminApi ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value) : null;

  if (isAdminApi && !session) return finish(NextResponse.json({ error: "Not signed in" }, { status: 401 }));
  if (isAdminPage) {
    const isLogin = pathname === "/admin/login";
    if (!session && !isLogin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return finish(NextResponse.redirect(url));
    }
    if (session && isLogin) return finish(NextResponse.redirect(new URL("/admin", req.url)));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (session && shouldRefresh(session)) {
    const { iat: _iat, ...claims } = session;
    res.cookies.set(SESSION_COOKIE, await signSession(claims), sessionCookieOptions);
  }
  return finish(res);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      // Prefetches don't render HTML, so they need no nonce
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
