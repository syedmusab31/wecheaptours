import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./client";

/** Round-trip time to the database in ms, or null when it is unreachable */
export async function pingDatabase(): Promise<number | null> {
  const started = performance.now();
  try {
    await db.execute(sql`select 1`);
    return Math.round(performance.now() - started);
  } catch {
    return null;
  }
}
