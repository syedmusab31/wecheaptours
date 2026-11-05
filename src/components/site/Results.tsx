import Link from "next/link";
import { Suspense } from "react";
import type { Category } from "@/db/schema";
import { categoryCounts, DURATION_BUCKETS, getAvailability, getDestinations, searchProducts, type SearchParams } from "@/lib/queries";
import { CATEGORIES, CATEGORY_META } from "@/lib/rules";
import { getMoneyContext } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { FilterPanel } from "./FilterPanel";
import { HeroSearch } from "./HeroSearch";
import { ProductCard } from "./ProductCard";

const SORT_LABELS: Record<NonNullable<SearchParams["sort"]>, string> = {
  recommended: "Recommended",
  cheapest: "Cheapest",
  rating: "Top rated",
  shortest: "Shortest",
};

type Raw = Record<string, string | string[] | undefined>;

function hrefWith(base: string, raw: Raw, patch: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v) q.set(k, v);
  for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export async function Results({
  params,
  raw,
  basePath,
  heading,
  intro,
  lockCategory,
}: {
  params: SearchParams;
  raw: Raw;
  basePath: string;
  heading: string;
  intro?: string;
  lockCategory?: Category;
}) {
  const [results, destinations, counts, money, available] = await Promise.all([
    searchProducts(params),
    getDestinations(),
    categoryCounts(params.destination),
    getMoneyContext(),
    getAvailability(),
  ]);
  const one = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);
  // Carry the searched date and party size through to the product page
  const carry = new URLSearchParams();
  for (const k of ["date", "end", "guests"]) if (one(k)) carry.set(k, one(k)!);
  const query = carry.toString() || undefined;
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const current = params.category ?? "all";
  const sort = params.sort ?? "recommended";
  const showDuration = !["stay", "transfer"].includes(current);
  const dest = destinations.find((d) => d.slug === params.destination);

  return (
    <div className="mx-auto max-w-[1260px] px-4 pb-10 pt-6 sm:px-8">
      <HeroSearch
        variant="compact"
        destinations={destinations.map((d) => ({ slug: d.slug, name: d.name, country: d.country }))}
        available={available}
        initial={{
          type: current === "all" ? lockCategory : current,
          where: params.destination,
          date: one("date"),
          end: one("end"),
          guests: params.guests,
        }}
      />
      <div className="mt-10 max-w-3xl">
        <h1 className="display-md text-[2rem] sm:text-[2.6rem]">{heading}</h1>
        {intro && <p className="mt-2 text-lg text-ink-soft">{intro}</p>}
      </div>

      {!lockCategory && (
        <nav aria-label="Categories" className="scroll-row -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {(["all", ...CATEGORIES] as const).map((c) => {
            const n = c === "all" ? total : counts[c] ?? 0;
            const on = current === c;
            return (
              <Link
                key={c}
                href={hrefWith(basePath, raw, { type: c === "all" ? null : c })}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  on ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink-mute hover:text-ink",
                )}
              >
                {c === "all" ? "Everything" : CATEGORY_META[c].label} <span className={cn("tabular", on ? "text-white/70" : "text-ink-mute")}>{n}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[250px_1fr]">
        <aside aria-label="Filters">
          <Suspense>
            <FilterPanel
              destinations={destinations.map((d) => ({ slug: d.slug, name: d.name, country: d.country }))}
              durations={Object.entries(DURATION_BUCKETS).map(([value, b]) => ({ value, label: b.label }))}
              showDuration={showDuration}
            />
          </Suspense>
        </aside>

        <section aria-label="Results" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-soft">
              <b className="text-ink tabular">{results.length}</b> {results.length === 1 ? "result" : "results"}
              {dest ? ` in ${dest.name}` : params.country ? ` in ${params.country}` : ""}
            </p>
            <div role="tablist" aria-label="Sort by" className="flex rounded-full bg-mist p-1">
              {(Object.keys(SORT_LABELS) as (keyof typeof SORT_LABELS)[]).map((s) => (
                <Link
                  key={s}
                  role="tab"
                  aria-selected={sort === s}
                  href={hrefWith(basePath, raw, { sort: s === "recommended" ? null : s })}
                  scroll={false}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold",
                    sort === s ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {SORT_LABELS[s]}
                </Link>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-line p-10 text-center">
              <p className="text-lg font-semibold">Nothing matches all of those filters.</p>
              <p className="mt-1 text-ink-soft">Remove a filter, or tell us what you're looking for and we'll arrange it.</p>
              <div className="mt-5 flex justify-center gap-3">
                <Link href={basePath} className="btn btn-ghost">
                  Clear filters
                </Link>
                <Link href="/enquire" className="btn btn-primary">
                  Ask us
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-4">
              {results.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} money={money} layout="row" query={query} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
