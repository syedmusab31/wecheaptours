import { getRegionLabel } from "@/features/destination/server/destination.service";
import { OG_SIZE, shareCard } from "@/lib/og/share-card";

export const runtime = "nodejs";
// Rendered on request: building it would need the database at build time
export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "WeCheapTours: tours, cruises, transfers and stays";

/** Default share image for every page without its own */
export default async function Image() {
  const region = await getRegionLabel("&");
  return shareCard({
    eyebrow: `${region} for less`,
    title: "Day trips, Nile cruises, transfers and stays",
    footer: "Free cancellation · local team on WhatsApp",
  });
}
