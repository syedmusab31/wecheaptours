import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";
import { getDestinationFromPrices, getDestinations } from "@/lib/queries";
import { getMoneyContext } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Destinations in Egypt & Jordan",
  description: "Cairo, Giza, Luxor, Aswan, the Red Sea, Petra, Wadi Rum and the Dead Sea: trips, transfers and stays in each.",
};

export default async function DestinationsPage() {
  const [destinations, prices, money] = await Promise.all([getDestinations(), getDestinationFromPrices(), getMoneyContext()]);
  return (
    <div className="mx-auto max-w-[1260px] px-4 pb-10 pt-10 sm:px-8">
      <h1 className="display-md text-3xl sm:text-[2.6rem]">Destinations</h1>
      <p className="mt-2 text-lg text-ink-soft">Everything we run, place by place.</p>
      {(["Egypt", "Jordan"] as const).map((country) => (
        <section key={country} className="mt-12">
          <h2 className="text-2xl font-bold">{country}</h2>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations
              .filter((d) => d.country === country)
              .map((d) => {
                const fp = prices.get(d.id);
                return (
                  <li key={d.id}>
                    <Link href={`/destinations/${d.slug}`} className="group block">
                      <span className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-mist">
                        <Image src={d.image} alt="" fill sizes="(max-width: 640px) 90vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      </span>
                      <span className="mt-3 flex items-baseline justify-between gap-3">
                        <span className="text-lg font-bold group-hover:text-lapis">{d.name}</span>
                        {fp && (
                          <span className="text-sm text-ink-mute">
                            {fp.count} options · from <b className="text-ink tabular">{formatMoney(fp.min, money.currency, money.rates)}</b>
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-ink-soft">{d.tagline}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
