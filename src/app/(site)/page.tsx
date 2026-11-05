import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, Headset, Star, Wallet } from "lucide-react";
import { Carousel } from "@/components/ui/Carousel";
import { ExploreMap, type MapPoint } from "@/features/destination/components/ExploreMap";
import { HeroSearch } from "@/features/catalog/components/HeroSearch";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { productHref } from "@/lib/routes";
import { IMG } from "@/features/destination/destination-images";
import { formatMoney } from "@/lib/money";
import { getAvailability, getByCategory, getFeatured } from "@/features/catalog/server/catalog.service";
import { getDestinationFromPrices, getDestinations } from "@/features/destination/server/destination.service";
import { getLatestReviews, getReviewStats } from "@/features/review/server/review.service";
import { getMoneyContext } from "@/features/settings/server/settings.service";

function SectionHeading({
  title,
  text,
  href,
  cta,
}: {
  title: string;
  text?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="max-w-2xl">
        <h2 className="display-md text-[2rem] sm:text-[2.6rem]">{title}</h2>
        {text && <p className="text-ink-soft mt-3 text-lg">{text}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="link-arrow shrink-0">
          {cta} <ArrowRight size={17} aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** Stops shown on each cruise's route line */
function cruiseStops(slug: string): string[] {
  if (slug.includes("roundtrip")) return ["Luxor", "Edfu", "Aswan", "Kom Ombo", "Luxor"];
  if (slug.includes("aswan-to-luxor")) return ["Aswan", "Kom Ombo", "Edfu", "Luxor"];
  return ["Luxor", "Esna", "Edfu", "Kom Ombo", "Aswan"];
}

export default async function HomePage() {
  const [
    money,
    destinations,
    fromPrices,
    featured,
    cruises,
    transfers,
    stays,
    packages,
    reviews,
    available,
    stats,
  ] = await Promise.all([
    getMoneyContext(),
    getDestinations(),
    getDestinationFromPrices(),
    getFeatured(10),
    getByCategory("cruise", 3),
    getByCategory("transfer", 1),
    getByCategory("stay", 1),
    getByCategory("package", 1),
    getLatestReviews(3),
    getAvailability(),
    getReviewStats(),
  ]);
  const fmt = (usd: number) => formatMoney(usd, money.currency, money.rates);

  const points: MapPoint[] = destinations.map((d) => {
    const fp = fromPrices.get(d.id);
    return {
      slug: d.slug,
      name: d.name,
      country: d.country,
      tagline: d.tagline,
      image: d.image,
      count: fp?.count ?? 0,
      fromLabel: fp ? fmt(fp.minCents / 100) : null,
    };
  });

  const avg = stats.avg;

  const bento = [
    {
      title: "Private transfers",
      text: "A driver waiting in arrivals. One price per car, not per person.",
      href: "/transfers",
      image: IMG.car[3],
      from: transfers[0] ? fmt(transfers[0].priceCents / 100) : null,
      cls: "lg:col-span-2 lg:row-span-2 min-h-[320px] lg:min-h-[520px]",
      big: true,
    },
    {
      title: "Apartments & stays",
      text: "Pyramid views, Nile gardens, desert domes.",
      href: "/stays",
      image: IMG.room[0],
      from: stays[0] ? fmt(stays[0].priceCents / 100) : null,
      cls: "lg:col-span-2 min-h-[250px]",
    },
    {
      title: "Packages",
      text: "Hotels, guides and flights, arranged.",
      href: "/packages",
      image: IMG.petra[0],
      from: packages[0] ? fmt(packages[0].priceCents / 100) : null,
      cls: "min-h-[250px]",
    },
    {
      title: "Concierge & events",
      text: "Birthdays on the Nile, groceries, laundry.",
      href: "/concierge",
      image: IMG.nile[0],
      from: null,
      cls: "min-h-[250px]",
    },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="px-2 pt-2 sm:px-3 sm:pt-3">
        <div className="bg-ink relative isolate flex min-h-[640px] flex-col justify-end overflow-hidden rounded-[28px] text-white sm:rounded-[36px] lg:min-h-[720px]">
          <Image
            src={IMG.giza[4]}
            alt="Camels crossing the desert in front of the three pyramids of Giza"
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover object-[center_62%]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(15,27,51,0.35)_0%,rgba(15,27,51,0)_30%,rgba(15,27,51,0.15)_55%,rgba(15,27,51,0.82)_100%)]" />

          <span className="glass absolute top-5 right-5 hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-white sm:inline-flex">
            Giza Plateau, Egypt
          </span>

          <div className="mx-auto w-full max-w-[1260px] px-4 pb-6 sm:px-8 sm:pb-10">
            <h1 className="display rise max-w-4xl text-[3rem] sm:text-[4.6rem] lg:text-[6.2rem]">
              Egypt &amp; Jordan,
              <br />
              for less.
            </h1>
            <p className="rise-2 mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              Day trips, Nile cruises, transfers and stays from a local team. Send a request in two minutes;
              pay nothing until we confirm.
            </p>
            <HeroSearch
              className="rise-3 mt-8 sm:mt-10"
              destinations={destinations.map((d) => ({ slug: d.slug, name: d.name, country: d.country }))}
              available={available}
            />
          </div>
        </div>
      </section>

      {/* ── Promises ─────────────────────────────────────────── */}
      <section aria-label="Why book with us" className="mx-auto max-w-[1260px] px-4 pt-10 sm:px-8">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          {[
            { icon: CalendarCheck, title: "Free cancellation", text: "Up to 24 hours before any day trip" },
            { icon: Wallet, title: "Pay after we confirm", text: "No card needed to request" },
            { icon: BadgeCheck, title: "Licensed local guides", text: "Egyptologists and Jordanian guides" },
            { icon: Headset, title: "Real people on WhatsApp", text: "Every day, 8:00 to 23:00" },
          ].map((p) => (
            <li key={p.title} className="flex items-start gap-3.5">
              <span className="bg-mist text-lapis flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <p.icon size={19} aria-hidden />
              </span>
              <span>
                <span className="block text-[0.95rem] font-semibold">{p.title}</span>
                <span className="text-ink-mute block text-sm">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Explore map ──────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1260px] px-4 sm:mt-28 sm:px-8">
        <SectionHeading
          title="Explore by price"
          text="Every place we go, with the cheapest way to see it. Pick a pin."
          href="/destinations"
          cta="All destinations"
        />
        <div className="mt-9">
          <ExploreMap points={points} />
        </div>
      </section>

      {/* ── Most booked ──────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1260px] px-4 sm:mt-28 sm:px-8">
        <Carousel
          label="most booked trips"
          heading={
            <>
              <h2 className="display-md text-[2rem] sm:text-[2.6rem]">Most booked</h2>
              <p className="text-ink-soft mt-3 text-lg">
                The trips guests pick first.{" "}
                <Link
                  href="/search?sort=rating"
                  className="text-ink decoration-line hover:decoration-ink font-semibold underline decoration-2 underline-offset-4"
                >
                  See all
                </Link>
              </p>
            </>
          }
        >
          {featured.map((p) => (
            <div key={p.id} className="w-[80%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%_-_15px)]">
              <ProductCard product={p} money={money} />
            </div>
          ))}
        </Carousel>
      </section>

      {/* ── Nile cruises ─────────────────────────────────────── */}
      <section className="bg-mist mt-24 py-20 sm:mt-28 sm:py-24">
        <div className="mx-auto grid max-w-[1260px] grid-cols-1 gap-10 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[var(--radius-panel)] p-7 text-white sm:p-9">
            <Image
              src={IMG.nile[1]}
              alt="A cruise boat on the Nile"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="-z-10 object-cover"
            />
            <div className="from-ink/85 via-ink/20 absolute inset-0 -z-10 bg-gradient-to-t to-transparent" />
            <h2 className="display-md text-[2rem] sm:text-[2.6rem]">Sail the Nile</h2>
            <p className="mt-3 max-w-md text-white/85">
              Five-star boats between Luxor and Aswan. Every meal on board and an Egyptologist at every
              temple.
            </p>
            <Link href="/cruises" className="btn text-ink mt-6 self-start bg-white hover:bg-white/90">
              Compare cruises <ArrowRight size={17} aria-hidden />
            </Link>
          </div>

          <ul className="flex flex-col gap-4">
            {cruises.map((c) => {
              const stops = cruiseStops(c.slug);
              return (
                <li key={c.id}>
                  <Link
                    href={productHref(c)}
                    className="group block rounded-[var(--radius-card)] bg-white p-6 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="group-hover:text-lapis font-semibold">{c.durationLabel}</p>
                        <p className="text-ink-mute mt-0.5 text-sm">
                          {stops[0]} to {stops.at(-1)}
                          {stops[0] === stops.at(-1) ? " (roundtrip)" : ""}
                        </p>
                      </div>
                      <p className="text-right">
                        <span className="stamp text-lg font-extrabold">{fmt(c.priceCents / 100)}</span>
                        <span className="text-ink-mute mt-1 block text-xs">per person</span>
                      </p>
                    </div>
                    {/* Route line */}
                    <ol
                      className="before:bg-lapis/20 relative mt-6 flex justify-between before:absolute before:top-[5px] before:right-1.5 before:left-1.5 before:h-[2px] before:content-['']"
                      aria-label="Stops"
                    >
                      {stops.map((s, i) => {
                        const end = i === 0 || i === stops.length - 1;
                        return (
                          <li
                            key={i}
                            className={`relative flex flex-col ${i === 0 ? "items-start" : i === stops.length - 1 ? "items-end" : "items-center"}`}
                          >
                            <span
                              aria-hidden
                              className={`border-lapis h-3 w-3 rounded-full border-2 ${end ? "bg-lapis" : "bg-white"}`}
                            />
                            <span
                              className={`mt-2 text-xs ${end ? "text-ink font-semibold" : "text-ink-mute"}`}
                            >
                              {s}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Bento: more ways to travel ───────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1260px] px-4 sm:mt-28 sm:px-8">
        <SectionHeading
          title="Everything else, sorted"
          text="Get from the airport, find a place to stay, or hand us the whole trip."
        />
        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {bento.map((b) => (
            <Link
              key={b.title}
              href={b.href}
              className={`group relative isolate flex flex-col justify-end overflow-hidden rounded-[var(--radius-panel)] p-6 text-white sm:p-7 ${b.cls}`}
            >
              <Image
                src={b.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 90vw, 50vw"
                className="-z-10 object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="from-ink/85 via-ink/25 absolute inset-0 -z-10 bg-gradient-to-t to-transparent" />
              {b.from && (
                <span className="text-ink absolute top-5 left-5 rounded-full bg-white px-3 py-1 text-xs font-semibold">
                  from <b className="tabular">{b.from}</b>
                </span>
              )}
              <span className={b.big ? "display-md text-[1.9rem] sm:text-[2.3rem]" : "text-xl font-semibold"}>
                {b.title}
              </span>
              <span className={`mt-1.5 text-white/80 ${b.big ? "max-w-sm text-lg" : "text-sm"}`}>
                {b.text}
              </span>
              <span className="group-hover:text-ink mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors group-hover:bg-white">
                <ArrowRight size={18} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How booking works (a real sequence) ──────────────── */}
      <section className="mx-auto mt-24 max-w-[1260px] px-4 sm:mt-28 sm:px-8">
        <SectionHeading
          title="How booking works"
          text="No card, no deposit to send a request. You only pay once we've confirmed."
        />
        <ol className="lg:before:bg-line relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:before:absolute lg:before:top-5 lg:before:right-0 lg:before:left-0 lg:before:h-px lg:before:content-['']">
          {[
            ["Pick a trip and a date", "Prices up front, including what isn't included."],
            ["Send a request", "Name, phone and pickup. Takes two minutes."],
            ["We confirm within 24 hours", "By email and WhatsApp, usually within the hour."],
            ["Pay on confirmation or on the day", "Cash, card or bank transfer."],
          ].map(([title, text], i) => (
            <li key={title} className="relative">
              <span className="bg-ink tabular relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-8 ring-white">
                {i + 1}
              </span>
              <p className="mt-5 text-lg font-semibold">{title}</p>
              <p className="text-ink-soft mt-1">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Reviews ──────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="mx-auto mt-24 max-w-[1260px] px-4 sm:mt-28 sm:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr] lg:gap-12">
            <div>
              <h2 className="display-md text-[2rem] sm:text-[2.6rem]">Reviews</h2>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="display tabular text-6xl">{avg.toFixed(1)}</span>
                <span className="text-ink-mute">out of 5</span>
              </p>
              <p className="mt-2 flex gap-0.5" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={i < Math.round(avg) ? "fill-sun text-sun" : "text-line"}
                  />
                ))}
              </p>
              <p className="text-ink-mute mt-3 text-sm">From {stats.count} published guest reviews</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {reviews.map(({ review: r, productTitle, productSlug, category }) => (
                <figure
                  key={r.id}
                  className="border-line flex flex-col rounded-[var(--radius-card)] border p-6"
                >
                  <p className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={i < r.rating ? "fill-sun text-sun" : "text-line"}
                        aria-hidden
                      />
                    ))}
                  </p>
                  <blockquote className="mt-4 flex-1">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-ink-soft mt-1.5">{r.body}</p>
                  </blockquote>
                  <figcaption className="border-line mt-6 border-t pt-4 text-sm">
                    <span className="font-semibold">{r.authorName}</span>
                    <span className="text-ink-mute"> · {r.authorCountry}</span>
                    <Link
                      href={productHref({ category, slug: productSlug })}
                      className="text-ink-mute hover:text-lapis mt-0.5 block truncate"
                    >
                      {productTitle}
                    </Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Custom trip CTA ──────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1260px] px-4 sm:mt-28 sm:px-8">
        <div className="bg-lapis relative isolate overflow-hidden rounded-[var(--radius-panel)] px-7 py-14 text-white sm:px-14 sm:py-20">
          <Image
            src={IMG.wadirum[3]}
            alt=""
            fill
            sizes="100vw"
            className="-z-10 object-cover opacity-35 mix-blend-luminosity"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#2443c8_20%,rgba(36,67,200,0.55)_70%,rgba(36,67,200,0.2))]" />
          <h2 className="display max-w-2xl text-[2.4rem] sm:text-[3.6rem]">Want something we don't list?</h2>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            A custom route, a family reunion in Luxor, a dinner facing the pyramids. Tell us and we'll send a
            price, usually the same day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/enquire?topic=package" className="btn btn-sun">
              Plan a custom trip
            </Link>
            <Link href="/concierge" className="btn glass text-white hover:bg-white/25">
              Concierge & events
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
