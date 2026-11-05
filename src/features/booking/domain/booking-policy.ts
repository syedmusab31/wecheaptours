/**
 * Booking rules per category: lead time, cancellation, deposit and child pricing.
 * Pure and framework-free, so the browser and the server apply the same rules.
 */
import type { Category } from "@/server/db/schema";
import { toISODate } from "@/lib/dates";

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
  const fee =
    r.lateCancelFee === 1
      ? "the full price is charged"
      : `${Math.round(r.lateCancelFee * 100)}% of the total is charged`;
  return `Free cancellation up to ${window} before the start. After that, ${fee}.`;
}

export function shortCancellation(category: Category): string {
  const h = RULES[category].freeCancelHours;
  return h >= 48
    ? `Free cancellation up to ${Math.round(h / 24)} days before`
    : `Free cancellation up to ${h}h before`;
}

export function paymentText(category: Category): string {
  const d = RULES[category].depositShare;
  return d > 0
    ? `No payment now. Once we confirm, a ${Math.round(d * 100)}% deposit secures your booking; the rest is paid on arrival.`
    : "No payment now. Pay on the day in cash or by card after we confirm.";
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

// ── Cancellation ────────────────────────────────────────────────────────

/** Hours from `now` until the start of the travel date (00:00 local time) */
export function hoursUntil(travelDate: string, now = new Date()): number {
  const [y, m, d] = travelDate.split("-").map(Number);
  return (new Date(y, m - 1, d).getTime() - now.getTime()) / 3_600_000;
}

/** What a cancellation costs right now, in cents. 0 inside the free-cancellation window. */
export function cancellationFeeCents(
  category: Category,
  totalCents: number,
  travelDate: string,
  now = new Date(),
): number {
  const rule = RULES[category];
  if (hoursUntil(travelDate, now) >= rule.freeCancelHours) return 0;
  return Math.round(totalCents * rule.lateCancelFee);
}

/** Guests may cancel online only while it is free; later, they contact us. */
export function canCancelFree(category: Category, travelDate: string, now = new Date()): boolean {
  return hoursUntil(travelDate, now) >= RULES[category].freeCancelHours;
}
