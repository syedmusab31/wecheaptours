/**
 * Standard booking rules for WeCheapTours.
 * Pure functions — used by the booking panel (browser) and the bookings API (server),
 * so the price a guest sees is always the price the server stores.
 */
import type { Category, PriceUnit } from "@/db/schema";

export const CATEGORY_META: Record<
  Category,
  { label: string; plural: string; path: string; singular: string }
> = {
  tour: { label: "Day trips", plural: "Day trips & excursions", path: "tours", singular: "Day trip" },
  cruise: { label: "Nile cruises", plural: "Nile cruises", path: "cruises", singular: "Nile cruise" },
  transfer: { label: "Transfers", plural: "Transfers & private cars", path: "transfers", singular: "Transfer" },
  stay: { label: "Stays", plural: "Vacation rentals", path: "stays", singular: "Stay" },
  package: { label: "Packages", plural: "Multi-day packages", path: "packages", singular: "Package" },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export function categoryFromPath(path: string): Category | null {
  const hit = CATEGORIES.find((c) => CATEGORY_META[c].path === path);
  return hit ?? null;
}

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  person: "per person",
  group: "per group",
  night: "per night",
  vehicle: "per vehicle",
};

/** Booking rules per category */
export const RULES: Record<
  Category,
  {
    /** Minimum hours between booking and travel */
    leadHours: number;
    /** Free cancellation until this many hours before travel */
    freeCancelHours: number;
    /** Share of the total charged if cancelled later than freeCancelHours (1 = 100%) */
    lateCancelFee: number;
    /** Deposit share requested at confirmation (0 = pay on the day) */
    depositShare: number;
  }
> = {
  tour: { leadHours: 24, freeCancelHours: 24, lateCancelFee: 1, depositShare: 0 },
  transfer: { leadHours: 12, freeCancelHours: 24, lateCancelFee: 1, depositShare: 0 },
  cruise: { leadHours: 72, freeCancelHours: 14 * 24, lateCancelFee: 0.5, depositShare: 0.2 },
  stay: { leadHours: 24, freeCancelHours: 7 * 24, lateCancelFee: 0.5, depositShare: 0.2 },
  package: { leadHours: 7 * 24, freeCancelHours: 21 * 24, lateCancelFee: 0.5, depositShare: 0.2 },
};

export const CHILD_RULES = {
  /** Ages 0–3 travel free (no seat, no meal) */
  infantMaxAge: 3,
  /** Ages 4–11 pay this share of the adult price on per-person products */
  childMaxAge: 11,
  childShare: 0.5,
};

export const MAX_DAYS_AHEAD = 365;

export function cancellationText(category: Category): string {
  const r = RULES[category];
  const window =
    r.freeCancelHours >= 48 ? `${Math.round(r.freeCancelHours / 24)} days` : `${r.freeCancelHours} hours`;
  const fee = r.lateCancelFee === 1 ? "the full price is charged" : `${Math.round(r.lateCancelFee * 100)}% of the total is charged`;
  return `Free cancellation up to ${window} before the start. After that, ${fee}.`;
}

export function shortCancellation(category: Category): string {
  const h = RULES[category].freeCancelHours;
  return h >= 48 ? `Free cancellation up to ${Math.round(h / 24)} days before` : `Free cancellation up to ${h}h before`;
}

export function paymentText(category: Category): string {
  const d = RULES[category].depositShare;
  return d > 0
    ? `No payment now. Once we confirm, a ${Math.round(d * 100)}% deposit secures your booking; the rest is paid on arrival.`
    : "No payment now. Pay on the day in cash or by card after we confirm.";
}

// ── Dates ───────────────────────────────────────────────────────────────

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function nightsBetween(start: string, end: string): number {
  const a = Date.parse(start + "T00:00:00Z");
  const b = Date.parse(end + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** Earliest date a guest can pick for this category */
export function earliestDate(category: Category, now = new Date()): string {
  // Whole days only: 12h → tomorrow, 24h → the day after, 72h → in 4 days
  const days = Math.floor(RULES[category].leadHours / 24) + 1;
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function latestDate(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + MAX_DAYS_AHEAD);
  return toISODate(d);
}

// ── Pricing ─────────────────────────────────────────────────────────────

export type QuoteInput = {
  category: Category;
  priceUnit: PriceUnit;
  price: number;
  minGuests: number;
  maxGuests: number;
  minNights: number;
  travelDate: string;
  endDate?: string | null;
  adults: number;
  children: number;
  infants: number;
};

export type Quote =
  | {
      ok: true;
      units: number;
      unitLabel: string;
      lines: { label: string; amount: number }[];
      total: number;
      deposit: number;
    }
  | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prices a booking and checks it against the rules.
 * The server calls this with `{ graceDays: 1 }` so a guest in a time zone ahead of
 * the server is not rejected for picking the earliest date their calendar showed.
 */
export function quote(input: QuoteInput, now = new Date(), opts: { graceDays?: number } = {}): Quote {
  if (opts.graceDays) now = new Date(now.getTime() - opts.graceDays * 86_400_000);
  const { category, priceUnit, price } = input;
  const adults = Math.max(0, Math.floor(input.adults));
  const children = Math.max(0, Math.floor(input.children));
  const infants = Math.max(0, Math.floor(input.infants));
  const guests = adults + children + infants;

  if (adults < 1) return { ok: false, error: "At least one adult is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.travelDate)) return { ok: false, error: "Choose a travel date." };
  if (input.travelDate < earliestDate(category, now)) {
    const h = RULES[category].leadHours;
    return {
      ok: false,
      error: `This needs at least ${h >= 48 ? `${h / 24} days` : `${h} hours`} notice. Pick a later date.`,
    };
  }
  if (input.travelDate > latestDate(now)) return { ok: false, error: "Bookings open up to 12 months ahead." };
  if (adults + children < input.minGuests)
    return { ok: false, error: `Minimum ${input.minGuests} guests for this option.` };
  if (guests > input.maxGuests) return { ok: false, error: `Maximum ${input.maxGuests} guests for this option.` };

  const lines: { label: string; amount: number }[] = [];
  let units = 1;
  let unitLabel = "";

  if (priceUnit === "person") {
    lines.push({ label: `${adults} adult${adults > 1 ? "s" : ""} × $${price}`, amount: adults * price });
    if (children > 0) {
      const cp = round2(price * CHILD_RULES.childShare);
      lines.push({ label: `${children} child${children > 1 ? "ren" : ""} (4–11) × $${cp}`, amount: children * cp });
    }
    if (infants > 0) lines.push({ label: `${infants} infant${infants > 1 ? "s" : ""} (0–3)`, amount: 0 });
    units = adults + children;
    unitLabel = "guests";
  } else if (priceUnit === "night") {
    if (!input.endDate) return { ok: false, error: "Choose a check-out date." };
    const nights = nightsBetween(input.travelDate, input.endDate);
    if (nights < 1) return { ok: false, error: "Check-out must be after check-in." };
    if (nights < input.minNights) return { ok: false, error: `Minimum stay is ${input.minNights} nights.` };
    if (nights > 30) return { ok: false, error: "For stays over 30 nights, send us an enquiry." };
    lines.push({ label: `${nights} night${nights > 1 ? "s" : ""} × $${price}`, amount: nights * price });
    units = nights;
    unitLabel = "nights";
  } else {
    // group or vehicle: one flat price up to maxGuests
    lines.push({ label: `1 ${priceUnit === "vehicle" ? "private vehicle" : "private group"}`, amount: price });
    units = 1;
    unitLabel = priceUnit;
  }

  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  const deposit = round2(total * RULES[category].depositShare);
  return { ok: true, units, unitLabel, lines, total, deposit };
}
