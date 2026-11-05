import { NextResponse } from "next/server";
import { AppError, RateLimitError } from "./errors";

/** JSON error response for an expected failure; rethrows anything unexpected. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    const res = NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof RateLimitError) res.headers.set("Retry-After", String(err.retryAfterSeconds));
    return res;
  }
  throw err;
}

/** Reads a JSON body; an invalid body becomes `{}` so the schema reports the problem. */
export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => ({}));
}
