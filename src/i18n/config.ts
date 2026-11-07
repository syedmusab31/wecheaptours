/**
 * Languages the public site is available in. Add a code here and a messages/<code>.json file
 * (same keys as en.json; TypeScript reports missing ones) to add a language.
 */
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

/** Right-to-left languages, for <html dir> (Arabic when it is added) */
const RTL = new Set<string>(["ar", "he", "fa", "ur"]);
export const textDirection = (locale: string) => (RTL.has(locale) ? "rtl" : "ltr");

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Best supported language for an Accept-Language header ("de-DE,de;q=0.9,en;q=0.8"), or the default */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((w) => w.lang && w.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((w) => w.lang).find(isLocale) ?? DEFAULT_LOCALE;
}
