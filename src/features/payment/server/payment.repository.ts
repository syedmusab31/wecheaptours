import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { payments } from "@/server/db/schema";

export type NewPayment = typeof payments.$inferInsert;

/** Inserts the payment unless this provider reference was already recorded (replayed webhook). */
export async function insertPaymentOnce(values: NewPayment, exec: Executor = db) {
  const [row] = await exec
    .insert(payments)
    .values(values)
    .onConflictDoNothing({ target: payments.providerRef })
    .returning();
  return row ?? null;
}

export async function listForBooking(bookingId: number, exec: Executor = db) {
  return exec
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(asc(payments.createdAt));
}
