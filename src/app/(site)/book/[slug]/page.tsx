import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/features/booking/components/CheckoutForm";
import { cancellationText, paymentText } from "@/features/booking/domain/booking-policy";
import { priceSelection } from "@/features/booking/server/booking.service";
import { getProductBySlug } from "@/features/catalog/server/catalog.service";
import { getMoneyContext } from "@/features/settings/server/settings.service";
import { nightsBetween } from "@/lib/dates";
import { formatCents, formatMoney } from "@/lib/money";
import { productHref } from "@/lib/routes";
import { formatDate } from "@/lib/utils";
import { AppError } from "@/server/errors";
import { TrackOnView } from "@/components/analytics/TrackOnView";

export const metadata: Metadata = { title: "Your booking request", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const money = await getMoneyContext();

  const input = {
    productId: p.id,
    optionId: sp.o && /^\d+$/.test(sp.o) ? Number(sp.o) : null,
    addonIds: (sp.x ?? "")
      .split(",")
      .filter((x) => /^\d+$/.test(x))
      .map(Number)
      .slice(0, 20),
    travelDate: sp.date ?? "",
    endDate: sp.end ?? null,
    adults: Number(sp.a ?? 1) || 1,
    children: Number(sp.c ?? 0) || 0,
    infants: Number(sp.i ?? 0) || 0,
  };

  let priced;
  try {
    priced = await priceSelection(input);
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="display-md text-3xl">Let's pick that again</h1>
        <p className="text-ink-soft mt-3">{err.message}</p>
        <Link href={productHref(p) + "#book"} className="btn btn-primary mt-6">
          Back to {p.title}
        </Link>
      </div>
    );
  }
  const { quote: q, option, addons } = priced;

  const fmt = (usd: number) => formatMoney(usd, money.currency, money.rates, { decimals: true });
  const cents = (c: number) => formatCents(c, money.currency, money.rates, { decimals: true });
  const guests = [
    `${input.adults} adult${input.adults > 1 ? "s" : ""}`,
    input.children ? `${input.children} child${input.children > 1 ? "ren" : ""}` : "",
    input.infants ? `${input.infants} infant${input.infants > 1 ? "s" : ""}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <TrackOnView
        event="checkout_started"
        props={{ productId: p.id, category: p.category, totalCents: q.totalCents }}
      />
      <Link href={productHref(p)} className="text-lapis text-sm font-semibold hover:underline">
        Back to trip
      </Link>
      <h1 className="display-md mt-3 text-3xl sm:text-4xl">Your booking request</h1>
      <p className="text-ink-soft mt-2">
        Your details, then we check availability and confirm by email and WhatsApp.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Your details" className="order-2 lg:order-1">
          <CheckoutForm
            booking={{ ...input, endDate: input.endDate ?? undefined, addonIds: addons.map((a) => a.id) }}
            currency={money.currency}
            rates={money.rates}
            needsPickup={p.pickupIncluded && p.category !== "stay"}
            pickupLabel={
              p.category === "transfer" ? "Pickup address or flight number" : "Hotel or pickup address"
            }
          />
        </section>

        <aside aria-label="Summary" className="order-1 lg:order-2">
          <div className="border-line rounded-2xl border">
            <div className="flex gap-4 p-4">
              <span className="bg-mist relative h-20 w-24 shrink-0 overflow-hidden rounded-lg">
                {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="96px" className="object-cover" />}
              </span>
              <div>
                <p className="leading-snug font-bold">{p.title}</p>
                <p className="text-ink-mute mt-1 text-sm">{option ? option.name : p.durationLabel}</p>
              </div>
            </div>
            <dl className="border-line space-y-2 border-t p-4 text-sm">
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
            <dl className="border-line space-y-1.5 border-t p-4 text-sm">
              {q.lines.map((l) => (
                <div key={l.label} className="text-ink-soft flex justify-between gap-3">
                  <dt>{l.label.replace(/\$([\d.]+)/g, (_, n) => fmt(Number(n)))}</dt>
                  <dd className="tabular">{l.amountCents === 0 ? "Free" : cents(l.amountCents)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 pt-2 text-lg font-bold">
                <dt>Total</dt>
                <dd className="tabular">{cents(q.totalCents)}</dd>
              </div>
              {money.currency !== "USD" && (
                <p className="text-ink-mute text-xs">
                  Charged in US dollars: {formatCents(q.totalCents, "USD", money.rates, { decimals: true })}.
                </p>
              )}
              {q.depositCents > 0 && (
                <p className="text-ink-mute text-xs">Deposit at confirmation: {cents(q.depositCents)}.</p>
              )}
              <p className="text-ink-mute text-xs">Have a promo code? Add it with your details.</p>
            </dl>
            <div className="border-line bg-mist/60 text-ink-soft space-y-2 border-t p-4 text-sm">
              <p>{paymentText(p.category)}</p>
              <p>{cancellationText(p.category)}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
