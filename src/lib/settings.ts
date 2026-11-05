import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_RATES, isCurrency, type Currency } from "./currency";

export type ContactSettings = {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  licence: string;
};

export type SiteSettings = {
  rates: Record<Currency, number>;
  demoMode: boolean;
  contact: ContactSettings;
};

const FALLBACK: SiteSettings = {
  rates: DEFAULT_RATES,
  demoMode: true,
  contact: { phone: "", whatsapp: "", email: "hello@wecheaptours.com", address: "Cairo, Egypt", licence: "" },
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    rates: { ...DEFAULT_RATES, ...((map.rates as Record<Currency, number>) ?? {}) },
    demoMode: typeof map.demoMode === "boolean" ? map.demoMode : FALLBACK.demoMode,
    contact: { ...FALLBACK.contact, ...((map.contact as ContactSettings) ?? {}) },
  };
});

export async function getCurrency(): Promise<Currency> {
  const c = (await cookies()).get("currency")?.value;
  return isCurrency(c) ? c : "USD";
}

/** Currency + rates for formatting prices on a page */
export async function getMoneyContext() {
  const [currency, s] = await Promise.all([getCurrency(), getSettings()]);
  return { currency, rates: s.rates };
}
