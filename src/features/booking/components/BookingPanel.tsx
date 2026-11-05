"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { AddonUnit, Category, PriceUnit } from "@/server/db/schema";
import { formatCents, formatMoney, type Currency } from "@/lib/money";
import { addDays } from "@/lib/dates";
import { earliestDate, latestDate, shortCancellation } from "@/features/booking/domain/booking-policy";
import { PRICE_UNIT_LABEL } from "@/features/catalog/catalog.constants";
import { quote, seatsNeeded, type PricingRule } from "@/features/booking/domain/pricing";

export type PanelProduct = {
  id: number;
  slug: string;
  path: string;
  category: Category;
  priceUnit: PriceUnit;
  priceCents: number;
  minGuests: number;
  maxGuests: number;
  minNights: number;
};

export type PanelOption = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  priceUnit: PriceUnit;
  minGuests: number;
  maxGuests: number;
};
export type PanelAddon = { id: number; name: string; priceCents: number; unit: AddonUnit };
export type PanelRule = PricingRule & { optionId: number | null };

type DayAvailability = { date: string; status: "open" | "full" | "closed"; seatsLeft: number };

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
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:border-ink disabled:opacity-30 disabled:hover:border-line";
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-ink-mute text-xs">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={16} />
        </button>
        <span className="tabular w-5 text-center font-semibold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={btn}
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function BookingPanel({
  product: p,
  options = [],
  addons = [],
  rules = [],
  currency,
  rates,
  initial,
}: {
  product: PanelProduct;
  options?: PanelOption[];
  addons?: PanelAddon[];
  rules?: PanelRule[];
  currency: Currency;
  rates: Record<Currency, number>;
  initial?: { date?: string; end?: string; guests?: number; option?: number };
}) {
  const router = useRouter();
  const minDate = earliestDate(p.category);
  const maxDate = latestDate();
  const startOk = initial?.date && initial.date >= minDate ? initial.date : "";
  const [optionId, setOptionId] = useState<number | null>(
    options.find((o) => o.id === initial?.option)?.id ?? options[0]?.id ?? null,
  );
  const option = options.find((o) => o.id === optionId) ?? null;
  // An option has its own price, unit and guest limits
  const basis = option ?? p;
  const [date, setDate] = useState(startOk);
  const [end, setEnd] = useState(
    initial?.end && startOk && initial.end > startOk
      ? initial.end
      : startOk
        ? addDays(startOk, Math.max(2, p.minNights))
        : "",
  );
  const [adults, setAdults] = useState(
    Math.min(Math.max(initial?.guests ?? 2, basis.minGuests, 1), basis.maxGuests),
  );
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [touched, setTouched] = useState(false);
  const [availability, setAvailability] = useState<{ onRequest: boolean; days: DayAvailability[] } | null>(
    null,
  );
  const isStay = basis.priceUnit === "night";
  const perPerson = basis.priceUnit === "person";
  const money = (usd: number) => formatMoney(usd, currency, rates, { decimals: true });
  const cents = (c: number) => formatCents(c, currency, rates, { decimals: true });
  const seats = seatsNeeded(basis.priceUnit, adults, children);

  // Live availability (sold-out and closed dates); products without a calendar are "on request"
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/v1/products/${p.id}/availability?from=${minDate}&seats=${seats}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setAvailability)
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [p.id, minDate, seats]);

  const unavailable = useMemo(() => {
    if (!availability || availability.onRequest || !date) return null;
    const nights =
      isStay && end > date
        ? Array.from({ length: Math.max(1, (Date.parse(end) - Date.parse(date)) / 86_400_000) }, (_, i) =>
            addDays(date, i),
          )
        : [date];
    const byDate = new Map(availability.days.map((d) => [d.date, d]));
    const bad = nights.find((d) => byDate.get(d)?.status !== "open");
    if (!bad) return null;
    return byDate.get(bad)?.status === "full" ? `Sold out on ${bad}.` : `Not available on ${bad}.`;
  }, [availability, date, end, isStay]);

  const nextOpen = useMemo(
    () =>
      availability && !availability.onRequest
        ? availability.days.filter((d) => d.status === "open").slice(0, 4)
        : [],
    [availability],
  );

  const q = useMemo(
    () =>
      quote({
        category: p.category,
        priceUnit: basis.priceUnit,
        priceCents: basis.priceCents,
        minGuests: basis.minGuests,
        maxGuests: basis.maxGuests,
        minNights: p.minNights,
        travelDate: date,
        endDate: isStay ? end : null,
        adults,
        children,
        infants,
        rules: rules.filter((r) => r.optionId == null || r.optionId === optionId),
        addons: addons.filter((a) => addonIds.includes(a.id)),
      }),
    [p, basis, date, end, adults, children, infants, isStay, rules, addons, addonIds, optionId],
  );

  const room = basis.maxGuests - adults - children - infants;

  function go() {
    setTouched(true);
    if (!q.ok || unavailable) return;
    const params = new URLSearchParams({ date, a: String(adults), c: String(children), i: String(infants) });
    if (isStay) params.set("end", end);
    if (optionId) params.set("o", String(optionId));
    if (addonIds.length) params.set("x", addonIds.join(","));
    router.push(`/book/${p.slug}?${params.toString()}`);
  }

  return (
    <div className="border-line rounded-[24px] border bg-white p-6 shadow-[var(--shadow-float)]">
      <p className="text-ink-mute text-sm">from</p>
      <p className="flex items-baseline gap-2">
        <span className="stamp text-2xl font-extrabold">
          {formatCents(Math.min(p.priceCents, ...options.map((o) => o.priceCents)), currency, rates)}
        </span>
        <span className="text-ink-mute text-sm">{PRICE_UNIT_LABEL[basis.priceUnit]}</span>
      </p>

      {options.length > 0 && (
        <fieldset className="mt-5 space-y-2">
          <legend className="label">Option</legend>
          {options.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${o.id === optionId ? "border-lapis bg-lapis-tint/40" : "border-line"}`}
            >
              <input
                type="radio"
                name="option"
                className="mt-1"
                checked={o.id === optionId}
                onChange={() => setOptionId(o.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2 font-semibold">
                  {o.name}
                  <span className="tabular">{formatCents(o.priceCents, currency, rates)}</span>
                </span>
                <span className="text-ink-mute block text-xs">
                  {PRICE_UNIT_LABEL[o.priceUnit]}
                  {o.description ? ` · ${o.description}` : ""}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className={`mt-5 grid gap-3 ${isStay ? "grid-cols-2" : ""}`}>
        <label>
          <span className="label">
            {isStay
              ? "Check-in"
              : p.category === "cruise" || p.category === "package"
                ? "Departure date"
                : "Date"}
          </span>
          <input
            type="date"
            className="field"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (isStay && e.target.value && (!end || end <= e.target.value))
                setEnd(addDays(e.target.value, Math.max(2, p.minNights)));
            }}
          />
        </label>
        {isStay && (
          <label>
            <span className="label">Check-out</span>
            <input
              type="date"
              className="field"
              min={date ? addDays(date, p.minNights) : minDate}
              max={maxDate}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        )}
      </div>
      {unavailable && (
        <div role="status" className="bg-sun-tint mt-2 rounded-lg px-3 py-2 text-sm">
          {unavailable}
          {nextOpen.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {nextOpen.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setDate(d.date)}
                  className="text-lapis rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold"
                >
                  {d.date}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      <div className="divide-line mt-3 divide-y">
        <Stepper
          label="Adults"
          hint={perPerson ? "Age 12+" : undefined}
          value={adults}
          min={1}
          max={Math.max(1, adults + room)}
          onChange={setAdults}
        />
        <Stepper
          label="Children"
          hint={perPerson ? "Age 4–11, half price" : "Age 4–11"}
          value={children}
          min={0}
          max={children + room}
          onChange={setChildren}
        />
        <Stepper
          label="Infants"
          hint="Age 0–3, free"
          value={infants}
          min={0}
          max={infants + room}
          onChange={setInfants}
        />
      </div>
      <p className="text-ink-mute mt-1 text-xs">
        {basis.priceUnit === "vehicle"
          ? `One vehicle for up to ${basis.maxGuests} guests.`
          : `Up to ${basis.maxGuests} guests.`}
        {basis.minGuests > 1 ? ` Minimum ${basis.minGuests}.` : ""}
        {isStay && p.minNights > 1 ? ` Minimum ${p.minNights} nights.` : ""}
      </p>

      {addons.length > 0 && (
        <fieldset className="mt-4 space-y-1.5">
          <legend className="label">Extras</legend>
          {addons.map((a) => (
            <label key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addonIds.includes(a.id)}
                  onChange={(e) =>
                    setAddonIds((ids) =>
                      e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id),
                    )
                  }
                  className="h-4 w-4"
                />
                {a.name}
              </span>
              <span className="tabular text-ink-mute">
                {formatCents(a.priceCents, currency, rates)}{" "}
                {a.unit === "person" ? "per person" : "per booking"}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {q.ok ? (
        <dl className="border-line mt-4 space-y-1.5 border-t pt-4 text-sm">
          {q.lines.map((l) => (
            <div key={l.label} className="text-ink-soft flex justify-between gap-3">
              <dt>{l.label.replace(/\$([\d.]+)/g, (_, n) => money(Number(n)))}</dt>
              <dd className="tabular">{l.amountCents === 0 ? "Free" : cents(l.amountCents)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular">{cents(q.totalCents)}</dd>
          </div>
        </dl>
      ) : (
        touched && (
          <p role="alert" className="bg-danger-tint text-danger mt-4 rounded-lg px-3 py-2 text-sm">
            {q.error}
          </p>
        )
      )}

      <button type="button" onClick={go} className="btn btn-primary mt-5 w-full py-4 text-base">
        Request to book
      </button>
      <ul className="mt-4 space-y-1.5 text-sm">
        <li className="text-faience flex items-start gap-2">
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden />{" "}
          <span className="font-medium">{shortCancellation(p.category)}</span>
        </li>
        <li className="text-ink-soft flex items-start gap-2">
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden /> No payment now. We confirm within 24
          hours.
        </li>
      </ul>
    </div>
  );
}
