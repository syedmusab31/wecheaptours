import { describe, expect, it } from "vitest";
import { directDatabaseUrl, isPooledUrl } from "./direct-url";

describe("directDatabaseUrl", () => {
  it("drops -pooler from a Neon host and keeps everything else", () => {
    const pooled =
      "postgresql://user:pw@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
    expect(directDatabaseUrl(pooled)).toBe(
      "postgresql://user:pw@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(isPooledUrl(pooled)).toBe(true);
  });
  it("leaves direct and local URLs alone", () => {
    const local = "postgres://postgres:postgres@localhost:5432/wecheaptours";
    expect(directDatabaseUrl(local)).toBe(local);
    expect(isPooledUrl(local)).toBe(false);
  });
});
