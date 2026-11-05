import "server-only";
import { and, desc, eq, lt, or, isNull, sql } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { promoCodes } from "@/server/db/schema";

export type NewPromoCode = typeof promoCodes.$inferInsert;

export async function findByCode(code: string) {
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
  return row ?? null;
}

/**
 * Uses one redemption, atomically: fails (returns null) when the code ran out in the meantime.
 * Runs inside the booking transaction, so a failed booking gives the use back.
 */
export async function redeem(id: number, exec: Executor = db) {
  const [row] = await exec
    .update(promoCodes)
    .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
    .where(
      and(
        eq(promoCodes.id, id),
        eq(promoCodes.isActive, true),
        or(isNull(promoCodes.maxUses), lt(promoCodes.usedCount, promoCodes.maxUses)),
      ),
    )
    .returning();
  return row ?? null;
}

export async function listPromoCodes() {
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function insertPromoCode(values: NewPromoCode) {
  const [row] = await db.insert(promoCodes).values(values).onConflictDoNothing().returning();
  return row ?? null;
}

export async function setPromoActive(id: number, isActive: boolean) {
  await db.update(promoCodes).set({ isActive }).where(eq(promoCodes.id, id));
}
