"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { adminFormAction } from "@/features/identity/server/admin-action";
import { jobHandlers } from "@/jobs/handlers";
import type { ActionState } from "@/lib/action-state";
import { firstError, formToObject } from "@/lib/validation";
import { AppError, RateLimitError } from "@/server/errors";
import { runJobs } from "@/server/jobs/worker";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";
import { guestBookingActionSchema, lookupBookingSchema, updateBookingStatusSchema } from "../booking.schema";
import { cancelByGuest, findGuestBookingLink, updateBookingStatus } from "./booking.service";

/** Sends queued emails right after the response instead of waiting for the next cron run */
const flushJobs = () =>
  after(() => runJobs(jobHandlers, { limit: 10, budgetMs: 15_000 }).then(() => undefined));

export const updateBooking = adminFormAction(
  "booking:update",
  updateBookingStatusSchema,
  async (input, { admin }) => {
    const { booking, notified } = await updateBookingStatus({ ...input, adminId: admin.id });
    if (notified) flushJobs();
    revalidatePath("/admin", "layout");
    return { ok: true, message: notified ? `Saved. ${booking.customerName} will be emailed.` : "Saved." };
  },
);

/** Guest "Find my booking" form */
export async function findBooking(formData: FormData) {
  try {
    await enforceRateLimit("bookingLookup", clientIp(await headers()));
  } catch (err) {
    if (err instanceof RateLimitError) redirect("/my-booking?limited=1");
    throw err;
  }
  const parsed = lookupBookingSchema.safeParse(formToObject(formData));
  const link = parsed.success ? await findGuestBookingLink(parsed.data.reference, parsed.data.email) : null;
  redirect(link ?? "/my-booking?notfound=1");
}

/** Guest cancels from their booking page (the token in their link proves access) */
export async function cancelMyBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = guestBookingActionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  try {
    await cancelByGuest(parsed.data.reference, parsed.data.token);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    throw err;
  }
  flushJobs();
  revalidatePath(`/booking/${parsed.data.reference}`);
  return { ok: true, message: "Your booking is cancelled. We've emailed you a confirmation." };
}
