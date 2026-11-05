import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  return new Pool({
    connectionString: url,
    // Hosted Postgres (Neon, Supabase, RDS…) requires TLS
    ssl: isLocal || url.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
    max: 5,
  });
}

// Reuse one pool across hot reloads and serverless invocations
const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
