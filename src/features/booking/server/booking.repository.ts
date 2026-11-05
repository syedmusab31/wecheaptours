import "server-only";
import { and, asc, count, desc, eq, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { bookingEvents, bookings, products, type Booking, type BookingStatus } from "@/server/db/schema";

export type NewBooking = typeof bookings.$inferInsert;
export type NewBookingEvent = typeof bookingEvents.$inferInsert;

export async function insertBooking(values: NewBooking, exec: Executor = db): Promise<Booking> {
  const [row] = await exec.insert(bookings).values(values).returning();
  return row;
}

export async function findByReference(reference: string) {
  const [row] = await db
    .select({ booking: bookings, productSlug: products.slug })
    .from(bookings)
    .leftJoin(products, eq(bookings.productId, products.id))
    .where(eq(bookings.reference, reference));
  return row ?? null;
}

export async function findByReferenceAndEmail(reference: string, email: string) {
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.reference, reference), eq(bookings.customerEmail, email)));
  return row ?? null;
}

export async function getBookingById(id: number, exec: Executor = db, opts: { forUpdate?: boolean } = {}) {
  const query = exec.select().from(bookings).where(eq(bookings.id, id));
  const [row] = opts.forUpdate ? await query.for("update") : await query;
  return row ?? null;
}

export async function updateBooking(id: number, values: Partial<NewBooking>, exec: Executor = db) {
  const [row] = await exec.update(bookings).set(values).where(eq(bookings.id, id)).returning();
  return row ?? null;
}

export async function countForProduct(productId: number, exec: Executor = db) {
  const [row] = await exec.select({ n: count() }).from(bookings).where(eq(bookings.productId, productId));
  return row?.n ?? 0;
}

// ── Admin lists ─────────────────────────────────────────────────────────

export async function listForAdmin(filters: { status?: BookingStatus; q?: string }, limit = 200) {
  const where: SQL[] = [];
  if (filters.status) where.push(eq(bookings.status, filters.status));
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_\\]/g, "")}%`;
    where.push(
      or(
        ilike(bookings.reference, like),
        ilike(bookings.customerName, like),
        ilike(bookings.customerEmail, like),
        ilike(bookings.productTitle, like),
      )!,
    );
  }
  return db
    .select()
    .from(bookings)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(limit);
}

export async function listRecent(limit = 8) {
  return db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(limit);
}

export async function listUpcomingConfirmed(limit = 6) {
  return db
    .select()
    .from(bookings)
    .where(sql`${bookings.status} = 'confirmed' and ${bookings.travelDate} >= current_date`)
    .orderBy(bookings.travelDate)
    .limit(limit);
}

export async function countPending() {
  const [row] = await db.select({ n: count() }).from(bookings).where(eq(bookings.status, "pending"));
  return row?.n ?? 0;
}

export async function listForExport() {
  return db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

// ── History ─────────────────────────────────────────────────────────────

export async function insertEvent(values: NewBookingEvent, exec: Executor = db) {
  await exec.insert(bookingEvents).values(values);
}

export async function listEvents(bookingId: number) {
  return db
    .select()
    .from(bookingEvents)
    .where(eq(bookingEvents.bookingId, bookingId))
    .orderBy(asc(bookingEvents.createdAt), asc(bookingEvents.id));
}

/** Pending requests whose travel date has passed (for the nightly expiry job) */
export async function listStalePending(today: string, limit = 500) {
  return db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.status, "pending"), lt(bookings.travelDate, today)))
    .limit(limit);
}

/** Confirmed trips on a date (for reminders) */
export async function listConfirmedOn(date: string) {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), eq(bookings.travelDate, date)));
}
