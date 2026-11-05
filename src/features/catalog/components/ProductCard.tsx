import { productHref } from "@/lib/routes";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock, MapPin, Star } from "lucide-react";
import type { ProductWithDest } from "@/features/catalog/catalog.types";
import { formatCents, type Currency } from "@/lib/money";
import { CATEGORY_META, PRICE_UNIT_LABEL } from "@/features/catalog/catalog.constants";
import { cn } from "@/lib/utils";

export function Rating({ rating, count, className }: { rating: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-ink-mute text-sm font-medium", className)}>New</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star size={14} className="fill-ink text-ink" aria-hidden />
      <b className="tabular">{rating.toFixed(1)}</b>
      <span className="text-ink-mute">({count})</span>
    </span>
  );
}

type Money = { currency: Currency; rates: Record<Currency, number> };

const unitShort: Record<string, string> = {
  person: "/ person",
  group: "/ group",
  night: "/ night",
  vehicle: "/ car",
};

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
  const price = formatCents(p.priceCents, money.currency, money.rates);

  if (layout === "row") {
    return (
      <article className="group border-line relative grid grid-cols-1 overflow-hidden rounded-[var(--radius-card)] border bg-white transition-shadow hover:shadow-[var(--shadow-lift)] sm:grid-cols-[260px_1fr] md:grid-cols-[260px_1fr_190px]">
        <div className="bg-mist relative aspect-[16/10] sm:aspect-auto sm:min-h-[200px]">
          {p.images[0] && (
            <Image
              src={p.images[0]}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 260px"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col p-5">
          <p className="text-ink-mute flex items-center gap-1.5 text-sm">
            <MapPin size={14} aria-hidden /> {p.destinationName}, {p.country}
            <span aria-hidden>·</span> {CATEGORY_META[p.category].singular}
          </p>
          <h3 className="mt-1.5 text-[1.12rem] leading-snug font-semibold">
            <Link href={href} className="group-hover:text-lapis after:absolute after:inset-0">
              {p.title}
            </Link>
          </h3>
          <p className="text-ink-soft mt-1.5 line-clamp-2 text-[0.95rem]">{p.summary}</p>
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4 text-[0.8rem] font-medium">
            <li className="bg-mist text-ink-soft inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <Clock size={13} aria-hidden /> {p.durationLabel}
            </li>
            {p.pickupIncluded && p.category !== "stay" && (
              <li className="bg-mist text-ink-soft rounded-full px-2.5 py-1">Pickup included</li>
            )}
            {p.isPrivate && <li className="bg-mist text-ink-soft rounded-full px-2.5 py-1">Private</li>}
            <li className="bg-faience-tint text-faience inline-flex items-center gap-1 rounded-full px-2.5 py-1">
              <Check size={13} aria-hidden /> Free cancellation
            </li>
          </ul>
        </div>
        <div className="border-line flex items-center justify-between gap-3 border-t px-5 py-4 md:flex-col md:items-end md:justify-between md:border-t-0 md:border-l md:py-5">
          <Rating rating={Number(p.rating)} count={p.reviewCount} />
          <p className="text-right">
            <span className="text-ink-mute block text-xs">from</span>
            <span className="stamp text-xl font-extrabold">{price}</span>
            <span className="text-ink-mute mt-1 block text-xs">{PRICE_UNIT_LABEL[p.priceUnit]}</span>
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col">
      <div className="bg-mist relative aspect-[5/4] overflow-hidden rounded-[var(--radius-card)]">
        {p.images[0] && (
          <Image
            src={p.images[0]}
            alt=""
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
          />
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {p.reviewCount ? (
            <>
              <Star size={12} className="fill-ink text-ink" aria-hidden /> {Number(p.rating).toFixed(1)}
              <span className="text-ink-mute font-normal">({p.reviewCount})</span>
            </>
          ) : (
            "New"
          )}
        </span>
      </div>
      <div className="mt-3.5 flex flex-1 flex-col">
        <p className="text-ink-mute text-[0.82rem]">
          {p.destinationName} · {p.durationLabel}
        </p>
        <h3 className="mt-1 line-clamp-2 leading-snug font-semibold">
          <Link href={href} className="group-hover:text-lapis after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <p className="text-ink-mute mt-auto flex items-baseline gap-1.5 pt-2.5 text-sm">
          from <span className="stamp text-[0.95rem] font-extrabold">{price}</span> {unitShort[p.priceUnit]}
        </p>
      </div>
    </article>
  );
}
