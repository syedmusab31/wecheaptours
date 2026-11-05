"use client";

import { useEffect } from "react";

/**
 * Vercel Web Analytics (page views) and Speed Insights (real-user Core Web Vitals), both free on the
 * Hobby plan once turned on in the Vercel dashboard. Cookieless, served from this site's own
 * /_vercel/ path, so the CSP needs no change. Loads only on Vercel deployments.
 * Funnel events go to PostHog instead (see src/lib/analytics.ts): custom events in Vercel need Pro.
 */
export function Analytics() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_ANALYTICS === "off") return;
    for (const src of ["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"]) {
      if (document.querySelector(`script[src="${src}"]`)) continue;
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}
