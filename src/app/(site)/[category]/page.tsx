import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchResults } from "@/features/catalog/components/SearchResults";
import { categoryFromPath, CATEGORY_META } from "@/features/catalog/catalog.constants";
import { parseSearchParams } from "@/features/catalog/search-params";
import { getRegionLabel } from "@/features/destination/server/destination.service";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbList, graph } from "@/lib/seo";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const INTRO: Record<string, string> = {
  tour: "Guided day trips with hotel pickup, from the pyramids to Petra. Free cancellation up to 24 hours before.",
  cruise: "Five-star Nile cruises between Luxor and Aswan, full board with all sightseeing.",
  transfer: "Private cars and minivans with a driver. One price per vehicle, not per person.",
  stay: "Apartments, guesthouses and desert camps, picked by our team.",
  package: "Multi-day trips with hotels, guides, transfers and domestic flights arranged for you.",
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const c = categoryFromPath((await params).category);
  if (!c) return {};
  const filtered = Object.values(await searchParams).some((v) => v !== undefined && v !== "");
  return {
    title: `${CATEGORY_META[c].plural} in ${await getRegionLabel("&")}`,
    description: INTRO[c],
    // Every filter combination is the same listing to a search engine: one canonical URL
    alternates: { canonical: `/${CATEGORY_META[c].path}` },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = categoryFromPath((await params).category);
  if (!c) notFound();
  const raw = await searchParams;
  const parsed = parseSearchParams({ ...raw, type: c });
  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbList([
            { name: "Home", path: "/" },
            { name: CATEGORY_META[c].label, path: `/${CATEGORY_META[c].path}` },
          ]),
        )}
      />
      <SearchResults
        params={parsed}
        raw={raw}
        basePath={`/${CATEGORY_META[c].path}`}
        heading={`${CATEGORY_META[c].plural} in ${await getRegionLabel("&")}`}
        intro={INTRO[c]}
        lockCategory={c}
      />
    </>
  );
}
