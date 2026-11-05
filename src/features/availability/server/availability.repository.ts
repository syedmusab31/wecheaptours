import "server-only";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { availabilitySlots, bookingReservations } from "@/server/db/schema";

export type NewSlot = typeof availabilitySlots.$inferInsert;

export async function listSlots(productId: number, from: string, to: string) {
  return db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.productId, productId),
        gte(availabilitySlots.startsOn, from),
        lte(availabilitySlots.startsOn, to),
      ),
    )
    .orderBy(asc(availabilitySlots.startsOn), asc(availabilitySlots.startTime));
}

export async function productHasSlots(productId: number, exec: Executor = db) {
  const [row] = await exec
    .select({ id: availabilitySlots.id })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.productId, productId))
    .limit(1);
  return Boolean(row);
}

/** Locks the slots of these dates (ordered by id, so concurrent bookings never deadlock) */
export async function lockSlots(
  productId: number,
  dates: string[],
  startTime: string | null,
  exec: Executor,
) {
  return exec
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.productId, productId),
        inArray(availabilitySlots.startsOn, dates),
        startTime ? eq(availabilitySlots.startTime, startTime) : undefined,
      ),
    )
    .orderBy(asc(availabilitySlots.id))
    .for("update");
}

export async function addReserved(slotId: number, seats: number, exec: Executor) {
  await exec
    .update(availabilitySlots)
    .set({ reserved: sql`greatest(0, ${availabilitySlots.reserved} + ${seats})` })
    .where(eq(availabilitySlots.id, slotId));
}

export async function insertReservations(
  rows: { bookingId: number; slotId: number; seats: number }[],
  exec: Executor,
) {
  if (rows.length) await exec.insert(bookingReservations).values(rows);
}

export async function takeReservations(bookingId: number, exec: Executor) {
  return exec.delete(bookingReservations).where(eq(bookingReservations.bookingId, bookingId)).returning();
}

/** Creates or updates slots in bulk (same product, date and start time = same slot) */
export async function upsertSlots(rows: NewSlot[]) {
  if (!rows.length) return 0;
  const result = await db
    .insert(availabilitySlots)
    .values(rows)
    .onConflictDoUpdate({
      target: [availabilitySlots.productId, availabilitySlots.startsOn, availabilitySlots.startTime],
      set: {
        capacity: sql`excluded.capacity`,
        status: sql`excluded.status`,
        cutoffHours: sql`excluded.cutoff_hours`,
      },
    })
    .returning({ id: availabilitySlots.id });
  return result.length;
}

export async function setDayStatus(productId: number, date: string, status: "open" | "closed") {
  await db
    .update(availabilitySlots)
    .set({ status })
    .where(and(eq(availabilitySlots.productId, productId), eq(availabilitySlots.startsOn, date)));
}

/** Removes empty slots in a range (slots with reservations are kept) */
export async function deleteEmptySlots(productId: number, from: string, to: string) {
  const res = await db
    .delete(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.productId, productId),
        gte(availabilitySlots.startsOn, from),
        lte(availabilitySlots.startsOn, to),
        eq(availabilitySlots.reserved, 0),
      ),
    )
    .returning({ id: availabilitySlots.id });
  return res.length;
}
