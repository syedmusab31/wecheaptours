import type { Metadata } from "next";
import { Results } from "@/components/site/Results";
import { getDestinationBySlug } from "@/lib/queries";
import { CATEGORY_META } from "@/lib/rules";
import { parseSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);
  const dest = params.destination ? await getDestinationBySlug(params.destination) : null;
  const what = params.category && params.category !== "all" ? CATEGORY_META[params.category].plural : "Trips, cruises, transfers and stays";
  const heading = dest ? `${what} in ${dest.name}` : what;
  return <Results params={params} raw={raw} basePath="/search" heading={heading} />;
}
