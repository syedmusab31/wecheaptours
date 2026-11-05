import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createPool } from "./pool";
import * as schema from "@/server/db/schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

// Reuse one pool across hot reloads and serverless invocations
const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };

export type Database = typeof db;
/** A transaction handle, as passed to `db.transaction(async (tx) => …)` */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Repositories accept either, so a service can run several of them in one transaction. */
export type Executor = Database | Transaction;
