/**
 * CSRF guard for cookie-authenticated POSTs: the browser's Origin must be this site.
 * Requests with no Origin header (server-to-server, curl) are allowed; browsers always send one on POST.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
