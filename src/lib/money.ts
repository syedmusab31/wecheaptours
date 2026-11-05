export const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "JOD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Demo rates (1 USD = x). Editable by admins in Settings; stored in the `settings` table. */
export const DEFAULT_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  EGP: 48.5,
  JOD: 0.709,
};

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);
}

export function convert(usd: number, currency: Currency, rates: Record<Currency, number>): number {
  return usd * (rates[currency] ?? 1);
}

export function formatMoney(
  usd: number,
  currency: Currency = "USD",
  rates: Record<Currency, number> = DEFAULT_RATES,
  opts: { decimals?: boolean } = {},
): string {
  const value = convert(usd, currency, rates);
  const big = currency === "EGP";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: opts.decimals && !big ? 2 : 0,
    minimumFractionDigits: opts.decimals && !big ? 2 : 0,
  }).format(value);
}

// ── Minor units ─────────────────────────────────────────────────────────
// Amounts are stored and calculated as integer cents; convert only at the edges (forms, display).

export function toCents(major: number): number {
  return Math.round(major * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Formats an amount stored in USD cents in the visitor's currency */
export function formatCents(
  cents: number,
  currency: Currency = "USD",
  rates: Record<Currency, number> = DEFAULT_RATES,
  opts: { decimals?: boolean } = {},
): string {
  return formatMoney(fromCents(cents), currency, rates, opts);
}

/** Admin screens: exact amount in the booking's own currency, e.g. "US$112.50" */
export function formatCentsExact(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "symbol" }).format(
    cents / 100,
  );
}
