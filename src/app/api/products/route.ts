import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries";
import { parseSearchParams } from "@/lib/search-params";

export const runtime = "nodejs";

/** Public JSON search API — same filters as the /search page (for a future mobile app or partners). */
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
      priceUsd: Number(p.price),
      priceUnit: p.priceUnit,
      duration: p.durationLabel,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      image: p.images[0] ?? null,
    })),
  });
}
