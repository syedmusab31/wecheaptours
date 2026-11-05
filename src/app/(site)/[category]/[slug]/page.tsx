import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Clock, Globe, MapPin, Users, X } from "lucide-react";
import { BookingPanel } from "@/components/site/BookingPanel";
import { Gallery } from "@/components/site/Gallery";
import { ProductCard, productHref, Rating } from "@/components/site/ProductCard";
import { getProductBySlug, getProductReviews, getRelated } from "@/lib/queries";
import { cancellationText, categoryFromPath, CATEGORY_META, CHILD_RULES, paymentText } from "@/lib/rules";
import { getMoneyContext } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

type Props = {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    openGraph: { title: p.title, description: p.summary, images: p.images[0] ? [p.images[0]] : [] },
    alternates: { canonical: productHref(p) },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { category, slug } = await params;
  const c = categoryFromPath(category);
  if (!c) notFound();
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  if (p.category !== c) redirect(productHref(p));

  const sp = await searchParams;
  const [money, reviews, related] = await Promise.all([getMoneyContext(), getProductReviews(p.id), getRelated(p)]);
  const meta = CATEGORY_META[p.category];
  const facts = [
    { icon: Clock, text: p.durationLabel },
    { icon: Users, text: p.isPrivate ? `Private, up to ${p.maxGuests}` : `Up to ${p.maxGuests} guests` },
    { icon: Globe, text: p.languages.slice(0, 3).join(", ") + (p.languages.length > 3 ? ` +${p.languages.length - 3}` : "") },
    ...(p.pickupIncluded && p.category !== "stay" ? [{ icon: MapPin, text: "Hotel pickup included" }] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary,
    image: p.images,
    url: siteUrl(productHref(p)),
    offers: { "@type": "Offer", priceCurrency: "USD", price: Number(p.price), availability: "https://schema.org/InStock" },
    ...(p.reviewCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(p.rating), reviewCount: p.reviewCount } } : {}),
  };

  return (
    <div className="mx-auto max-w-[1260px] px-4 pb-24 pt-6 sm:px-8 lg:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-mute">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/${meta.path}`} className="hover:text-ink">{meta.label}</Link></li>
          {p.destinationSlug && (
            <>
              <li aria-hidden>/</li>
              <li><Link href={`/destinations/${p.destinationSlug}`} className="hover:text-ink">{p.destinationName}</Link></li>
            </>
          )}
        </ol>
      </nav>

      <h1 className="display-md mt-4 max-w-4xl text-[2rem] sm:text-[2.8rem]">{p.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
        <Rating rating={Number(p.rating)} count={p.reviewCount} />
        <span>
          {p.destinationName}, {p.country}
        </span>
        <span>{meta.singular}</span>
      </div>

      <div className="mt-6">
        <Gallery images={p.images} title={p.title} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_390px] lg:gap-16">
        <div className="min-w-0">
          <ul className="flex flex-wrap gap-2 border-b border-line pb-7">
            {facts.map((f) => (
              <li key={f.text} className="inline-flex items-center gap-2 rounded-full bg-mist px-3.5 py-2 text-[0.92rem] font-medium">
                <f.icon size={16} className="text-lapis" aria-hidden /> {f.text}
              </li>
            ))}
          </ul>

          <section className="py-8">
            <p className="text-lg leading-relaxed">{p.summary}</p>
            <p className="mt-4 leading-relaxed text-ink-soft">{p.description}</p>
          </section>

          {p.highlights.length > 0 && (
            <section className="border-t border-line py-8">
              <h2 className="text-[1.35rem] font-semibold">Highlights</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <Check size={18} className="mt-0.5 shrink-0 text-faience" aria-hidden /> {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.itinerary.length > 0 && (
            <section className="border-t border-line py-8">
              <h2 className="text-[1.35rem] font-semibold">{p.durationHours > 24 ? "Day by day" : "Itinerary"}</h2>
              <ol className="relative mt-5 space-y-5 border-l-2 border-lapis/25 pl-6">
                {p.itinerary.map((s, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-lapis ring-2 ring-lapis/25" />
                    <p className="font-semibold">
                      {s.time && <span className="mr-2 text-lapis tabular">{s.time}</span>}
                      {s.title}
                    </p>
                    {s.detail && <p className="mt-0.5 text-ink-soft">{s.detail}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(p.included.length > 0 || p.excluded.length > 0) && (
            <section className="grid gap-8 border-t border-line py-8 sm:grid-cols-2">
              <div>
                <h2 className="text-[1.35rem] font-semibold">Included</h2>
                <ul className="mt-4 space-y-2">
                  {p.included.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      <Check size={18} className="mt-0.5 shrink-0 text-faience" aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-[1.35rem] font-semibold">Not included</h2>
                <ul className="mt-4 space-y-2 text-ink-soft">
                  {p.excluded.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      <X size={18} className="mt-0.5 shrink-0 text-ink-mute" aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="border-t border-line py-8">
            <h2 className="text-[1.35rem] font-semibold">Good to know</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              {p.meetingPoint && (
                <div>
                  <dt className="font-semibold">{p.category === "stay" ? "Check-in" : "Meeting point"}</dt>
                  <dd className="mt-1 text-ink-soft">{p.meetingPoint}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">Cancellation</dt>
                <dd className="mt-1 text-ink-soft">{cancellationText(p.category)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Payment</dt>
                <dd className="mt-1 text-ink-soft">{paymentText(p.category)}</dd>
              </div>
              {p.priceUnit === "person" && (
                <div>
                  <dt className="font-semibold">Children</dt>
                  <dd className="mt-1 text-ink-soft">
                    Ages 0–{CHILD_RULES.infantMaxAge} free, ages {CHILD_RULES.infantMaxAge + 1}–{CHILD_RULES.childMaxAge} pay{" "}
                    {CHILD_RULES.childShare * 100}% of the adult price.
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-6 text-sm text-ink-mute">
              Have a question first?{" "}
              <Link href={`/enquire?topic=product&product=${p.id}`} className="font-semibold text-lapis hover:underline">
                Ask us about this {meta.singular.toLowerCase()}
              </Link>
            </p>
          </section>

          <section className="border-t border-line py-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[1.35rem] font-semibold">Reviews</h2>
              <Rating rating={Number(p.rating)} count={p.reviewCount} />
            </div>
            {reviews.length === 0 ? (
              <p className="mt-3 text-ink-soft">No reviews yet. Guests can leave one after their trip.</p>
            ) : (
              <ul className="mt-5 space-y-6">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <p aria-label={`${r.rating} out of 5 stars`} className="text-sun">
                      {"★".repeat(r.rating)}
                      <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                    </p>
                    <p className="mt-1 font-semibold">{r.title}</p>
                    <p className="mt-1 text-ink-soft">{r.body}</p>
                    <p className="mt-1.5 text-sm text-ink-mute">
                      {r.authorName}, {r.authorCountry} · {r.travelMonth}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start scroll-mt-24" id="book">
          <BookingPanel
            product={{
              id: p.id,
              slug: p.slug,
              path: meta.path,
              category: p.category,
              priceUnit: p.priceUnit,
              price: Number(p.price),
              minGuests: p.minGuests,
              maxGuests: p.maxGuests,
              minNights: p.minNights,
            }}
            currency={money.currency}
            rates={money.rates}
            initial={{ date: sp.date, end: sp.end, guests: sp.guests ? Number(sp.guests) : undefined }}
          />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12 border-t border-line pt-10">
          <h2 className="display-md text-[1.8rem] sm:text-[2.2rem]">You might also like</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} money={money} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile: jump to booking panel */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
        <a href="#book" className="btn btn-primary w-full py-3.5">
          Check dates and price
        </a>
      </div>
    </div>
  );
}
