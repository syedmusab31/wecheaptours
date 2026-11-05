import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getDestinations } from "@/lib/queries";
import { getCurrency, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, currency, destinations] = await Promise.all([getSettings(), getCurrency(), getDestinations()]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      {settings.demoMode && (
        <div className="bg-sun-tint px-4 py-2 text-center text-[0.8rem] text-ink">
          Demo site: photos, prices and reviews are samples and bookings are not real.
        </div>
      )}
      <Header currency={currency} whatsapp={settings.contact.whatsapp} />
      <main id="main">{children}</main>
      <Footer destinations={destinations} contact={settings.contact} />
    </>
  );
}
