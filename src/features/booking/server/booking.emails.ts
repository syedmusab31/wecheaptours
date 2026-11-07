import "server-only";
import { createElement } from "react";
import { paymentLinkFor } from "@/features/payment/server/payment-link";
import { siteUrl } from "@/lib/routes";
import type { Booking } from "@/server/db/schema";
import { notifyAddress, sendEmail } from "@/server/email/mailer";
import {
  BookingAlertEmail,
  BookingReceivedEmail,
  BookingStatusEmail,
  CancelledAlertEmail,
  ReviewRequestEmail,
  STATUS_COPY,
  TripReminderEmail,
} from "../emails/templates";
import { bookingLink } from "./booking-access";

const common = (b: Booking) => ({ booking: b, bookingUrl: bookingLink(b), siteUrl: siteUrl() });
const adminUrl = (b: Booking) => siteUrl(`/admin/bookings/${b.id}`);

export async function sendBookingReceived(b: Booking) {
  await sendEmail({
    to: b.customerEmail,
    subject: `Booking request received · ${b.reference}`,
    react: createElement(BookingReceivedEmail, common(b)),
  });
  await sendEmail({
    to: notifyAddress(),
    subject: `New booking ${b.reference}: ${b.productTitle}`,
    react: createElement(BookingAlertEmail, { booking: b, adminUrl: adminUrl(b), siteUrl: siteUrl() }),
    replyTo: b.customerEmail,
  });
}

export async function sendBookingStatus(b: Booking) {
  const copy = STATUS_COPY[b.status];
  if (!copy) return;
  await sendEmail({
    to: b.customerEmail,
    subject: `${copy.subject} · ${b.reference}`,
    react: createElement(BookingStatusEmail, { ...common(b), pay: paymentLinkFor(b) }),
  });
  if (b.status === "cancelled") {
    await sendEmail({
      to: notifyAddress(),
      subject: `Cancelled: ${b.reference} · ${b.productTitle}`,
      react: createElement(CancelledAlertEmail, { booking: b, adminUrl: adminUrl(b), siteUrl: siteUrl() }),
    });
  }
}

export async function sendTripReminder(b: Booking) {
  await sendEmail({
    to: b.customerEmail,
    subject: `See you tomorrow · ${b.reference}`,
    react: createElement(TripReminderEmail, { ...common(b), pay: paymentLinkFor(b) }),
  });
}

export async function sendReviewRequest(b: Booking) {
  await sendEmail({
    to: b.customerEmail,
    subject: `How was ${b.productTitle}?`,
    react: createElement(ReviewRequestEmail, common(b)),
  });
}
