import "server-only";
import pino, { type DestinationStream, type Logger } from "pino";
import { env } from "@/config/env";

/**
 * Structured logging. JSON lines in production (ship them with a Vercel log drain to Axiom or
 * Better Stack); readable output in development. Guest personal data is redacted.
 */
const REDACT = [
  "email",
  "*.email",
  "customerEmail",
  "*.customerEmail",
  "phone",
  "*.phone",
  "customerPhone",
  "*.customerPhone",
  "password",
  "*.password",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "authorization",
  "*.authorization",
  "headers.cookie",
];

function devStream(): DestinationStream | undefined {
  if (process.env.NODE_ENV === "production" || env.LOG_FORMAT === "json") return undefined;
  try {
    // Optional dev dependency; falls back to JSON when missing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pretty = require("pino-pretty") as (opts: object) => DestinationStream;
    return pretty({ colorize: true, sync: true, ignore: "pid,hostname" });
  } catch {
    return undefined;
  }
}

const globalForLogger = globalThis as unknown as { logger?: Logger };

export const logger: Logger =
  globalForLogger.logger ??
  pino(
    {
      level: env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info"),
      redact: { paths: REDACT, censor: "[redacted]" },
      base: { service: "wecheaptours", release: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    devStream(),
  );
if (process.env.NODE_ENV !== "production") globalForLogger.logger = logger;

/** Logger bound to the current request's id (set by middleware), for route handlers and actions */
export async function requestLogger(bindings: Record<string, unknown> = {}): Promise<Logger> {
  try {
    const { headers } = await import("next/headers");
    const requestId = (await headers()).get("x-request-id") ?? undefined;
    return logger.child({ requestId, ...bindings });
  } catch {
    return logger.child(bindings);
  }
}
