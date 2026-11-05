/** Typed URL builders. Every link to a product, booking or admin page goes through here. */
import type { Category } from "@/server/db/schema";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}

export function productHref(product: { category: Category; slug: string }, query?: string): string {
  return `/${CATEGORY_META[product.category].path}/${product.slug}${query ? `?${query}` : ""}`;
}

export function checkoutHref(slug: string, query?: string): string {
  return `/book/${slug}${query ? `?${query}` : ""}`;
}

export const adminHref = {
  booking: (id: number) => `/admin/bookings/${id}`,
  product: (id: number) => `/admin/products/${id}`,
  destination: (id: number | "new") => `/admin/destinations/${id}`,
};
