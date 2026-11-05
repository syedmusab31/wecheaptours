import Link from "next/link";
import type { Destination } from "@/db/schema";
import type { ContactSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { SubscribeForm } from "./SubscribeForm";

export function Footer({ destinations, contact }: { destinations: Destination[]; contact: ContactSettings }) {
  const egypt = destinations.filter((d) => d.country === "Egypt");
  const jordan = destinations.filter((d) => d.country === "Jordan");
  const col = "space-y-2.5 text-[0.92rem] text-white/65";
  const head = "mb-4 text-sm font-semibold text-white";
  const a = "transition-colors hover:text-white";
  return (
    <footer className="mt-28 px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="overflow-hidden rounded-[28px] bg-ink text-white sm:rounded-[36px]">
        <div className="mx-auto max-w-[1260px] px-6 sm:px-8">
          <div className="flex flex-col gap-6 border-b border-white/10 py-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="display-md text-[1.7rem] sm:text-[2rem]">Cheaper still, by email</p>
              <p className="mt-2 text-white/65">One email a month: last-minute cruise cabins and seasonal deals.</p>
            </div>
            <SubscribeForm />
          </div>

          <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Logo light />
              <p className="mt-5 max-w-xs text-[0.92rem] leading-relaxed text-white/65">
                Day trips, Nile cruises, transfers and stays across Egypt and Jordan, run by a local team.
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
                {contact.licence && <li className="pt-2 text-xs text-white/45">{contact.licence}</li>}
              </ul>
            </div>
            <div>
              <p className={head}>Egypt</p>
              <ul className={col}>
                {egypt.map((d) => (
                  <li key={d.id}>
                    <Link className={a} href={`/destinations/${d.slug}`}>
                      {d.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={head}>Jordan</p>
              <ul className={col}>
                {jordan.map((d) => (
                  <li key={d.id}>
                    <Link className={a} href={`/destinations/${d.slug}`}>
                      {d.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className={`${head} mt-9`}>Book</p>
              <ul className={col}>
                <li><Link className={a} href="/tours">Day trips</Link></li>
                <li><Link className={a} href="/cruises">Nile cruises</Link></li>
                <li><Link className={a} href="/transfers">Transfers</Link></li>
                <li><Link className={a} href="/stays">Stays</Link></li>
                <li><Link className={a} href="/packages">Packages</Link></li>
              </ul>
            </div>
            <div>
              <p className={head}>Help</p>
              <ul className={col}>
                <li><Link className={a} href="/my-booking">My booking</Link></li>
                <li><Link className={a} href="/booking-terms">Booking terms</Link></li>
                <li><Link className={a} href="/booking-terms#cancellation">Cancellation policy</Link></li>
                <li><Link className={a} href="/enquire">Contact us</Link></li>
                <li><Link className={a} href="/concierge">Concierge & events</Link></li>
                <li><Link className={a} href="/privacy">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-6 text-xs text-white/45">
            <span>© {new Date().getFullYear()} WeCheapTours. Prices in US dollars unless shown otherwise.</span>
            <span>Cash, card or bank transfer after confirmation.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
