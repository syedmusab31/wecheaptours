"use client";

/**
 * Custom next/image loader.
 * - Cloudinary URLs get on-the-fly resizing + automatic format/quality.
 * - Unsplash (demo photos) get its own resize parameters.
 * Anything else is returned unchanged.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    const t = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
    return src.replace("/upload/", `/upload/${t}/`);
  }
  if (src.includes("images.unsplash.com")) {
    const base = src.split("?")[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality ?? 70}`;
  }
  return src;
}
