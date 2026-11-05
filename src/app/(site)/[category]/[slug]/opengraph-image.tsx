import { CATEGORY_META, PRICE_UNIT_LABEL } from "@/features/catalog/catalog.constants";
import { getProductBySlug } from "@/features/catalog/server/catalog.service";
import { formatCentsExact } from "@/lib/money";
import { OG_SIZE, photoDataUrl, shareCard } from "@/lib/og/share-card";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Trip photo, title and price";

/** The card shown when a product link is shared: photo, title, place, price and rating */
export default async function Image({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) return shareCard({ eyebrow: "WeCheapTours", title: "Tours, cruises and transfers", footer: "" });
  // Plain text: the image font has no star glyph
  const rating = p.reviewCount ? `rated ${Number(p.rating).toFixed(1)}/5 (${p.reviewCount} reviews)` : "";
  return shareCard({
    eyebrow: [CATEGORY_META[p.category].singular, p.destinationName].filter(Boolean).join(" · "),
    title: p.title,
    badge: `from ${formatCentsExact(p.priceCents, p.currency).replace(/\.00$/, "")}`,
    footer: [PRICE_UNIT_LABEL[p.priceUnit], rating].filter(Boolean).join(" · "),
    photo: await photoDataUrl(p.images[0]),
  });
}
