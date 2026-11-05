import type { Category, Product } from "@/server/db/schema";

export type ProductWithDest = Product & {
  destinationName: string | null;
  destinationSlug: string | null;
  /** Country name, e.g. "Egypt" */
  country: string | null;
  countryCode: string | null;
};

export type SortOrder = "recommended" | "cheapest" | "rating" | "shortest";

/** Filters shared by the /search page and the public products API */
export type SearchFilters = {
  category?: Category | "all";
  q?: string;
  /** destination slug */
  destination?: string;
  /** Country code ("EG") or name ("Egypt") */
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  /** keys of DURATION_BUCKETS */
  duration?: string[];
  tags?: string[];
  privateOnly?: boolean;
  pickup?: boolean;
  guests?: number;
  sort?: SortOrder;
};
