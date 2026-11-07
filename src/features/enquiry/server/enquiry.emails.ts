import "server-only";
import { createElement } from "react";
import { siteUrl } from "@/lib/routes";
import type { Enquiry } from "@/server/db/schema";
import { notifyAddress, sendEmail } from "@/server/email/mailer";
import { EnquiryAlertEmail, EnquiryReceivedEmail, topicLabel } from "../emails/templates";

export async function sendEnquiryReceived(e: Enquiry, productTitle?: string) {
  const topic = topicLabel(e.topic);
  await sendEmail({
    to: e.customerEmail,
    subject: `We received your message · ${topic}`,
    react: createElement(EnquiryReceivedEmail, { enquiry: e, siteUrl: siteUrl() }),
  });
  await sendEmail({
    to: notifyAddress(),
    subject: `New enquiry: ${topic}${productTitle ? ` · ${productTitle}` : ""}`,
    react: createElement(EnquiryAlertEmail, {
      enquiry: e,
      productTitle,
      adminUrl: siteUrl("/admin/enquiries"),
      siteUrl: siteUrl(),
    }),
    replyTo: e.customerEmail,
  });
}
