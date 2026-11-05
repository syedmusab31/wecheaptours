import type { Category } from "@/db/schema";
import type { SearchParams } from "./queries";
import { CATEGORIES, categoryFromPath } from "./rules";

type Raw = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : (v ?? "").split(",")).map((s) => s.trim()).filter(Boolean);
const num = (v: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export const SORTS = ["recommended", "cheapest", "rating", "shortest"] as const;

export function parseSearchParams(sp: Raw): SearchParams {
  const t = one(sp.type);
  const category: Category | "all" =
    (CATEGORIES as string[]).includes(t) ? (t as Category) : categoryFromPath(t) ?? "all";
  const country = one(sp.country);
  const sort = one(sp.sort) as SearchParams["sort"];
  return {
    category,
    q: one(sp.q).slice(0, 80) || undefined,
    destination: one(sp.where).replace(/[^a-z0-9-]/g, "") || undefined,
    country: country === "Egypt" || country === "Jordan" ? country : undefined,
    minPrice: num(one(sp.min)),
    maxPrice: num(one(sp.max)),
    duration: many(sp.duration),
    tags: many(sp.tags),
    privateOnly: one(sp.private) === "1",
    pickup: one(sp.pickup) === "1",
    guests: num(one(sp.guests)),
    sort: SORTS.includes(sort as (typeof SORTS)[number]) ? sort : "recommended",
  };
}
