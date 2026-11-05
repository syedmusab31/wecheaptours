import "server-only";
import { ValidationError } from "@/server/errors";
import { env } from "@/config/env";

/**
 * Verifies a Cloudflare Turnstile token. Turned off (always passes) unless TURNSTILE_SECRET_KEY is set,
 * so local development and tests need no keys.
 */
export async function verifyTurnstile(token: unknown, ip: string): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (typeof token !== "string" || !token) throw new ValidationError("Please complete the human check.");
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { success?: boolean } | null;
  if (!data?.success) throw new ValidationError("The human check failed. Please try again.");
}
