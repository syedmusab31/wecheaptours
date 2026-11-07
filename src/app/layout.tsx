import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { SITE } from "@/config/site";
import { getRegionLabel } from "@/features/destination/server/destination.service";
import { Analytics } from "@/components/analytics/Analytics";
import { textDirection } from "@/i18n/config";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const [amp, and] = await Promise.all([getRegionLabel("&"), getRegionLabel("and")]);
  return {
    metadataBase: new URL(site),
    title: { default: `${SITE.name} · ${amp} tours, cruises and transfers`, template: `%s · ${SITE.name}` },
    description: SITE.description(and),
    openGraph: { siteName: SITE.name, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#2340b0" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request's nonce makes every page render per request, which the nonce-based
  // Content-Security-Policy needs (Next.js adds the nonce to its scripts). Data stays cached: see Phase 5.
  await headers();
  const locale = await getLocale();
  return (
    <html lang={locale} dir={textDirection(locale)}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
