import "dotenv/config";
import { Client } from "pg";

/**
 * Repeated local runs trip the per-IP rate limits (bookings, sign-ins) that protect production.
 * Clear them first, but only on a local database: never against a deployed one.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.E2E_BASE_URL) return;
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return;
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("delete from rate_limits");
  } finally {
    await db.end();
  }
}
