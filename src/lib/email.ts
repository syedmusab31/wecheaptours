import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Booking, Enquiry } from "@/db/schema";
import { CATEGORY_META, cancellationText, paymentText } from "./rules";
import { formatDate, siteUrl } from "./utils";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

const FROM = () => process.env.EMAIL_FROM || "WeCheapTours <bookings@wecheaptours.com>";
const NOTIFY = () => process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "";

/** Sends an email. Never throws: a mail failure must not lose a booking. */
export async function sendMail(to: string, subject: string, html: string, replyTo?: string) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return;
  }
  try {
    await t.sendMail({ from: FROM(), to, subject, html: layout(subject, html), replyTo });
  } catch (err) {
    console.error("[email] failed to send", subject, err);
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#eef3fa;font-family:Arial,Helvetica,sans-serif;color:#13213c">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#2340b0;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">wecheaptours</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f6f8fc;color:#5b6884;font-size:12px">${esc(title)} · ${esc(siteUrl())}</td></tr>
</table></td></tr></table></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#5b6884;width:150px">${esc(label)}</td><td style="padding:6px 0"><b>${esc(value)}</b></td></tr>`;
}

function bookingTable(b: Booking) {
  const guests = [`${b.adults} adult${b.adults > 1 ? "s" : ""}`, b.children ? `${b.children} children` : "", b.infants ? `${b.infants} infants` : ""]
    .filter(Boolean)
    .join(", ");
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0">
${row("Reference", b.reference)}
${row(CATEGORY_META[b.category].singular, b.productTitle)}
${row(b.endDate ? "Dates" : "Date", b.endDate ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)}` : formatDate(b.travelDate, true))}
${row("Guests", guests)}
${row("Total", `US$${Number(b.total).toFixed(2)}`)}
${Number(b.deposit) > 0 ? row("Deposit at confirmation", `US$${Number(b.deposit).toFixed(2)}`) : ""}
${b.pickupLocation ? row("Pickup", b.pickupLocation) : ""}
</table>`;
}

export function bookingLink(b: Pick<Booking, "reference" | "accessToken">) {
  return siteUrl(`/booking/${b.reference}?t=${b.accessToken}`);
}

export async function sendBookingReceived(b: Booking) {
  const link = bookingLink(b);
  await sendMail(
    b.email,
    `Booking request received · ${b.reference}`,
    `<p>Hi ${esc(b.customerName.split(" ")[0])},</p>
<p>Thanks for booking with WeCheapTours. We have your request and will confirm availability <b>within 24 hours</b>, usually much sooner.</p>
${bookingTable(b)}
<p style="color:#5b6884">${esc(paymentText(b.category))}<br>${esc(cancellationText(b.category))}</p>
<p><a href="${link}" style="display:inline-block;background:#2340b0;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">View your booking</a></p>`,
  );
  await sendMail(
    NOTIFY(),
    `New booking ${b.reference}: ${b.productTitle}`,
    `<p>New booking request.</p>${bookingTable(b)}
<table cellpadding="0" cellspacing="0">${row("Name", b.customerName)}${row("Email", b.email)}${row("Phone / WhatsApp", b.phone)}${row("Country", b.country)}</table>
${b.notes ? `<p><b>Notes:</b> ${esc(b.notes)}</p>` : ""}
<p><a href="${siteUrl(`/admin/bookings/${b.id}`)}">Open in admin</a></p>`,
    b.email,
  );
}

const STATUS_COPY: Record<string, { subject: string; text: string }> = {
  confirmed: {
    subject: "Your booking is confirmed",
    text: "Good news: your booking is confirmed. We'll message you on WhatsApp the day before with pickup details.",
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
    b.email,
    `${copy.subject} · ${b.reference}`,
    `<p>Hi ${esc(b.customerName.split(" ")[0])},</p><p>${esc(copy.text)}</p>${bookingTable(b)}
${b.status === "confirmed" ? `<p style="color:#5b6884">${esc(paymentText(b.category))}</p>` : ""}
<p><a href="${bookingLink(b)}" style="color:#2340b0">View your booking</a></p>`,
  );
}

const TOPIC_LABEL: Record<string, string> = {
  general: "General question",
  package: "Custom package",
  concierge: "Concierge request",
  event: "Event or celebration",
  product: "Question about a trip",
};

export async function sendEnquiryReceived(e: Enquiry, productTitle?: string) {
  const topic = TOPIC_LABEL[e.topic] ?? "Enquiry";
  await sendMail(
    e.email,
    `We received your message · ${topic}`,
    `<p>Hi ${esc(e.name.split(" ")[0])},</p>
<p>Thanks for getting in touch. A member of our team will reply within 24 hours${e.phone ? " by email or WhatsApp" : ""}.</p>
<p style="color:#5b6884;white-space:pre-line">${esc(e.message)}</p>`,
  );
  await sendMail(
    NOTIFY(),
    `New enquiry: ${topic}${productTitle ? ` · ${productTitle}` : ""}`,
    `<table cellpadding="0" cellspacing="0">${row("Name", e.name)}${row("Email", e.email)}${row("Phone / WhatsApp", e.phone || "—")}${row("Topic", topic)}${productTitle ? row("Trip", productTitle) : ""}${e.travelDate ? row("Date", formatDate(e.travelDate)) : ""}${e.guests ? row("Guests", String(e.guests)) : ""}${e.budget ? row("Budget", e.budget) : ""}</table>
<p style="white-space:pre-line">${esc(e.message)}</p><p><a href="${siteUrl("/admin/enquiries")}">Open in admin</a></p>`,
    e.email,
  );
}
