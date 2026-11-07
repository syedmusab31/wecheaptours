/**
 * Every environment variable the server reads, validated once with Zod.
 * `next.config.ts` calls `validateEnv()`, so a missing or short secret fails `next build` / `next dev`
 * with a clear message instead of breaking the first request. Edge-safe (no Node APIs).
 *
 * Browser code reads NEXT_PUBLIC_* directly (Next.js inlines them at build time); everything else
 * goes through `env`. ESLint enforces this.
 */
import { z } from "zod";

const optional = z.string().trim().min(1).optional().catch(undefined);
const flag = z
  .enum(["on", "off", "true", "false"])
  .optional()
  .transform((v) => v === "on" || v === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z.string().url("DATABASE_URL must be a postgres:// URL"),
    DATABASE_CA_CERT: optional,
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),

    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)"),
    BOOKING_LINK_SECRET: z.string().min(32).optional(),
    CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters").optional(),
    ADMIN_EMAIL: optional,

    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    EMAIL_FROM: z.string().default("WeCheapTours <bookings@wecheaptours.com>"),
    NOTIFY_EMAIL: optional,

    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: optional,
    CLOUDINARY_API_KEY: optional,
    CLOUDINARY_API_SECRET: optional,
    CLOUDINARY_FOLDER: z.string().default("wecheaptours"),
    /** Signed upload preset with a size limit and allowed formats (set up in Cloudinary → Settings → Upload) */
    CLOUDINARY_UPLOAD_PRESET: optional,

    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    /** Paymob (Egypt): cards, wallets, installments in EGP */
    PAYMOB_SECRET_KEY: optional,
    PAYMOB_PUBLIC_KEY: optional,
    PAYMOB_HMAC_SECRET: optional,
    /** Comma-separated integration ids from the Paymob dashboard (card, wallet…) */
    PAYMOB_INTEGRATION_IDS: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    PAYMOB_CURRENCY: z.string().length(3).default("EGP"),
    PAYMOB_API_URL: z.string().url().default("https://accept.paymob.com"),
    /** Which provider new checkouts use when both are configured */
    PAYMENT_PROVIDER: z.enum(["stripe", "paymob"]).optional(),

    TURNSTILE_SECRET_KEY: optional,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional,

    SENTRY_DSN: z.string().url().optional().catch(undefined),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().catch(undefined),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    LOG_FORMAT: z.enum(["json", "pretty"]).optional(),
    CSP_REPORT_ONLY: flag,
    FX_SYNC: flag,
    FX_RATES_URL: z.string().url().optional().catch(undefined),
    RETENTION_YEARS: z.coerce.number().int().min(1).max(20).default(3),
    VERCEL_GIT_COMMIT_SHA: optional,
  })
  .superRefine((e, ctx) => {
    if (e.SMTP_HOST && (!e.SMTP_USER || !e.SMTP_PASSWORD)) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_USER"],
        message: "SMTP_HOST is set, so SMTP_USER and SMTP_PASSWORD are needed too",
      });
    }
    if (Boolean(e.STRIPE_SECRET_KEY) !== Boolean(e.STRIPE_WEBHOOK_SECRET)) {
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_WEBHOOK_SECRET"],
        message: "Set both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, or neither",
      });
    }
    const paymob = [e.PAYMOB_SECRET_KEY, e.PAYMOB_PUBLIC_KEY, e.PAYMOB_HMAC_SECRET].filter(Boolean).length;
    if (paymob > 0 && (paymob < 3 || !e.PAYMOB_INTEGRATION_IDS.length)) {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMOB_SECRET_KEY"],
        message:
          "Paymob needs PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_HMAC_SECRET and PAYMOB_INTEGRATION_IDS together",
      });
    }
    if (e.STRIPE_SECRET_KEY && paymob === 3 && !e.PAYMENT_PROVIDER) {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_PROVIDER"],
        message:
          "Both Stripe and Paymob are set: choose one for checkouts with PAYMENT_PROVIDER=stripe|paymob",
      });
    }
    if (e.NODE_ENV === "production" && !e.SMTP_HOST) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message:
          "SMTP_HOST is required in production: admins sign in with an emailed code (for local testing run `npm run mail:dev`)",
      });
    }
    if (e.NODE_ENV === "production" && !e.CRON_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message: "CRON_SECRET is required in production (Vercel Cron uses it)",
      });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parses process.env, throwing one readable error that lists every problem */
export function validateEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${lines.join("\n")}\nSee .env.example.`);
  }
  return parsed.data;
}

/** Validated environment, parsed on first use */
export const env: Env = new Proxy({} as Env, {
  get(_, key: string) {
    cached ??= validateEnv();
    return cached[key as keyof Env];
  },
});

/** Tests change process.env between cases; this drops the cached copy. */
export function resetEnvCache() {
  cached = undefined;
}

const databaseSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a postgres:// URL"),
  DATABASE_CA_CERT: optional,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
});

/**
 * Only the database settings. Migrations, the seed and admin scripts use this, so they run
 * without the app's other secrets (SMTP, cron, auth).
 */
export function databaseEnv(source: Record<string, string | undefined> = process.env) {
  const parsed = databaseSchema.safeParse(source);
  if (!parsed.success)
    throw new Error(`Invalid database settings: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  return parsed.data;
}
