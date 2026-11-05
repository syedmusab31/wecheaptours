import "server-only";
import { CURRENCIES, type Currency } from "@/lib/money";
import { CACHE_TAGS, invalidate } from "@/server/cache";
import { logger } from "@/server/logger";
import { getAllSettings, upsertSettings } from "./settings.repository";
import { env } from "@/config/env";

/** Free endpoint, no key needed. Override with FX_RATES_URL (must return { rates: { EUR: 0.92, … } } for base USD). */
const DEFAULT_URL = "https://open.er-api.com/v6/latest/USD";

/** Daily job: refreshes the display exchange rates. Off unless FX_SYNC=on, so admins keep manual control by default. */
export async function syncExchangeRates(): Promise<"updated" | "skipped"> {
  if (!env.FX_SYNC) return "skipped";
  const res = await fetch(env.FX_RATES_URL || DEFAULT_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`FX rates request failed: ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const fetched = Object.fromEntries(
    CURRENCIES.map((c) => [c, c === "USD" ? 1 : Number(data.rates?.[c])]).filter(([, v]) => Number(v) > 0),
  ) as Partial<Record<Currency, number>>;
  if (Object.keys(fetched).length < 2) throw new Error("FX response had no usable rates");
  const current = (await getAllSettings()).find((r) => r.key === "rates")?.value as
    Record<string, number> | undefined;
  await upsertSettings({ rates: { ...current, ...fetched } });
  invalidate(CACHE_TAGS.settings);
  logger.info({ event: "fx.synced", rates: fetched }, "exchange rates updated");
  return "updated";
}
