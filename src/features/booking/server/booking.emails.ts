import "server-only";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";
import { cancellationText, paymentText } from "@/features/booking/domain/booking-policy";
import { amountDue } from "@/features/payment/domain/payment-status";
import { formatCentsExact } from "@/lib/money";
import { siteUrl } from "@/lib/routes";
import { formatDate } from "@/lib/utils";
import type { Booking } from "@/server/db/schema";
import { button, esc, notifyAddress, row, sendMail } from "@/server/email/mailer";
import { bookingAccessToken, bookingLink } from "./booking-access";
import { env } from "@/config/env";

const firstName = (b: Booking) => esc(b.customerName.split(" ")[0]);
const money = (b: Booking, cents: number) => formatCentsExact(cents, b.currency);

function bookingTable(b: Booking) {
  const guests = [
    `${b.adults} adult${b.adults > 1 ? "s" : ""}`,
    b.children ? `${b.children} children` : "",
    b.infants ? `${b.infants} infants` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0">
${row("Reference", b.reference)}
${row(CATEGORY_META[b.category].singular, b.optionName ? `${b.productTitle} · ${b.optionName}` : b.productTitle)}
${row(b.endDate ? "Dates" : "Date", b.endDate ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)}` : formatDate(b.travelDate, true))}
${row("Guests", guests)}
${b.addons.length ? row("Extras", b.addons.map((a) => a.name).join(", ")) : ""}
${b.discountCents > 0 ? row(`Promo ${b.promoCode}`, `−${money(b, b.discountCents)}`) : ""}
${row("Total", money(b, b.totalCents))}
${b.depositCents > 0 ? row("Deposit at confirmation", money(b, b.depositCents)) : ""}
${b.pickupLocation ? row("Pickup", b.pickupLocation) : ""}
</table>`;
}

/** Link to pay online, when Stripe is configured and something is due */
function payButton(b: Booking) {
  const due = amountDue(b);
  if (!env.STRIPE_SECRET_KEY || !due || b.status !== "confirmed") return "";
  const href = siteUrl(`/booking/${b.reference}/pay?t=${bookingAccessToken(b.reference)}`);
  return button(href, `Pay ${due.kind === "deposit" ? "the deposit" : "now"}: ${money(b, due.amountCents)}`);
}

export async function sendBookingReceived(b: Booking) {
  await sendMail(
    b.customerEmail,
    `Booking request received · ${b.reference}`,
    `<p>Hi ${firstName(b)},</p>
<p>Thanks for booking with WeCheapTours. We have your request and will confirm availability <b>within 24 hours</b>, usually much sooner.</p>
${bookingTable(b)}
<p style="color:#5b6884">${esc(paymentText(b.category))}<br>${esc(cancellationText(b.category))}</p>
${button(bookingLink(b), "View your booking")}`,
  );
  await sendMail(
    notifyAddress(),
    `New booking ${b.reference}: ${b.productTitle}`,
    `<p>New booking request.</p>${bookingTable(b)}
<table cellpadding="0" cellspacing="0">${row("Name", b.customerName)}${row("Email", b.customerEmail)}${row("Phone / WhatsApp", b.customerPhone)}${row("Country", b.customerCountry)}</table>
${b.notes ? `<p><b>Notes:</b> ${esc(b.notes)}</p>` : ""}
<p><a href="${siteUrl(`/admin/bookings/${b.id}`)}">Open in admin</a></p>`,
    b.customerEmail,
  );
}

const STATUS_COPY: Partial<Record<Booking["status"], { subject: string; text: string }>> = {
  confirmed: {
    subject: "Your booking is confirmed",
    text: "Good news: your booking is confirmed. We'll message you on WhatsApp the day before with pickup details.",
  },
  declined: {
    subject: "We can't confirm your booking",
    text: "Sorry, we can't offer this trip on your date. Reply to this email and we'll suggest another date or a similar trip.",
  },
  cancelled: {
    subject: "Your booking has been cancelled",
    text: "Your booking has been cancelled. If you didn't ask for this or want to pick another date, reply to this email.",
  },
  completed: {
    subject: "Thanks for travelling with us",
    text: "We hope you had a great time. Reply to this email to tell us how it went; it helps other travellers.",
  },
};

export async function sendBookingStatus(b: Booking) {
  const copy = STATUS_COPY[b.status];
  if (!copy) return;
  await sendMail(
    b.customerEmail,
    `${copy.subject} · ${b.reference}`,
    `<p>Hi ${firstName(b)},</p><p>${esc(copy.text)}</p>${bookingTable(b)}
${b.status === "confirmed" ? `<p style="color:#5b6884">${esc(paymentText(b.category))}</p>${payButton(b)}` : ""}
<p><a href="${bookingLink(b)}" style="color:#2340b0">View your booking</a></p>`,
  );
  if (b.status === "cancelled") {
    await sendMail(
      notifyAddress(),
      `Cancelled: ${b.reference} · ${b.productTitle}`,
      `${bookingTable(b)}<p><a href="${siteUrl(`/admin/bookings/${b.id}`)}">Open in admin</a></p>`,
    );
  }
}

export async function sendTripReminder(b: Booking) {
  await sendMail(
    b.customerEmail,
    `See you tomorrow · ${b.reference}`,
    `<p>Hi ${firstName(b)},</p><p>A quick reminder that your trip is tomorrow.${b.pickupLocation ? ` Pickup: <b>${esc(b.pickupLocation)}</b>.` : ""} Your guide will message you on WhatsApp with the exact time.</p>
${bookingTable(b)}${payButton(b)}`,
  );
}

export async function sendReviewRequest(b: Booking) {
  await sendMail(
    b.customerEmail,
    `How was ${b.productTitle}?`,
    `<p>Hi ${firstName(b)},</p><p>Thanks again for travelling with us. Could you reply with two or three lines about your day? With your permission we'll share it with other travellers.</p>`,
  );
}
