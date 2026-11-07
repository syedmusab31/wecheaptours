import { formatDate } from "@/lib/utils";
import type { Enquiry } from "@/server/db/schema";
import { Cta, Details, EmailLayout, P, Quote } from "@/server/email/components";

export const TOPIC_LABEL: Record<string, string> = {
  general: "General question",
  package: "Custom package",
  concierge: "Concierge request",
  event: "Event or celebration",
  product: "Question about a trip",
};

export const topicLabel = (topic: string) => TOPIC_LABEL[topic] ?? "Enquiry";

export function EnquiryReceivedEmail({ enquiry: e, siteUrl }: { enquiry: Enquiry; siteUrl: string }) {
  return (
    <EmailLayout preview="We'll reply within 24 hours." footer={`${topicLabel(e.topic)} · ${siteUrl}`}>
      <P>Hi {e.customerName.split(" ")[0]},</P>
      <P>
        Thanks for getting in touch. A member of our team will reply within 24 hours
        {e.customerPhone ? " by email or WhatsApp" : ""}.
      </P>
      <Quote>{e.message}</Quote>
    </EmailLayout>
  );
}

/** To the team */
export function EnquiryAlertEmail({
  enquiry: e,
  productTitle,
  adminUrl,
  siteUrl,
}: {
  enquiry: Enquiry;
  productTitle?: string;
  adminUrl: string;
  siteUrl: string;
}) {
  return (
    <EmailLayout preview={`${e.customerName}: ${e.message.slice(0, 80)}`} footer={siteUrl}>
      <Details
        rows={[
          ["Name", e.customerName],
          ["Email", e.customerEmail],
          ["Phone / WhatsApp", e.customerPhone || "—"],
          ["Topic", topicLabel(e.topic)],
          ["Trip", productTitle],
          ["Date", e.travelDate && formatDate(e.travelDate)],
          ["Guests", e.guests ? String(e.guests) : null],
          ["Budget", e.budget],
        ]}
      />
      <Quote>{e.message}</Quote>
      <Cta href={adminUrl}>Open in admin</Cta>
    </EmailLayout>
  );
}
