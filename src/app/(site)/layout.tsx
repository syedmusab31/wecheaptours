import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getDestinations } from "@/features/destination/server/destination.service";
import { getCurrency, getSettings } from "@/features/settings/server/settings.service";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, currency, destinations] = await Promise.all([
    getSettings(),
    getCurrency(),
    getDestinations(),
  ]);
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      {settings.demoMode && (
        <div className="bg-sun-tint text-ink px-4 py-2 text-center text-[0.8rem]">
          Demo site: photos, prices and reviews are samples and bookings are not real.
        </div>
      )}
      <SiteHeader currency={currency} whatsapp={settings.contact.whatsapp} />
      <main id="main">{children}</main>
      <SiteFooter destinations={destinations} contact={settings.contact} />
    </>
  );
}
