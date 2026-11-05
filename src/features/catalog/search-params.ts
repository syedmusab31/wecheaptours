import type { Category } from "@/server/db/schema";
import type { SearchFilters } from "@/features/catalog/catalog.types";
import { CATEGORIES, categoryFromPath } from "@/features/catalog/catalog.constants";

type Raw = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : (v ?? "").split(",")).map((s) => s.trim()).filter(Boolean);
const num = (v: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export const SORTS = ["recommended", "cheapest", "rating", "shortest"] as const;

export function parseSearchParams(sp: Raw): SearchFilters {
  const t = one(sp.type);
  const category: Category | "all" = (CATEGORIES as string[]).includes(t)
    ? (t as Category)
    : (categoryFromPath(t) ?? "all");
  const country = one(sp.country);
  const sort = one(sp.sort) as SearchFilters["sort"];
  return {
    category,
    q: one(sp.q).slice(0, 80) || undefined,
    destination: one(sp.where).replace(/[^a-z0-9-]/g, "") || undefined,
    country: /^[A-Za-z][A-Za-z .-]{1,59}$/.test(country) ? country : undefined,
    minPrice: num(one(sp.min)),
    maxPrice: num(one(sp.max)),
    duration: many(sp.duration),
    tags: many(sp.tags)
      .filter((t) => /^[a-z0-9-]{1,40}$/.test(t))
      .slice(0, 10),
    privateOnly: one(sp.private) === "1",
    pickup: one(sp.pickup) === "1",
    guests: num(one(sp.guests)),
    sort: SORTS.includes(sort as (typeof SORTS)[number]) ? sort : "recommended",
  };
}
