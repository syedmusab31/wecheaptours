/**
 * One time, for a database that was created with `db:push` before migrations existed:
 * records the baseline migration as already applied, so `db:migrate` doesn't try to create
 * tables that are already there.
 *
 *   npm run db:upgrade      # only for databases from before the Phase 4 domain model
 *   npm run db:baseline
 *
 * It refuses when the database already has migration history, or has no tables at all
 * (a new database should simply run `npm run db:migrate`).
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createDirectPool } from "@/server/db/pool";

type Journal = { entries: { idx: number; when: number; tag: string }[] };

async function main() {
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as Journal;
  const baseline = journal.entries.find((e) => e.idx === 0);
  if (!baseline) throw new Error("drizzle/meta/_journal.json has no baseline migration.");
  // Same hash drizzle's migrator computes: sha256 of the migration file
  const hash = createHash("sha256")
    .update(readFileSync(`drizzle/${baseline.tag}.sql`, "utf8"))
    .digest("hex");

  const pool = createDirectPool();
  try {
    const { rows: tables } = await pool.query(
      "select 1 from pg_tables where schemaname = 'public' and tablename = 'products'",
    );
    if (!tables.length) throw new Error("This database is empty: run `npm run db:migrate` instead.");

    await pool.query("create schema if not exists drizzle");
    await pool.query(
      "create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)",
    );
    const { rows: history } = await pool.query("select count(*)::int as n from drizzle.__drizzle_migrations");
    if (history[0].n > 0) throw new Error("This database already has migration history; nothing to do.");

    await pool.query("create extension if not exists pg_trgm");
    await pool.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)", [
      hash,
      baseline.when,
    ]);
    console.log(`✓ Marked ${baseline.tag} as applied. From now on: npm run db:migrate`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
