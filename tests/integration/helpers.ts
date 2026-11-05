import { sql } from "drizzle-orm";
import { describe } from "vitest";

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/** `describe` that only runs when a test database is configured */
export const describeDb = hasTestDb ? describe : describe.skip;

/** Empties every application table (keeps the schema) */
export async function resetDatabase() {
  const { db } = await import("@/server/db/client");
  const tables = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public' and left(tablename, 2) <> '__'`,
  );
  if (!tables.rows.length) return;
  const list = sql.join(
    tables.rows.map((t) => sql.identifier(t.tablename)),
    sql`, `,
  );
  await db.execute(sql`truncate ${list} restart identity cascade`);
}
