"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { Category, PriceUnit } from "@/db/schema";
import { formatMoney, type Currency } from "@/lib/currency";
import { addDays, earliestDate, latestDate, PRICE_UNIT_LABEL, quote, shortCancellation } from "@/lib/rules";

export type PanelProduct = {
  id: number;
  slug: string;
  path: string;
  category: Category;
  priceUnit: PriceUnit;
  price: number;
  minGuests: number;
  maxGuests: number;
  minNights: number;
};

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:border-ink disabled:opacity-30 disabled:hover:border-line";
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-xs text-ink-mute">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={16} />
        </button>
        <span className="w-5 text-center font-semibold tabular" aria-live="polite">
          {value}
        </span>
        <button type="button" className={btn} aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function BookingPanel({
  product: p,
  currency,
  rates,
  initial,
}: {
  product: PanelProduct;
  currency: Currency;
  rates: Record<Currency, number>;
  initial?: { date?: string; end?: string; guests?: number };
}) {
  const router = useRouter();
  const minDate = earliestDate(p.category);
  const maxDate = latestDate();
  const startOk = initial?.date && initial.date >= minDate ? initial.date : "";
  const [date, setDate] = useState(startOk);
  const [end, setEnd] = useState(
    initial?.end && startOk && initial.end > startOk ? initial.end : startOk ? addDays(startOk, Math.max(2, p.minNights)) : "",
  );
  const [adults, setAdults] = useState(Math.min(Math.max(initial?.guests ?? 2, p.minGuests, 1), p.maxGuests));
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [touched, setTouched] = useState(false);
  const isStay = p.priceUnit === "night";
  const perPerson = p.priceUnit === "person";
  const money = (usd: number) => formatMoney(usd, currency, rates, { decimals: true });

  const q = useMemo(
    () =>
      quote({
        category: p.category,
        priceUnit: p.priceUnit,
        price: p.price,
        minGuests: p.minGuests,
        maxGuests: p.maxGuests,
        minNights: p.minNights,
        travelDate: date,
        endDate: isStay ? end : null,
        adults,
        children,
        infants,
      }),
    [p, date, end, adults, children, infants, isStay],
  );

  const room = p.maxGuests - adults - children - infants;

  function go() {
    setTouched(true);
    if (!q.ok) return;
    const params = new URLSearchParams({ date, a: String(adults), c: String(children), i: String(infants) });
    if (isStay) params.set("end", end);
    router.push(`/book/${p.slug}?${params.toString()}`);
  }

  return (
    <div className="rounded-[24px] border border-line bg-white p-6 shadow-[var(--shadow-float)]">
      <p className="text-sm text-ink-mute">from</p>
      <p className="flex items-baseline gap-2">
        <span className="stamp text-2xl font-extrabold">{formatMoney(p.price, currency, rates)}</span>
        <span className="text-sm text-ink-mute">{PRICE_UNIT_LABEL[p.priceUnit]}</span>
      </p>

      <div className={`mt-5 grid gap-3 ${isStay ? "grid-cols-2" : ""}`}>
        <label>
          <span className="label">{isStay ? "Check-in" : p.category === "cruise" || p.category === "package" ? "Departure date" : "Date"}</span>
          <input
            type="date"
            className="field"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (isStay && e.target.value && (!end || end <= e.target.value)) setEnd(addDays(e.target.value, Math.max(2, p.minNights)));
            }}
          />
        </label>
        {isStay && (
          <label>
            <span className="label">Check-out</span>
            <input type="date" className="field" min={date ? addDays(date, p.minNights) : minDate} max={maxDate} value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        )}
      </div>

      <div className="mt-3 divide-y divide-line">
        <Stepper label="Adults" hint={perPerson ? "Age 12+" : undefined} value={adults} min={1} max={Math.max(1, adults + room)} onChange={setAdults} />
        <Stepper label="Children" hint={perPerson ? "Age 4–11, half price" : "Age 4–11"} value={children} min={0} max={children + room} onChange={setChildren} />
        <Stepper label="Infants" hint="Age 0–3, free" value={infants} min={0} max={infants + room} onChange={setInfants} />
      </div>
      <p className="mt-1 text-xs text-ink-mute">
        {p.priceUnit === "vehicle" ? `One vehicle for up to ${p.maxGuests} guests.` : `Up to ${p.maxGuests} guests.`}
        {p.minGuests > 1 ? ` Minimum ${p.minGuests}.` : ""}
        {isStay && p.minNights > 1 ? ` Minimum ${p.minNights} nights.` : ""}
      </p>

      {q.ok ? (
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          {q.lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-3 text-ink-soft">
              <dt>{l.label.replace(/\$([\d.]+)/g, (_, n) => money(Number(n)))}</dt>
              <dd className="tabular">{l.amount === 0 ? "Free" : money(l.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular">{money(q.total)}</dd>
          </div>
        </dl>
      ) : (
        touched && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger">
            {q.error}
          </p>
        )
      )}

      <button type="button" onClick={go} className="btn btn-primary mt-5 w-full py-4 text-base">
        Request to book
      </button>
      <ul className="mt-4 space-y-1.5 text-sm">
        <li className="flex items-start gap-2 text-faience">
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden /> <span className="font-medium">{shortCancellation(p.category)}</span>
        </li>
        <li className="flex items-start gap-2 text-ink-soft">
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden /> No payment now. We confirm within 24 hours.
        </li>
      </ul>
    </div>
  );
}
