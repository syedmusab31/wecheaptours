import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CircleCheck, Clock3, CircleX } from "lucide-react";
import { db } from "@/db";
import { bookings, products } from "@/db/schema";
import { productHref } from "@/components/site/ProductCard";
import { cancellationText, CATEGORY_META, nightsBetween, paymentText } from "@/lib/rules";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

type Props = { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> };

const STATUS = {
  pending: { icon: Clock3, title: "Request received", text: "We're checking availability and will confirm within 24 hours by email and WhatsApp.", tone: "bg-sun-tint text-ink" },
  confirmed: { icon: CircleCheck, title: "Confirmed", text: "You're all set. We'll message you the day before with pickup details.", tone: "bg-faience-tint text-faience" },
  completed: { icon: CircleCheck, title: "Completed", text: "Thanks for travelling with us.", tone: "bg-mist text-ink" },
  cancelled: { icon: CircleX, title: "Cancelled", text: "This booking is cancelled. Contact us if that's unexpected.", tone: "bg-danger-tint text-danger" },
} as const;

export default async function BookingPage({ params, searchParams }: Props) {
  const { ref } = await params;
  const { t } = await searchParams;
  if (!t) notFound();
  const [row] = await db
    .select({ b: bookings, slug: products.slug })
    .from(bookings)
    .leftJoin(products, eq(bookings.productId, products.id))
    .where(and(eq(bookings.reference, ref.toUpperCase()), eq(bookings.accessToken, t)));
  if (!row) notFound();
  const b = row.b;
  const s = STATUS[b.status];
  const { contact } = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <div className={`flex gap-4 rounded-2xl p-5 ${s.tone}`}>
        <s.icon size={28} className="shrink-0" aria-hidden />
        <div>
          <h1 className="text-xl font-bold">{s.title}</h1>
          <p className="mt-1 text-ink-soft">{s.text}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display-md text-2xl sm:text-3xl">{b.productTitle}</h2>
        <p className="text-ink-mute">
          Reference <b className="text-ink tabular">{b.reference}</b>
        </p>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-4 rounded-2xl border border-line p-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-mute">{CATEGORY_META[b.category].singular}</dt>
          <dd className="font-semibold">
            {row.slug ? (
              <Link href={productHref({ category: b.category, slug: row.slug })} className="hover:text-lapis">
                {b.productTitle}
              </Link>
            ) : (
              b.productTitle
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">{b.endDate ? "Dates" : "Date"}</dt>
          <dd className="font-semibold">
            {b.endDate ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)} · ${nightsBetween(b.travelDate, b.endDate)} nights` : formatDate(b.travelDate, true)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">Guests</dt>
          <dd className="font-semibold">
            {b.adults} adult{b.adults > 1 ? "s" : ""}
            {b.children ? `, ${b.children} children` : ""}
            {b.infants ? `, ${b.infants} infants` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">Total</dt>
          <dd className="font-semibold tabular">
            US${Number(b.total).toFixed(2)}
            {Number(b.deposit) > 0 && <span className="font-normal text-ink-mute"> · deposit US${Number(b.deposit).toFixed(2)}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">Lead traveller</dt>
          <dd className="font-semibold">{b.customerName}</dd>
          <dd className="text-sm text-ink-soft">
            {b.email} · {b.phone}
          </dd>
        </div>
        {b.pickupLocation && (
          <div>
            <dt className="text-sm text-ink-mute">Pickup</dt>
            <dd className="font-semibold">{b.pickupLocation}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 space-y-2 text-ink-soft">
        <p>{paymentText(b.category)}</p>
        <p>{cancellationText(b.category)}</p>
      </div>

      <div className="mt-8 rounded-2xl bg-mist p-5">
        <p className="font-semibold">Need to change something?</p>
        <p className="mt-1 text-ink-soft">
          Reply to your confirmation email
          {contact.whatsapp && (
            <>
              {" "}
              or{" "}
              <a
                className="font-semibold text-lapis hover:underline"
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
      <p className="mt-6 text-sm text-ink-mute">Bookmark this page: it's your booking's private link.</p>
    </div>
  );
}
