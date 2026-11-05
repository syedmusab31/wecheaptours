import "server-only";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";

export type NewAdminUser = typeof adminUsers.$inferInsert;

export async function findByEmail(email: string) {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  return row ?? null;
}

export async function findById(id: number) {
  if (!Number.isInteger(id)) return null;
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
  return row ?? null;
}

export async function listAdmins() {
  return db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.id));
}

/** Returns null when the email is already taken */
export async function insertAdmin(values: NewAdminUser) {
  const [row] = await db.insert(adminUsers).values(values).onConflictDoNothing().returning();
  return row ?? null;
}

export async function updateAdmin(id: number, values: Partial<NewAdminUser>) {
  const [row] = await db.update(adminUsers).set(values).where(eq(adminUsers.id, id)).returning();
  return row ?? null;
}

/** Invalidates every existing session of this user */
export async function bumpSessionVersion(id: number, values: Partial<NewAdminUser> = {}) {
  const [row] = await db
    .update(adminUsers)
    .set({ ...values, sessionVersion: sql`${adminUsers.sessionVersion} + 1` })
    .where(eq(adminUsers.id, id))
    .returning();
  return row ?? null;
}

/** Active owners other than `exceptId` */
export async function countOtherActiveOwners(exceptId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(adminUsers)
    .where(and(eq(adminUsers.role, "owner"), eq(adminUsers.isActive, true), ne(adminUsers.id, exceptId)));
  return row?.n ?? 0;
}
