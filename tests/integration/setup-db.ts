/**
 * Global setup for integration tests: points the app at TEST_DATABASE_URL and creates the schema
 * from scratch (the test database is disposable). Tests are skipped when TEST_DATABASE_URL is not set.
 */
import { execSync } from "node:child_process";
import { Pool } from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  if (!/test/i.test(url))
    throw new Error("TEST_DATABASE_URL must point at a database whose name contains 'test'; it is wiped.");
  const pool = new Pool({ connectionString: url });
  await pool.query("drop schema if exists public cascade; create schema public;");
  await pool.end();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
