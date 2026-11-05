import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/site/CheckoutForm";
import { productHref } from "@/components/site/ProductCard";
import { formatMoney } from "@/lib/currency";
import { getProductBySlug } from "@/lib/queries";
import { cancellationText, nightsBetween, paymentText, quote } from "@/lib/rules";
import { getMoneyContext } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your booking request", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const money = await getMoneyContext();

  const input = {
    travelDate: sp.date ?? "",
    endDate: sp.end ?? null,
    adults: Number(sp.a ?? 1),
    children: Number(sp.c ?? 0),
    infants: Number(sp.i ?? 0),
  };
  const q = quote({
    category: p.category,
    priceUnit: p.priceUnit,
    price: Number(p.price),
    minGuests: p.minGuests,
    maxGuests: p.maxGuests,
    minNights: p.minNights,
    ...input,
  });

  if (!q.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="display-md text-3xl">Let's pick that again</h1>
        <p className="mt-3 text-ink-soft">{q.error}</p>
        <Link href={productHref(p) + "#book"} className="btn btn-primary mt-6">
          Back to {p.title}
        </Link>
      </div>
    );
  }

  const fmt = (usd: number) => formatMoney(usd, money.currency, money.rates, { decimals: true });
  const guests = [`${input.adults} adult${input.adults > 1 ? "s" : ""}`, input.children ? `${input.children} child${input.children > 1 ? "ren" : ""}` : "", input.infants ? `${input.infants} infant${input.infants > 1 ? "s" : ""}` : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Link href={productHref(p)} className="text-sm font-semibold text-lapis hover:underline">
        Back to trip
      </Link>
      <h1 className="display-md mt-3 text-3xl sm:text-4xl">Your booking request</h1>
      <p className="mt-2 text-ink-soft">Your details, then we check availability and confirm by email and WhatsApp.</p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Your details" className="order-2 lg:order-1">
          <CheckoutForm
            booking={{ productId: p.id, ...input, endDate: input.endDate ?? undefined }}
            needsPickup={p.pickupIncluded && p.category !== "stay"}
            pickupLabel={p.category === "transfer" ? "Pickup address or flight number" : "Hotel or pickup address"}
          />
        </section>

        <aside aria-label="Summary" className="order-1 lg:order-2">
          <div className="rounded-2xl border border-line">
            <div className="flex gap-4 p-4">
              <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-mist">
                {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="96px" className="object-cover" />}
              </span>
              <div>
                <p className="font-bold leading-snug">{p.title}</p>
                <p className="mt-1 text-sm text-ink-mute">{p.durationLabel}</p>
              </div>
            </div>
            <dl className="space-y-2 border-t border-line p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">{input.endDate ? "Dates" : "Date"}</dt>
                <dd className="text-right font-semibold">
                  {input.endDate
                    ? `${formatDate(input.travelDate)} – ${formatDate(input.endDate)} (${nightsBetween(input.travelDate, input.endDate)} nights)`
                    : formatDate(input.travelDate, true)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Guests</dt>
                <dd className="font-semibold">{guests}</dd>
              </div>
            </dl>
            <dl className="space-y-1.5 border-t border-line p-4 text-sm">
              {q.lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-3 text-ink-soft">
                  <dt>{l.label.replace(/\$([\d.]+)/g, (_, n) => fmt(Number(n)))}</dt>
                  <dd className="tabular">{l.amount === 0 ? "Free" : fmt(l.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 pt-2 text-lg font-bold">
                <dt>Total</dt>
                <dd className="tabular">{fmt(q.total)}</dd>
              </div>
              {money.currency !== "USD" && (
                <p className="text-xs text-ink-mute">Charged in US dollars: {formatMoney(q.total, "USD", money.rates, { decimals: true })}.</p>
              )}
              {q.deposit > 0 && <p className="text-xs text-ink-mute">Deposit at confirmation: {fmt(q.deposit)}.</p>}
            </dl>
            <div className="space-y-2 border-t border-line bg-mist/60 p-4 text-sm text-ink-soft">
              <p>{paymentText(p.category)}</p>
              <p>{cancellationText(p.category)}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
