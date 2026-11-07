import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DestinationView } from "@/features/destination/server/destination.service";
import { SITE } from "@/config/site";
import { groupBy } from "@/lib/collections";
import type { ContactSettings } from "@/features/settings/server/settings.service";
import { Logo } from "@/components/brand/Logo";
import { SubscribeForm } from "@/features/newsletter/components/SubscribeForm";

export function SiteFooter({
  destinations,
  contact,
  region,
}: {
  destinations: DestinationView[];
  contact: ContactSettings;
  region: string;
}) {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const byCountry = groupBy(destinations, (d) => d.country);
  const col = "space-y-2.5 text-[0.92rem] text-white/65";
  const head = "mb-4 text-sm font-semibold text-white";
  const a = "transition-colors hover:text-white";
  return (
    <footer className="mt-28 px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="bg-ink overflow-hidden rounded-[28px] text-white sm:rounded-[36px]">
        <div className="mx-auto max-w-[1260px] px-6 sm:px-8">
          <div className="flex flex-col gap-6 border-b border-white/10 py-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="display-md text-[1.7rem] sm:text-[2rem]">{t("newsletterTitle")}</p>
              <p className="mt-2 text-white/65">{t("newsletterText")}</p>
            </div>
            <SubscribeForm />
          </div>

          <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Logo light />
              <p className="mt-5 max-w-xs text-[0.92rem] leading-relaxed text-white/65">
                {SITE.tagline(region)}
              </p>
              <ul className="mt-6 space-y-1.5 text-[0.92rem] text-white/65">
                {contact.phone && <li>{contact.phone}</li>}
                {contact.email && (
                  <li>
                    <a className={a} href={`mailto:${contact.email}`}>
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.address && <li>{contact.address}</li>}
                {contact.licence && <li className="pt-2 text-xs text-white/60">{contact.licence}</li>}
              </ul>
            </div>
            {byCountry.map(([country, list], i) => (
              <div key={country}>
                <p className={head}>{country}</p>
                <ul className={col}>
                  {list.map((d) => (
                    <li key={d.id}>
                      <Link className={a} href={`/destinations/${d.slug}`}>
                        {d.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {i === byCountry.length - 1 && <BookLinks head={head} col={col} a={a} />}
              </div>
            ))}
            {byCountry.length === 0 && <BookLinks head={head} col={col} a={a} />}
            <div>
              <p className={head}>{t("help")}</p>
              <ul className={col}>
                <li>
                  <Link className={a} href="/my-booking">
                    {nav("myBooking")}
                  </Link>
                </li>
                <li>
                  <Link className={a} href="/booking-terms">
                    {t("bookingTerms")}
                  </Link>
                </li>
                <li>
                  <Link className={a} href="/booking-terms#cancellation">
                    {t("cancellationPolicy")}
                  </Link>
                </li>
                <li>
                  <Link className={a} href="/enquire">
                    {t("contactUs")}
                  </Link>
                </li>
                <li>
                  <Link className={a} href="/concierge">
                    {t("conciergeEvents")}
                  </Link>
                </li>
                <li>
                  <Link className={a} href="/privacy">
                    {t("privacy")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-6 text-xs text-white/60">
            <span>{t("copyright", { year: new Date().getFullYear() })}</span>
            <span>{t("payment")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function BookLinks({ head, col, a }: { head: string; col: string; a: string }) {
  const t = useTranslations();
  return (
    <>
      <p className={`${head} mt-9`}>{t("footer.book")}</p>
      <ul className={col}>
        <li>
          <Link className={a} href="/tours">
            {t("nav.tours")}
          </Link>
        </li>
        <li>
          <Link className={a} href="/cruises">
            {t("nav.cruises")}
          </Link>
        </li>
        <li>
          <Link className={a} href="/transfers">
            {t("nav.transfers")}
          </Link>
        </li>
        <li>
          <Link className={a} href="/stays">
            {t("nav.stays")}
          </Link>
        </li>
        <li>
          <Link className={a} href="/packages">
            {t("nav.packages")}
          </Link>
        </li>
      </ul>
    </>
  );
}
