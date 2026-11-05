import "server-only";
import { db, type Transaction } from "./client";

/** Runs `fn` in one database transaction. Services use this; repositories take the `tx` handle. */
export function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

export type { Transaction };
