import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/site/ProductCard";
import { getDestinationBySlug, searchProducts } from "@/lib/queries";
import { CATEGORIES, CATEGORY_META } from "@/lib/rules";
import { getMoneyContext } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getDestinationBySlug((await params).slug);
  if (!d) return {};
  return { title: `${d.name} tours, transfers & stays`, description: d.description };
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) notFound();
  const [items, money] = await Promise.all([searchProducts({ destination: slug }), getMoneyContext()]);
  const groups = CATEGORIES.map((c) => ({ c, list: items.filter((p) => p.category === c) })).filter((g) => g.list.length);

  return (
    <>
      <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-ink text-white sm:rounded-[36px]">
        <Image src={d.image} alt={d.name} fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
        <div className="mx-auto max-w-[1260px] px-4 pb-12 pt-32 sm:px-8 sm:pt-44">
          <p className="text-white/80">
            <Link href="/destinations" className="hover:underline">
              Destinations
            </Link>{" "}
            / {d.country}
          </p>
          <h1 className="display mt-2 text-5xl sm:text-7xl">{d.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/90">{d.tagline}</p>
        </div>
      </div>
      </section>

      <div className="mx-auto max-w-[1260px] px-4 sm:px-8">
        <p className="max-w-3xl pt-10 text-lg leading-relaxed text-ink-soft">{d.description}</p>
        {groups.length > 0 && (
          <nav aria-label="Jump to" className="mt-6 flex flex-wrap gap-2">
            {groups.map(({ c, list }) => (
              <a key={c} href={`#${c}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:border-ink-mute hover:text-ink">
                {CATEGORY_META[c].label} <span className="text-ink-mute">{list.length}</span>
              </a>
            ))}
          </nav>
        )}

        {groups.map(({ c, list }) => (
          <section key={c} id={c} className="mt-14 scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display-md text-2xl sm:text-3xl">
                {CATEGORY_META[c].plural} in {d.name}
              </h2>
              <Link href={`/search?type=${c}&where=${d.slug}`} className="shrink-0 font-semibold text-lapis hover:underline">
                Filter & sort
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} money={money} />
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-lg font-semibold">Trips in {d.name} are coming soon.</p>
            <Link href={`/enquire?topic=package&message=${encodeURIComponent(`I'd like to visit ${d.name}.`)}`} className="btn btn-primary mt-4">
              Ask us to plan it
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
