import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import {
  getDestinationFromPrices,
  getDestinations,
  getRegionLabel,
} from "@/features/destination/server/destination.service";
import { getMoneyContext } from "@/features/settings/server/settings.service";
import { distinct } from "@/lib/collections";

export const generateMetadata = async (): Promise<Metadata> => ({
  title: `Destinations in ${await getRegionLabel("&")}`,
  description:
    "Cairo, Giza, Luxor, Aswan, the Red Sea, Petra, Wadi Rum and the Dead Sea: trips, transfers and stays in each.",
});

export default async function DestinationsPage() {
  const [destinations, prices, money] = await Promise.all([
    getDestinations(),
    getDestinationFromPrices(),
    getMoneyContext(),
  ]);
  return (
    <div className="mx-auto max-w-[1260px] px-4 pt-10 pb-10 sm:px-8">
      <h1 className="display-md text-3xl sm:text-[2.6rem]">Destinations</h1>
      <p className="text-ink-soft mt-2 text-lg">Everything we run, place by place.</p>
      {distinct(destinations.map((d) => d.country)).map((country) => (
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
                      <span className="bg-mist relative block aspect-[16/10] overflow-hidden rounded-2xl">
                        <Image
                          src={d.image}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 90vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </span>
                      <span className="mt-3 flex items-baseline justify-between gap-3">
                        <span className="group-hover:text-lapis text-lg font-bold">{d.name}</span>
                        {fp && (
                          <span className="text-ink-mute text-sm">
                            {fp.count} options · from{" "}
                            <b className="text-ink tabular">
                              {formatCents(fp.minCents, money.currency, money.rates)}
                            </b>
                          </span>
                        )}
                      </span>
                      <span className="text-ink-soft mt-0.5 block">{d.tagline}</span>
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
