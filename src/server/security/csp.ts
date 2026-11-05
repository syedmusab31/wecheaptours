import { env } from "@/config/env";
/**
 * Content-Security-Policy, built per request with a nonce (edge-safe).
 * Next.js reads the nonce from the request's CSP header and adds it to its own scripts.
 */
export function buildCsp(nonce: string, opts: { dev: boolean }): string {
  const turnstile = "https://challenges.cloudflare.com";
  const sentry = sentryOrigin();
  const posthog = posthogOrigin();
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets nonce'd Next.js chunks load further chunks; dev needs eval for fast refresh.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      turnstile,
      ...(opts.dev ? ["'unsafe-eval'"] : []),
    ],
    // React and Tailwind set inline style attributes
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://api.cloudinary.com",
      turnstile,
      ...(sentry ? [sentry] : []),
      ...(posthog ? [posthog] : []),
      ...(opts.dev ? ["ws:"] : []),
    ],
    "frame-src": [turnstile],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(opts.dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(" "))
    .join("; ");
}

function sentryOrigin(): string {
  try {
    return env.NEXT_PUBLIC_SENTRY_DSN ? new URL(env.NEXT_PUBLIC_SENTRY_DSN).origin : "";
  } catch {
    return "";
  }
}

/** Where funnel events are sent (src/lib/analytics.ts), only when a PostHog key is set */
function posthogOrigin(): string {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return "";
  try {
    return new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").origin;
  } catch {
    return "";
  }
}

export function makeNonce(): string {
  return btoa(crypto.randomUUID());
}
