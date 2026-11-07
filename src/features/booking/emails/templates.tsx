/** Booking emails (React Email). Props are plain values so the templates can be previewed and tested. */
import { CATEGORY_META } from "@/features/catalog/catalog.constants";
import { cancellationText, paymentText } from "@/features/booking/domain/booking-policy";
import { describeGuests } from "@/features/booking/domain/guests";
import { formatCentsExact } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { Booking } from "@/server/db/schema";
import { Cta, Details, Divider, EmailLayout, P } from "@/server/email/components";

type Props = { booking: Booking; bookingUrl: string; siteUrl: string };

const firstName = (b: Booking) => b.customerName.split(" ")[0];
const money = (b: Booking, cents: number) => formatCentsExact(cents, b.currency);
const footer = (b: Booking, siteUrl: string) => `Booking ${b.reference} · ${siteUrl}`;

export function BookingDetails({ booking: b }: { booking: Booking }) {
  return (
    <Details
      rows={[
        ["Reference", b.reference],
        [
          CATEGORY_META[b.category].singular,
          b.optionName ? `${b.productTitle} · ${b.optionName}` : b.productTitle,
        ],
        [
          b.endDate ? "Dates" : "Date",
          b.endDate
            ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)}`
            : formatDate(b.travelDate, true),
        ],
        ["Guests", describeGuests(b)],
        ["Extras", b.addons.map((a) => a.name).join(", ")],
        [`Promo ${b.promoCode}`, b.discountCents > 0 && `−${money(b, b.discountCents)}`],
        ["Total", money(b, b.totalCents)],
        ["Deposit at confirmation", b.depositCents > 0 && money(b, b.depositCents)],
        ["Pickup", b.pickupLocation],
      ]}
    />
  );
}

export function BookingReceivedEmail({ booking: b, bookingUrl, siteUrl }: Props) {
  return (
    <EmailLayout
      preview={`We have your request for ${b.productTitle}. We'll confirm within 24 hours.`}
      footer={footer(b, siteUrl)}
    >
      <P>Hi {firstName(b)},</P>
      <P>
        Thanks for booking with WeCheapTours. We have your request and will confirm availability{" "}
        <b>within 24 hours</b>, usually much sooner.
      </P>
      <BookingDetails booking={b} />
      <P muted>{paymentText(b.category)}</P>
      <P muted>{cancellationText(b.category)}</P>
      <Cta href={bookingUrl}>View your booking</Cta>
    </EmailLayout>
  );
}

/** To the team: a new request to confirm */
export function BookingAlertEmail({
  booking: b,
  adminUrl,
  siteUrl,
}: {
  booking: Booking;
  adminUrl: string;
  siteUrl: string;
}) {
  return (
    <EmailLayout
      preview={`${b.customerName} · ${formatDate(b.travelDate)} · ${money(b, b.totalCents)}`}
      footer={footer(b, siteUrl)}
    >
      <P>New booking request.</P>
      <BookingDetails booking={b} />
      <Divider />
      <Details
        rows={[
          ["Name", b.customerName],
          ["Email", b.customerEmail],
          ["Phone / WhatsApp", b.customerPhone],
          ["Country", b.customerCountry],
          ["Notes", b.notes],
        ]}
      />
      <Cta href={adminUrl}>Open in admin</Cta>
    </EmailLayout>
  );
}

export const STATUS_COPY: Partial<Record<Booking["status"], { subject: string; text: string }>> = {
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

export function BookingStatusEmail({
  booking: b,
  bookingUrl,
  siteUrl,
  pay,
}: Props & { pay?: { url: string; label: string } | null }) {
  const copy = STATUS_COPY[b.status];
  return (
    <EmailLayout preview={copy?.subject ?? `Update on ${b.reference}`} footer={footer(b, siteUrl)}>
      <P>Hi {firstName(b)},</P>
      <P>{copy?.text}</P>
      <BookingDetails booking={b} />
      {b.status === "confirmed" && <P muted>{paymentText(b.category)}</P>}
      {pay && <Cta href={pay.url}>{pay.label}</Cta>}
      <P>
        <a href={bookingUrl} style={{ color: "#2340b0" }}>
          View your booking
        </a>
      </P>
    </EmailLayout>
  );
}

/** To the team: a guest (or staff member) cancelled */
export function CancelledAlertEmail({
  booking: b,
  adminUrl,
  siteUrl,
}: {
  booking: Booking;
  adminUrl: string;
  siteUrl: string;
}) {
  return (
    <EmailLayout preview={`${b.reference} was cancelled`} footer={footer(b, siteUrl)}>
      <P>This booking was cancelled{b.paidCents > 0 ? " and has payments to refund" : ""}.</P>
      <BookingDetails booking={b} />
      <Cta href={adminUrl}>Open in admin</Cta>
    </EmailLayout>
  );
}

export function TripReminderEmail({
  booking: b,
  siteUrl,
  pay,
}: Props & { pay?: { url: string; label: string } | null }) {
  return (
    <EmailLayout preview="Your trip is tomorrow" footer={footer(b, siteUrl)}>
      <P>Hi {firstName(b)},</P>
      <P>
        A quick reminder that your trip is tomorrow.
        {b.pickupLocation ? (
          <>
            {" "}
            Pickup: <b>{b.pickupLocation}</b>.
          </>
        ) : null}{" "}
        Your guide will message you on WhatsApp with the exact time.
      </P>
      <BookingDetails booking={b} />
      {pay && <Cta href={pay.url}>{pay.label}</Cta>}
    </EmailLayout>
  );
}

export function ReviewRequestEmail({ booking: b, siteUrl }: Props) {
  return (
    <EmailLayout preview={`How was ${b.productTitle}?`} footer={footer(b, siteUrl)}>
      <P>Hi {firstName(b)},</P>
      <P>
        Thanks again for travelling with us. Could you reply with two or three lines about your day? With your
        permission we&apos;ll share it with other travellers.
      </P>
    </EmailLayout>
  );
}
