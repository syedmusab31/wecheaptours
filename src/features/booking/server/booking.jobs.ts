import "server-only";
import { addDays } from "@/lib/dates";
import type { Executor } from "@/server/db/client";
import { enqueue } from "@/server/jobs/queue";
import { withTransaction } from "@/server/db/transaction";
import type { JobHandlers } from "@/server/jobs/worker";
import {
  sendBookingReceived,
  sendBookingStatus,
  sendReviewRequest,
  sendTripReminder,
} from "./booking.emails";
import * as bookingRepository from "./booking.repository";

export type BookingEmailJob = "booking.received" | "booking.status";

/** Queues a booking email in the caller's transaction (sent by the job worker, retried on failure) */
export async function enqueueBookingEmail(exec: Executor, type: BookingEmailJob, bookingId: number) {
  await enqueue(exec, type, { bookingId });
}

/** One reminder per booking, the day before travel */
export async function enqueueReminders(tomorrow: string): Promise<number> {
  const trips = await bookingRepository.listConfirmedOn(tomorrow);
  await withTransaction(async (tx) => {
    for (const b of trips)
      await enqueue(tx, "booking.reminder", { bookingId: b.id }, { dedupeKey: `reminder:${b.id}` });
  });
  return trips.length;
}

export async function enqueueReviewRequest(exec: Executor, bookingId: number) {
  await enqueue(
    exec,
    "booking.review_request",
    { bookingId },
    {
      runAt: new Date(Date.now() + 24 * 3_600_000),
      dedupeKey: `review-request:${bookingId}`,
    },
  );
}

async function load(payload: Record<string, unknown>) {
  const booking = await bookingRepository.getBookingById(Number(payload.bookingId));
  if (!booking) throw new Error(`Booking ${String(payload.bookingId)} not found`);
  return booking;
}

export const bookingJobHandlers: JobHandlers = {
  "booking.received": async (p) => sendBookingReceived(await load(p)),
  "booking.status": async (p) => sendBookingStatus(await load(p)),
  "booking.reminder": async (p) => {
    const b = await load(p);
    // Still on, and still tomorrow? (It may have been cancelled or moved since it was queued.)
    if (b.status === "confirmed" && b.travelDate >= addDays(new Date().toISOString().slice(0, 10), 0))
      await sendTripReminder(b);
  },
  "booking.review_request": async (p) => {
    const b = await load(p);
    if (b.status === "completed") await sendReviewRequest(b);
  },
};
