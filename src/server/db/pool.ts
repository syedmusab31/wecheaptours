import { Pool, type PoolConfig } from "pg";
import { env } from "@/config/env";

/**
 * The one place a Postgres pool is configured (app, migrations, seed).
 * TLS is verified for hosted databases. Neon, Supabase and RDS use publicly trusted
 * certificates; for a private CA, put its PEM in DATABASE_CA_CERT.
 */
export function createPool(url = env.DATABASE_URL, extra: PoolConfig = {}): Pool {
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url) || url.includes("sslmode=disable");
  const ca = env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: env.DATABASE_POOL_MAX,
    ...extra,
  });
}
