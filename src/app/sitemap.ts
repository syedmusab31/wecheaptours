import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { destinations, products } from "@/db/schema";
import { CATEGORIES, CATEGORY_META } from "@/lib/rules";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ps, ds] = await Promise.all([
    db.select({ slug: products.slug, category: products.category, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true)),
    db.select({ slug: destinations.slug }).from(destinations).where(eq(destinations.isActive, true)),
  ]);
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...CATEGORIES.map((c) => ({ url: siteUrl(`/${CATEGORY_META[c].path}`), priority: 0.8 })),
    { url: siteUrl("/destinations"), priority: 0.7 },
    ...ds.map((d) => ({ url: siteUrl(`/destinations/${d.slug}`), priority: 0.7 })),
    ...ps.map((p) => ({ url: siteUrl(`/${CATEGORY_META[p.category].path}/${p.slug}`), lastModified: p.updatedAt, priority: 0.6 })),
    { url: siteUrl("/concierge"), priority: 0.5 },
    { url: siteUrl("/booking-terms"), priority: 0.3 },
  ];
}
