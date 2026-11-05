import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/monitoring/scrub";

/** Error tracking on the server and in middleware. Off unless SENTRY_DSN is set. */
export async function register() {
  const dsn = process.env.SENTRY_DSN; // eslint-disable-line no-restricted-syntax -- read before env validation runs
  if (!dsn) return;
  Sentry.init({
    dsn,
    release: process.env.VERCEL_GIT_COMMIT_SHA, // eslint-disable-line no-restricted-syntax
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, // eslint-disable-line no-restricted-syntax
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

/** Reports errors thrown while rendering server components, route handlers and actions */
export const onRequestError = Sentry.captureRequestError;
