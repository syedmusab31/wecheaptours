import type { Category, PriceUnit } from "@/server/db/schema";

export const CATEGORY_META: Record<
  Category,
  { label: string; plural: string; path: string; singular: string }
> = {
  tour: { label: "Day trips", plural: "Day trips & excursions", path: "tours", singular: "Day trip" },
  cruise: { label: "Nile cruises", plural: "Nile cruises", path: "cruises", singular: "Nile cruise" },
  transfer: {
    label: "Transfers",
    plural: "Transfers & private cars",
    path: "transfers",
    singular: "Transfer",
  },
  stay: { label: "Stays", plural: "Vacation rentals", path: "stays", singular: "Stay" },
  package: { label: "Packages", plural: "Multi-day packages", path: "packages", singular: "Package" },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export function categoryFromPath(path: string): Category | null {
  const hit = CATEGORIES.find((c) => CATEGORY_META[c].path === path);
  return hit ?? null;
}

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  person: "per person",
  group: "per group",
  night: "per night",
  vehicle: "per vehicle",
};

/** Duration filters on the search page, in hours */
export const DURATION_BUCKETS: Record<string, { label: string; min: number; max: number }> = {
  short: { label: "Up to 3 hours", min: 0, max: 3 },
  half: { label: "4 to 6 hours", min: 4, max: 6 },
  full: { label: "7 to 14 hours", min: 7, max: 14 },
  multi: { label: "Overnight or longer", min: 15, max: 100_000 },
};
