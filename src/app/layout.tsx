import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "WeCheapTours · Egypt & Jordan tours, cruises and transfers",
    template: "%s · WeCheapTours",
  },
  description:
    "Book day trips, Nile cruises, private transfers and vacation rentals across Egypt and Jordan. Clear prices, free cancellation and local support on WhatsApp.",
  openGraph: { siteName: "WeCheapTours", type: "website" },
};

export const viewport: Viewport = { themeColor: "#2340b0" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request's nonce makes every page render per request, which the nonce-based
  // Content-Security-Policy needs (Next.js adds the nonce to its scripts). Data stays cached: see Phase 5.
  await headers();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
