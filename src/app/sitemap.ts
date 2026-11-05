import type { MetadataRoute } from "next";
import { listProductsForSitemap } from "@/features/catalog/server/catalog.service";
import { listDestinationsForSitemap } from "@/features/destination/server/destination.service";
import { CATEGORIES, CATEGORY_META } from "@/features/catalog/catalog.constants";
import { siteUrl } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ps, ds] = await Promise.all([listProductsForSitemap(), listDestinationsForSitemap()]);
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...CATEGORIES.map((c) => ({ url: siteUrl(`/${CATEGORY_META[c].path}`), priority: 0.8 })),
    { url: siteUrl("/destinations"), priority: 0.7 },
    ...ds.map((d) => ({ url: siteUrl(`/destinations/${d.slug}`), priority: 0.7 })),
    ...ps.map((p) => ({
      url: siteUrl(`/${CATEGORY_META[p.category].path}/${p.slug}`),
      lastModified: p.updatedAt,
      priority: 0.6,
    })),
    { url: siteUrl("/concierge"), priority: 0.5 },
    { url: siteUrl("/booking-terms"), priority: 0.3 },
  ];
}
