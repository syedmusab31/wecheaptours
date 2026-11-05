import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Results } from "@/components/site/Results";
import { categoryFromPath, CATEGORY_META } from "@/lib/rules";
import { parseSearchParams } from "@/lib/search-params";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = categoryFromPath((await params).category);
  if (!c) return {};
  return { title: `${CATEGORY_META[c].plural} in Egypt & Jordan`, description: INTRO[c] };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = categoryFromPath((await params).category);
  if (!c) notFound();
  const raw = await searchParams;
  const parsed = parseSearchParams({ ...raw, type: c });
  return (
    <Results
      params={parsed}
      raw={raw}
      basePath={`/${CATEGORY_META[c].path}`}
      heading={`${CATEGORY_META[c].plural} in Egypt & Jordan`}
      intro={INTRO[c]}
      lockCategory={c}
    />
  );
}
