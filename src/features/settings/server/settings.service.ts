import "server-only";
import { CACHE_TAGS, cached } from "@/server/cache";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_RATES, isCurrency, type Currency } from "@/lib/money";
import { contactSchema, ratesSchema, type ContactSettings, type SettingsFormInput } from "../settings.schema";
import * as settingsRepository from "./settings.repository";

export type { ContactSettings };

export type SiteSettings = {
  rates: Record<Currency, number>;
  demoMode: boolean;
  contact: ContactSettings;
};

const FALLBACK_CONTACT: ContactSettings = {
  phone: "",
  whatsapp: "",
  email: "hello@wecheaptours.com",
  address: "Cairo, Egypt",
  licence: "",
};

/** Site settings, validated on read: a bad value falls back to the default instead of breaking pages. */
const readSettingRows = cached(settingsRepository.getAllSettings, "settings:all", {
  tags: [CACHE_TAGS.settings],
  revalidateSeconds: 86_400,
});

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await readSettingRows();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const rates = ratesSchema.partial().safeParse(map.rates);
  const contact = contactSchema.partial().safeParse(map.contact);
  return {
    rates: { ...DEFAULT_RATES, ...(rates.success ? rates.data : {}) },
    demoMode: typeof map.demoMode === "boolean" ? map.demoMode : true,
    contact: { ...FALLBACK_CONTACT, ...(contact.success ? contact.data : {}) },
  };
});

export async function saveSettings(input: SettingsFormInput) {
  await settingsRepository.upsertSettings({
    rates: input.rates,
    contact: input.contact,
    demoMode: input.demoMode,
  });
}

export async function getCurrency(): Promise<Currency> {
  const c = (await cookies()).get("currency")?.value;
  return isCurrency(c) ? c : "USD";
}

/** Currency + rates for formatting prices on a page */
export async function getMoneyContext() {
  const [currency, s] = await Promise.all([getCurrency(), getSettings()]);
  return { currency, rates: s.rates };
}
