import Link from "next/link";
import { Menu, MessageCircle, TicketCheck } from "lucide-react";
import type { Currency } from "@/lib/money";
import { CurrencySelect } from "@/components/layout/CurrencySelect";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "/tours", label: "Day trips" },
  { href: "/cruises", label: "Nile cruises" },
  { href: "/transfers", label: "Transfers" },
  { href: "/stays", label: "Stays" },
  { href: "/packages", label: "Packages" },
  { href: "/concierge", label: "Concierge" },
];

export function SiteHeader({ currency, whatsapp }: { currency: Currency; whatsapp: string }) {
  return (
    <header className="border-line/70 sticky top-0 z-40 border-b bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1260px] items-center gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="WeCheapTours home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="mx-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-ink-soft hover:bg-mist hover:text-ink rounded-full px-3.5 py-2 text-[0.92rem] font-medium transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <CurrencySelect value={currency} />
          <Link
            href="/my-booking"
            className="text-ink hover:bg-mist hidden items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors sm:inline-flex"
          >
            <TicketCheck size={17} aria-hidden /> My booking
          </Link>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener"
              aria-label="Chat on WhatsApp"
              className="bg-ink hidden h-10 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-semibold text-white transition-colors hover:bg-[#1c2c4d] md:inline-flex"
            >
              <MessageCircle size={17} aria-hidden /> Chat
            </a>
          )}
          <details className="relative lg:hidden">
            <summary className="border-line flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border [&::-webkit-details-marker]:hidden">
              <Menu size={19} aria-hidden />
              <span className="sr-only">Menu</span>
            </summary>
            <nav
              aria-label="Mobile"
              className="border-line absolute top-12 right-0 w-64 rounded-2xl border bg-white p-2 shadow-[var(--shadow-float)]"
            >
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="hover:bg-mist block rounded-xl px-3 py-2.5 font-medium"
                >
                  {n.label}
                </Link>
              ))}
              <Link href="/destinations" className="hover:bg-mist block rounded-xl px-3 py-2.5 font-medium">
                Destinations
              </Link>
              <Link
                href="/my-booking"
                className="border-line text-lapis hover:bg-mist mt-1 block rounded-xl border-t px-3 py-2.5 font-semibold"
              >
                My booking
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
