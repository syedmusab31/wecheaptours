import Image from "next/image";
import Link from "next/link";
import { Check, Clock, MapPin, Star } from "lucide-react";
import type { ProductWithDest } from "@/lib/queries";
import { formatMoney, type Currency } from "@/lib/currency";
import { CATEGORY_META, PRICE_UNIT_LABEL } from "@/lib/rules";
import { cn } from "@/lib/utils";

export function productHref(p: Pick<ProductWithDest, "category" | "slug">, query?: string) {
  return `/${CATEGORY_META[p.category].path}/${p.slug}${query ? `?${query}` : ""}`;
}

export function Rating({ rating, count, className }: { rating: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-sm font-medium text-ink-mute", className)}>New</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star size={14} className="fill-ink text-ink" aria-hidden />
      <b className="tabular">{rating.toFixed(1)}</b>
      <span className="text-ink-mute">({count})</span>
    </span>
  );
}

type Money = { currency: Currency; rates: Record<Currency, number> };

const unitShort: Record<string, string> = { person: "/ person", group: "/ group", night: "/ night", vehicle: "/ car" };

export function ProductCard({
  product: p,
  money,
  layout = "grid",
  query,
  sizes = "(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 320px",
}: {
  product: ProductWithDest;
  money: Money;
  layout?: "grid" | "row";
  query?: string;
  sizes?: string;
}) {
  const href = productHref(p, query);
  const price = formatMoney(Number(p.price), money.currency, money.rates);

  if (layout === "row") {
    return (
      <article className="group relative grid grid-cols-1 overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-shadow hover:shadow-[var(--shadow-lift)] sm:grid-cols-[260px_1fr] md:grid-cols-[260px_1fr_190px]">
        <div className="relative aspect-[16/10] bg-mist sm:aspect-auto sm:min-h-[200px]">
          {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="(max-width: 640px) 90vw, 260px" className="object-cover" />}
        </div>
        <div className="flex min-w-0 flex-col p-5">
          <p className="flex items-center gap-1.5 text-sm text-ink-mute">
            <MapPin size={14} aria-hidden /> {p.destinationName}, {p.country}
            <span aria-hidden>·</span> {CATEGORY_META[p.category].singular}
          </p>
          <h3 className="mt-1.5 text-[1.12rem] font-semibold leading-snug">
            <Link href={href} className="after:absolute after:inset-0 group-hover:text-lapis">
              {p.title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[0.95rem] text-ink-soft">{p.summary}</p>
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4 text-[0.8rem] font-medium">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-ink-soft">
              <Clock size={13} aria-hidden /> {p.durationLabel}
            </li>
            {p.pickupIncluded && p.category !== "stay" && <li className="rounded-full bg-mist px-2.5 py-1 text-ink-soft">Pickup included</li>}
            {p.isPrivate && <li className="rounded-full bg-mist px-2.5 py-1 text-ink-soft">Private</li>}
            <li className="inline-flex items-center gap-1 rounded-full bg-faience-tint px-2.5 py-1 text-faience">
              <Check size={13} aria-hidden /> Free cancellation
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 md:flex-col md:items-end md:justify-between md:border-l md:border-t-0 md:py-5">
          <Rating rating={Number(p.rating)} count={p.reviewCount} />
          <p className="text-right">
            <span className="block text-xs text-ink-mute">from</span>
            <span className="stamp text-xl font-extrabold">{price}</span>
            <span className="mt-1 block text-xs text-ink-mute">{PRICE_UNIT_LABEL[p.priceUnit]}</span>
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[5/4] overflow-hidden rounded-[var(--radius-card)] bg-mist">
        {p.images[0] && (
          <Image src={p.images[0]} alt="" fill sizes={sizes} className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {p.reviewCount ? (
            <>
              <Star size={12} className="fill-ink text-ink" aria-hidden /> {Number(p.rating).toFixed(1)}
              <span className="font-normal text-ink-mute">({p.reviewCount})</span>
            </>
          ) : (
            "New"
          )}
        </span>
      </div>
      <div className="mt-3.5 flex flex-1 flex-col">
        <p className="text-[0.82rem] text-ink-mute">
          {p.destinationName} · {p.durationLabel}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 group-hover:text-lapis">
            {p.title}
          </Link>
        </h3>
        <p className="mt-auto flex items-baseline gap-1.5 pt-2.5 text-sm text-ink-mute">
          from <span className="stamp text-[0.95rem] font-extrabold">{price}</span> {unitShort[p.priceUnit]}
        </p>
      </div>
    </article>
  );
}

