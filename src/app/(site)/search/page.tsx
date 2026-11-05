import type { Metadata } from "next";
import { SearchResults } from "@/features/catalog/components/SearchResults";
import { getDestinationBySlug } from "@/features/destination/server/destination.service";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";
import { parseSearchParams } from "@/features/catalog/search-params";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);
  const dest = params.destination ? await getDestinationBySlug(params.destination) : null;
  const what =
    params.category && params.category !== "all"
      ? CATEGORY_META[params.category].plural
      : "Trips, cruises, transfers and stays";
  const heading = dest ? `${what} in ${dest.name}` : what;
  return <SearchResults params={params} raw={raw} basePath="/search" heading={heading} />;
}
