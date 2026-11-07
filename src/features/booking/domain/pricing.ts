/**
 * Prices a booking and checks it against the booking policy. All amounts are integer cents.
 * Used by the booking panel (browser) and the booking service (server), so the price a guest
 * sees is always the price the server stores. Pure: the caller loads rules, add-ons and the promo code.
 */
import type { AddonUnit, Category, PriceUnit } from "@/server/db/schema";
import { addDays, nightsBetween } from "@/lib/dates";
import { CHILD_RULES, RULES, earliestDate, latestDate } from "./booking-policy";

export type PricingRule = {
  name: string;
  startsOn?: string | null;
  endsOn?: string | null;
  /** 0 = Sunday … 6 = Saturday */
  weekdays?: number[] | null;
  minGuests?: number | null;
  /** +25 for +25%, -10 for −10% */
  percentChange: number;
};

export type SelectedAddon = { id: number; name: string; priceCents: number; unit: AddonUnit };

/** An extra guest type priced as a share of the adult price, e.g. Senior (65+) at 0.8 */
export type GuestTier = { key: string; label: string; share: number };

export type PromoDiscount = { code: string; percentOff?: number | null; amountOffCents?: number | null };

export type QuoteInput = {
  category: Category;
  priceUnit: PriceUnit;
  priceCents: number;
  minGuests: number;
  maxGuests: number;
  minNights: number;
  travelDate: string;
  endDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  /** Per-person products only: the product's tiers and how many guests of each */
  tiers?: GuestTier[];
  tierGuests?: Record<string, number>;
  rules?: PricingRule[];
  addons?: SelectedAddon[];
  promo?: PromoDiscount | null;
};

export type PriceLine = { label: string; amountCents: number };

export type Quote =
  | {
      ok: true;
      units: number;
      unitLabel: string;
      lines: PriceLine[];
      subtotalCents: number;
      discountCents: number;
      totalCents: number;
      depositCents: number;
      /** Seats or units this booking takes from availability, per date */
      seats: number;
      /** Dates the booking occupies: the travel date, or every night of a stay */
      dates: string[];
    }
  | { ok: false; error: string };

/** "$40" style label amount; the panel rewrites it into the visitor's currency */
const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function weekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function ruleMatches(rule: PricingRule, date: string, guests: number): boolean {
  if (rule.startsOn && date < rule.startsOn) return false;
  if (rule.endsOn && date > rule.endsOn) return false;
  if (rule.weekdays?.length && !rule.weekdays.includes(weekday(date))) return false;
  if (rule.minGuests && guests < rule.minGuests) return false;
  return true;
}

/** Seats a booking needs from each slot: people for per-person prices, else one unit (car, group, property). */
export function seatsNeeded(priceUnit: PriceUnit, adults: number, children: number, tierGuests = 0): number {
  return priceUnit === "person" ? adults + children + tierGuests : 1;
}

/** Guests per tier, ignoring unknown tiers and negative or fractional counts */
export function countTierGuests(
  tiers: GuestTier[] = [],
  counts: Record<string, number> = {},
): { tier: GuestTier; count: number }[] {
  return tiers
    .map((tier) => ({ tier, count: Math.max(0, Math.floor(Number(counts[tier.key]) || 0)) }))
    .filter((t) => t.count > 0);
}

export function quote(input: QuoteInput, now = new Date(), opts: { graceDays?: number } = {}): Quote {
  if (opts.graceDays) now = new Date(now.getTime() - opts.graceDays * 86_400_000);
  const { category, priceUnit, priceCents } = input;
  const adults = Math.max(0, Math.floor(input.adults));
  const children = Math.max(0, Math.floor(input.children));
  const infants = Math.max(0, Math.floor(input.infants));
  // Tiers (senior, student…) exist only on per-person prices
  const tierLines = priceUnit === "person" ? countTierGuests(input.tiers, input.tierGuests) : [];
  const tierCount = tierLines.reduce((s, t) => s + t.count, 0);
  const payingGuests = adults + children + tierCount;

  if (adults + tierCount < 1) return { ok: false, error: "At least one adult is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.travelDate)) return { ok: false, error: "Choose a travel date." };
  if (input.travelDate < earliestDate(category, now)) {
    const h = RULES[category].leadHours;
    return {
      ok: false,
      error: `This needs at least ${h >= 48 ? `${h / 24} days` : `${h} hours`} notice. Pick a later date.`,
    };
  }
  if (input.travelDate > latestDate(now)) return { ok: false, error: "Bookings open up to 12 months ahead." };
  if (payingGuests < input.minGuests)
    return { ok: false, error: `Minimum ${input.minGuests} guests for this option.` };
  if (payingGuests + infants > input.maxGuests)
    return { ok: false, error: `Maximum ${input.maxGuests} guests for this option.` };

  const lines: PriceLine[] = [];
  let units = 1;
  let unitLabel: string = priceUnit;
  let dates = [input.travelDate];
  const rules = input.rules ?? [];

  if (priceUnit === "night") {
    if (!input.endDate) return { ok: false, error: "Choose a check-out date." };
    const nights = nightsBetween(input.travelDate, input.endDate);
    if (nights < 1) return { ok: false, error: "Check-out must be after check-in." };
    if (nights < input.minNights) return { ok: false, error: `Minimum stay is ${input.minNights} nights.` };
    if (nights > 30) return { ok: false, error: "For stays over 30 nights, send us an enquiry." };
    lines.push({
      label: `${plural(nights, "night")} × ${dollars(priceCents)}`,
      amountCents: nights * priceCents,
    });
    units = nights;
    unitLabel = "nights";
    dates = Array.from({ length: nights }, (_, i) => addDays(input.travelDate, i));
    // Seasonal rules apply night by night
    for (const rule of rules) {
      const matched = dates.filter((d) => ruleMatches(rule, d, payingGuests)).length;
      if (!matched) continue;
      const amount = Math.round((priceCents * matched * rule.percentChange) / 100);
      lines.push({ label: `${rule.name} (${plural(matched, "night")})`, amountCents: amount });
    }
  } else {
    if (priceUnit === "person") {
      lines.push({
        label: `${plural(adults, "adult")} × ${dollars(priceCents)}`,
        amountCents: adults * priceCents,
      });
      if (children > 0) {
        const childCents = Math.round(priceCents * CHILD_RULES.childShare);
        lines.push({
          label: `${plural(children, "child", "children")} (4–11) × ${dollars(childCents)}`,
          amountCents: children * childCents,
        });
      }
      for (const { tier, count } of tierLines) {
        const tierCents = Math.round(priceCents * tier.share);
        lines.push({
          label: `${count} × ${tier.label} × ${dollars(tierCents)}`,
          amountCents: count * tierCents,
        });
      }
      if (infants > 0) lines.push({ label: `${plural(infants, "infant")} (0–3)`, amountCents: 0 });
      units = payingGuests;
      unitLabel = "guests";
    } else {
      lines.push({
        label: `1 ${priceUnit === "vehicle" ? "private vehicle" : "private group"}`,
        amountCents: priceCents,
      });
    }
    const base = lines.reduce((s, l) => s + l.amountCents, 0);
    for (const rule of rules) {
      if (!ruleMatches(rule, input.travelDate, payingGuests)) continue;
      const amount = Math.round((base * rule.percentChange) / 100);
      lines.push({ label: rule.name, amountCents: amount });
    }
  }

  for (const addon of input.addons ?? []) {
    const qty = addon.unit === "person" ? payingGuests : 1;
    lines.push({
      label: addon.unit === "person" ? `${addon.name} × ${qty}` : addon.name,
      amountCents: addon.priceCents * qty,
    });
  }

  const subtotalCents = Math.max(
    0,
    lines.reduce((s, l) => s + l.amountCents, 0),
  );
  let discountCents = 0;
  if (input.promo) {
    discountCents = input.promo.percentOff
      ? Math.round((subtotalCents * input.promo.percentOff) / 100)
      : Math.min(subtotalCents, input.promo.amountOffCents ?? 0);
    if (discountCents > 0) lines.push({ label: `Promo ${input.promo.code}`, amountCents: -discountCents });
  }

  const totalCents = subtotalCents - discountCents;
  const depositCents = Math.round(totalCents * RULES[category].depositShare);
  return {
    ok: true,
    units,
    unitLabel,
    lines,
    subtotalCents,
    discountCents,
    totalCents,
    depositCents,
    seats: seatsNeeded(priceUnit, adults, children, tierCount),
    dates,
  };
}
