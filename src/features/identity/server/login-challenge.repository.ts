import "server-only";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { loginChallenges } from "@/server/db/schema";

export type NewLoginChallenge = typeof loginChallenges.$inferInsert;

/** Creates a challenge and cancels the admin's earlier unused ones, so only the newest code works */
export async function replaceChallenge(values: NewLoginChallenge, exec: Executor = db) {
  await exec
    .update(loginChallenges)
    .set({ consumedAt: sql`now()` })
    .where(and(eq(loginChallenges.adminId, values.adminId), isNull(loginChallenges.consumedAt)));
  const [row] = await exec.insert(loginChallenges).values(values).returning();
  return row;
}

export async function lockChallenge(id: string, exec: Executor) {
  const [row] = await exec.select().from(loginChallenges).where(eq(loginChallenges.id, id)).for("update");
  return row ?? null;
}

export async function findChallenge(id: string) {
  const [row] = await db.select().from(loginChallenges).where(eq(loginChallenges.id, id));
  return row ?? null;
}

export async function updateChallenge(id: string, values: Partial<NewLoginChallenge>, exec: Executor = db) {
  await exec.update(loginChallenges).set(values).where(eq(loginChallenges.id, id));
}

/** Housekeeping: challenges are useless an hour after they expire */
export async function pruneChallenges() {
  const res = await db
    .delete(loginChallenges)
    .where(
      or(
        lt(loginChallenges.expiresAt, sql`now() - interval '1 hour'`),
        lt(loginChallenges.consumedAt, sql`now() - interval '1 day'`),
      ),
    );
  return res.rowCount ?? 0;
}
