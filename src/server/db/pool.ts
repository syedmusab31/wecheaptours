import { Pool, type PoolConfig } from "pg";
import { databaseEnv } from "@/config/env";

/**
 * The one place a Postgres pool is configured (app, migrations, seed).
 * TLS is verified for hosted databases. Neon, Supabase and RDS use publicly trusted
 * certificates; for a private CA, put its PEM in DATABASE_CA_CERT.
 */
export function createPool(url?: string, extra: PoolConfig = {}): Pool {
  const db = databaseEnv(url ? { ...process.env, DATABASE_URL: url } : process.env);
  url = db.DATABASE_URL;
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url) || url.includes("sslmode=disable");
  const ca = db.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: db.DATABASE_POOL_MAX,
    ...extra,
  });
}
