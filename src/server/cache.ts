import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Data cache for public reads (docs: Phase 5.5). Pages render per request (the CSP nonce needs it),
 * but the catalogue they show comes from here, so most page views make no database query.
 * Writes clear only the tags they touch.
 *
 * Cached values pass through JSON: Dates come back as ISO strings and Maps are not allowed,
 * so cached functions return plain arrays and objects.
 */
export const CACHE_TAGS = {
  products: "products",
  destinations: "destinations",
  reviews: "reviews",
  settings: "settings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  key: string,
  opts: { tags: CacheTag[]; revalidateSeconds?: number },
): (...args: A) => Promise<R> {
  // Tests and scripts run outside Next.js, where there is no data cache
  // eslint-disable-next-line no-restricted-syntax -- set by Vitest itself, not app configuration
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return fn;
  return unstable_cache(fn, [key], { tags: opts.tags, revalidate: opts.revalidateSeconds ?? 3600 });
}

/** Clears cached reads after a write */
export function invalidate(...tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag);
}
