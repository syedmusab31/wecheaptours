import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, isLocale, negotiateLocale } from "./config";

/**
 * The language of each request: the visitor's choice (cookie), else their browser's preference.
 * URLs stay language-free while English is the only language; when a second one is added,
 * this can move to /[locale]/ routes with hreflang (see docs/adr/0007-translations.md).
 */
export default getRequestConfig(async () => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(chosen) ? chosen : negotiateLocale((await headers()).get("accept-language"));
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Africa/Cairo",
  };
});
