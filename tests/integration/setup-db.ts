/**
 * Global setup for integration tests: points the app at TEST_DATABASE_URL and builds the schema
 * from scratch by running the migrations, so tests also prove the migrations work.
 * Tests are skipped when TEST_DATABASE_URL is not set.
 */
import { execSync } from "node:child_process";
import { Pool } from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  if (!/test/i.test(url))
    throw new Error("TEST_DATABASE_URL must point at a database whose name contains 'test'; it is wiped.");
  const pool = new Pool({ connectionString: url });
  await pool.query(
    "drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;",
  );
  await pool.end();
  execSync("npx tsx src/server/db/migrate.ts", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
