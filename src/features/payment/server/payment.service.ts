import "server-only";
import { randomUUID } from "node:crypto";
import { getGuestBooking } from "@/features/booking/server/booking.service";
import { bookingAccessToken } from "@/features/booking/server/booking-access";
import { getBookingById, updateBooking } from "@/features/booking/server/booking.repository";
import { siteUrl } from "@/lib/routes";
import type { PaymentKind } from "@/server/db/schema";
import { withTransaction } from "@/server/db/transaction";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { amountDue, summarisePayments } from "../domain/payment-status";
import type { PaymentEvent } from "../payment.types";
import * as paymentRepository from "./payment.repository";
import { checkoutProvider, providerByName } from "./providers";
import { getSettings } from "@/features/settings/server/settings.service";

export { providerByName } from "./providers";

/** Records a payment (or refund) once and recalculates what the booking has paid */
export async function recordPayment(event: PaymentEvent) {
  return withTransaction(async (tx) => {
    const booking = await getBookingById(event.bookingId, tx, { forUpdate: true });
    if (!booking) throw new NotFoundError(`Booking ${event.bookingId} not found`);
    const inserted = await paymentRepository.insertPaymentOnce(
      {
        bookingId: booking.id,
        provider: event.provider,
        providerRef: event.providerRef,
        kind: event.kind,
        amountCents: event.amountCents,
        currency: event.currency,
        status: event.status,
        raw: event.raw as object,
      },
      tx,
    );
    if (!inserted) return { duplicate: true as const, booking };
    const summary = summarisePayments(booking, await paymentRepository.listForBooking(booking.id, tx));
    const updated = await updateBooking(booking.id, summary, tx);
    logger.info(
      {
        event: "payment.recorded",
        reference: booking.reference,
        kind: event.kind,
        amountCents: event.amountCents,
        provider: event.provider,
      },
      "payment recorded",
    );
    return { duplicate: false as const, booking: updated! };
  });
}

/** Guest "Pay deposit" link: opens a checkout for whatever is due next */
export async function startGuestCheckout(reference: string, token: string): Promise<string> {
  const provider = checkoutProvider();
  if (!provider)
    throw new ValidationError("Online payment isn't available. We'll send payment details by email.");
  const row = await getGuestBooking(reference, token);
  if (!row) throw new NotFoundError("Booking not found");
  const booking = row.booking;
  if (booking.status !== "confirmed")
    throw new ValidationError("You can pay once we've confirmed your booking.");
  const due = amountDue(booking);
  if (!due) throw new ValidationError("This booking is already paid.");
  const back = siteUrl(`/booking/${booking.reference}?t=${bookingAccessToken(booking.reference)}`);
  const { url } = await provider.createCheckout({
    booking,
    amountCents: due.amountCents,
    kind: due.kind,
    successUrl: `${back}&paid=1`,
    cancelUrl: back,
    rates: (await getSettings()).rates,
  });
  return url;
}

/** Admin: a payment taken outside the site (cash on the day, bank transfer) or a refund paid back by hand */
export async function recordManualPayment(input: {
  bookingId: number;
  kind: PaymentKind;
  amountCents: number;
  adminId: number;
  note: string;
}) {
  return recordPayment({
    provider: "manual",
    providerRef: `manual-${randomUUID()}`,
    bookingId: input.bookingId,
    kind: input.kind,
    amountCents: input.amountCents,
    currency: "USD",
    status: "succeeded",
    raw: { adminId: input.adminId, note: input.note },
  });
}

/** Admin: refunds through the provider when the money came in online, otherwise records a manual refund */
export async function refund(input: {
  bookingId: number;
  amountCents: number;
  adminId: number;
  note: string;
}) {
  const records = await paymentRepository.listForBooking(input.bookingId);
  const online = records
    .filter((r) => r.provider !== "manual" && r.kind !== "refund" && r.status === "succeeded")
    .at(-1);
  // Refund through the provider that took the money
  const provider = online ? providerByName(online.provider) : null;
  if (online && provider) {
    const { refundRef } = await provider.refund({ payment: online, amountCents: input.amountCents });
    return recordPayment({
      provider: provider.name,
      providerRef: refundRef,
      bookingId: input.bookingId,
      kind: "refund",
      amountCents: input.amountCents,
      currency: online.currency,
      status: "succeeded",
      raw: { adminId: input.adminId, note: input.note, paymentRef: online.providerRef },
    });
  }
  return recordManualPayment({ ...input, kind: "refund" });
}

export { listForBooking as listPayments } from "./payment.repository";
