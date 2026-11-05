import { NextResponse } from "next/server";
import { searchProducts } from "@/features/catalog/server/catalog.service";
import { parseSearchParams } from "@/features/catalog/search-params";

export const runtime = "nodejs";

/** Public JSON search API: same filters as the /search page (for a mobile app or partners). */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const results = await searchProducts(parseSearchParams(sp));
  return NextResponse.json({
    count: results.length,
    results: results.map((p) => ({
      id: p.id,
      slug: p.slug,
      category: p.category,
      title: p.title,
      summary: p.summary,
      destination: p.destinationName,
      country: p.country,
      countryCode: p.countryCode,
      priceCents: p.priceCents,
      currency: p.currency,
      priceUnit: p.priceUnit,
      duration: p.durationLabel,
      durationMinutes: p.durationMinutes,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      image: p.images[0] ?? null,
    })),
  });
}
