import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { validateEnv } from "./src/config/env";

// Fail fast: a missing or short secret stops `next build` / `next dev` with a readable list.
if (process.env.SKIP_ENV_VALIDATION !== "1") validateEnv();

/** Headers for every response. The Content-Security-Policy is set per request in middleware (nonce). */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Images are served straight from Cloudinary (and Unsplash for demo photos)
  // through a custom loader, so Vercel's image optimizer is not used.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  serverExternalPackages: ["pg", "bcryptjs", "nodemailer", "pino", "pino-pretty"],
  experimental: {
    // Enables forbidden() / unauthorized() for role checks on admin pages
    authInterrupts: true,
  },
};

// Source maps are uploaded to Sentry only when CI provides SENTRY_AUTH_TOKEN.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
