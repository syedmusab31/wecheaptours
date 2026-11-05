import type { Metadata } from "next";
import { GuestCancelForm } from "@/features/booking/components/GuestCancelForm";
import { getGuestBooking, guestCanCancel } from "@/features/booking/server/booking.service";
import { amountDue } from "@/features/payment/domain/payment-status";
import { formatCentsExact } from "@/lib/money";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CircleCheck, CircleX, Clock3 } from "lucide-react";
import { productHref } from "@/lib/routes";
import { cancellationText, paymentText } from "@/features/booking/domain/booking-policy";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";
import { nightsBetween } from "@/lib/dates";
import { getSettings } from "@/features/settings/server/settings.service";
import { formatDate } from "@/lib/utils";
import { env } from "@/config/env";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

type Props = {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ t?: string; paid?: string; payError?: string }>;
};

const STATUS = {
  pending: {
    icon: Clock3,
    title: "Request received",
    text: "We're checking availability and will confirm within 24 hours by email and WhatsApp.",
    tone: "bg-sun-tint text-ink",
  },
  confirmed: {
    icon: CircleCheck,
    title: "Confirmed",
    text: "You're all set. We'll message you the day before with pickup details.",
    tone: "bg-faience-tint text-faience",
  },
  completed: {
    icon: CircleCheck,
    title: "Completed",
    text: "Thanks for travelling with us.",
    tone: "bg-mist text-ink",
  },
  cancelled: {
    icon: CircleX,
    title: "Cancelled",
    text: "This booking is cancelled. Contact us if that's unexpected.",
    tone: "bg-danger-tint text-danger",
  },
  declined: {
    icon: CircleX,
    title: "Not available",
    text: "Sorry, we couldn't offer this trip on your date. Contact us and we'll suggest another.",
    tone: "bg-danger-tint text-danger",
  },
  expired: {
    icon: Ban,
    title: "Request expired",
    text: "This request wasn't confirmed before the date. Send a new one or contact us.",
    tone: "bg-mist text-ink",
  },
  no_show: {
    icon: Ban,
    title: "Missed",
    text: "We couldn't find you on the day. Contact us if something went wrong.",
    tone: "bg-mist text-ink",
  },
} as const satisfies Record<string, { icon: unknown; title: string; text: string; tone: string }>;

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Not paid yet",
  deposit_paid: "Deposit paid",
  paid: "Paid in full",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
};

export default async function BookingPage({ params, searchParams }: Props) {
  const { ref } = await params;
  const { t, paid, payError } = await searchParams;
  if (!t) notFound();
  const row = await getGuestBooking(ref, t);
  if (!row) notFound();
  const b = row.booking;
  const s = STATUS[b.status];
  // Online payment shows once we've confirmed and when Stripe is set up
  const due = b.status === "confirmed" && env.STRIPE_SECRET_KEY ? amountDue(b) : null;
  const { contact } = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <div className={`flex gap-4 rounded-2xl p-5 ${s.tone}`}>
        <s.icon size={28} className="shrink-0" aria-hidden />
        <div>
          <h1 className="text-xl font-bold">{s.title}</h1>
          <p className="text-ink-soft mt-1">{s.text}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display-md text-2xl sm:text-3xl">{b.productTitle}</h2>
        <p className="text-ink-mute">
          Reference <b className="text-ink tabular">{b.reference}</b>
        </p>
      </div>

      <dl className="border-line mt-6 grid gap-x-8 gap-y-4 rounded-2xl border p-5 sm:grid-cols-2">
        <div>
          <dt className="text-ink-mute text-sm">{CATEGORY_META[b.category].singular}</dt>
          <dd className="font-semibold">
            {row.productSlug ? (
              <Link
                href={productHref({ category: b.category, slug: row.productSlug })}
                className="hover:text-lapis"
              >
                {b.productTitle}
              </Link>
            ) : (
              b.productTitle
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-mute text-sm">{b.endDate ? "Dates" : "Date"}</dt>
          <dd className="font-semibold">
            {b.endDate
              ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)} · ${nightsBetween(b.travelDate, b.endDate)} nights`
              : formatDate(b.travelDate, true)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-mute text-sm">Guests</dt>
          <dd className="font-semibold">
            {b.adults} adult{b.adults > 1 ? "s" : ""}
            {b.children ? `, ${b.children} children` : ""}
            {b.infants ? `, ${b.infants} infants` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-ink-mute text-sm">Total</dt>
          <dd className="tabular font-semibold">
            {formatCentsExact(b.totalCents, b.currency)}
            {b.depositCents > 0 && (
              <span className="text-ink-mute font-normal">
                {" "}
                · deposit {formatCentsExact(b.depositCents, b.currency)}
              </span>
            )}
          </dd>
          <dd className="text-ink-soft text-sm">
            {PAYMENT_LABEL[b.paymentStatus]}
            {b.paidCents > 0 && b.paymentStatus !== "paid"
              ? ` (${formatCentsExact(b.paidCents, b.currency)} received)`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-ink-mute text-sm">Lead traveller</dt>
          <dd className="font-semibold">{b.customerName}</dd>
          <dd className="text-ink-soft text-sm">
            {b.customerEmail} · {b.customerPhone}
          </dd>
        </div>
        {b.pickupLocation && (
          <div>
            <dt className="text-ink-mute text-sm">Pickup</dt>
            <dd className="font-semibold">{b.pickupLocation}</dd>
          </div>
        )}
      </dl>

      {paid && (
        <p
          role="status"
          className="bg-faience-tint text-faience mt-6 rounded-lg px-4 py-3 text-sm font-medium"
        >
          Thank you. Your payment is being confirmed; this page updates within a minute.
        </p>
      )}
      {payError && (
        <p role="alert" className="bg-danger-tint text-danger mt-6 rounded-lg px-4 py-3 text-sm">
          {payError}
        </p>
      )}
      {due && (
        <a href={`/booking/${b.reference}/pay?t=${encodeURIComponent(t)}`} className="btn btn-primary mt-6">
          Pay {due.kind === "deposit" ? "the deposit" : "now"}:{" "}
          {formatCentsExact(due.amountCents, b.currency)}
        </a>
      )}

      <div className="text-ink-soft mt-6 space-y-2">
        <p>{paymentText(b.category)}</p>
        <p>{cancellationText(b.category)}</p>
      </div>

      <div className="bg-mist mt-8 rounded-2xl p-5">
        <p className="font-semibold">Need to change something?</p>
        <p className="text-ink-soft mt-1">
          Reply to your confirmation email
          {contact.whatsapp && (
            <>
              {" "}
              or{" "}
              <a
                className="text-lapis font-semibold hover:underline"
                href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hi, about my booking ${b.reference}`)}`}
                target="_blank"
                rel="noopener"
              >
                message us on WhatsApp
              </a>
            </>
          )}{" "}
          with your reference {b.reference}.
        </p>
      </div>
      {guestCanCancel(b) && (
        <div className="border-line mt-6 rounded-2xl border p-5">
          <p className="font-semibold">
            {b.status === "pending" ? "Changed your plans?" : "Free cancellation is still open"}
          </p>
          <p className="text-ink-soft mt-1 mb-3 text-sm">
            {b.status === "pending"
              ? "You can withdraw this request at no cost."
              : "You can cancel online at no cost until the free-cancellation window ends."}
          </p>
          <GuestCancelForm reference={b.reference} token={t} isRequest={b.status === "pending"} />
        </div>
      )}
      <p className="text-ink-mute mt-6 text-sm">Bookmark this page: it's your booking's private link.</p>
    </div>
  );
}
