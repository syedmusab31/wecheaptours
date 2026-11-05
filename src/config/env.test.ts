import { describe, expect, it } from "vitest";
import { validateEnv } from "./env";

const base = { DATABASE_URL: "postgres://u:p@localhost/db", AUTH_SECRET: "x".repeat(32) };

describe("validateEnv", () => {
  it("accepts the minimum and fills defaults", () => {
    expect(validateEnv(base)).toMatchObject({ SMTP_PORT: 587, RETENTION_YEARS: 3, FX_SYNC: false });
  });
  it("reports a short AUTH_SECRET and a missing database", () => {
    expect(() => validateEnv({ AUTH_SECRET: "short" })).toThrow(
      /DATABASE_URL[\s\S]*AUTH_SECRET must be at least 32/,
    );
  });
  it("requires SMTP credentials with an SMTP host, and Stripe keys in pairs", () => {
    expect(() => validateEnv({ ...base, SMTP_HOST: "smtp.x.com" })).toThrow(/SMTP_USER/);
    expect(() => validateEnv({ ...base, STRIPE_SECRET_KEY: "sk_test" })).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
  it("requires CRON_SECRET and SMTP in production", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(/CRON_SECRET/);
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(
      /SMTP_HOST is required in production/,
    );
  });
});
