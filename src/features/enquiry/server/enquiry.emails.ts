import "server-only";
import type { Enquiry } from "@/server/db/schema";
import { siteUrl } from "@/lib/routes";
import { formatDate } from "@/lib/utils";
import { esc, notifyAddress, row, sendMail } from "@/server/email/mailer";

export const TOPIC_LABEL: Record<string, string> = {
  general: "General question",
  package: "Custom package",
  concierge: "Concierge request",
  event: "Event or celebration",
  product: "Question about a trip",
};

export async function sendEnquiryReceived(e: Enquiry, productTitle?: string) {
  const topic = TOPIC_LABEL[e.topic] ?? "Enquiry";
  await sendMail(
    e.customerEmail,
    `We received your message · ${topic}`,
    `<p>Hi ${esc(e.customerName.split(" ")[0])},</p>
<p>Thanks for getting in touch. A member of our team will reply within 24 hours${e.customerPhone ? " by email or WhatsApp" : ""}.</p>
<p style="color:#5b6884;white-space:pre-line">${esc(e.message)}</p>`,
  );
  await sendMail(
    notifyAddress(),
    `New enquiry: ${topic}${productTitle ? ` · ${productTitle}` : ""}`,
    `<table cellpadding="0" cellspacing="0">${row("Name", e.customerName)}${row("Email", e.customerEmail)}${row("Phone / WhatsApp", e.customerPhone || "—")}${row("Topic", topic)}${productTitle ? row("Trip", productTitle) : ""}${e.travelDate ? row("Date", formatDate(e.travelDate)) : ""}${e.guests ? row("Guests", String(e.guests)) : ""}${e.budget ? row("Budget", e.budget) : ""}</table>
<p style="white-space:pre-line">${esc(e.message)}</p><p><a href="${siteUrl("/admin/enquiries")}">Open in admin</a></p>`,
    e.customerEmail,
  );
}
