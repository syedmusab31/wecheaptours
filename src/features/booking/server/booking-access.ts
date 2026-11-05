import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Booking } from "@/server/db/schema";
import { siteUrl } from "@/lib/routes";
import { env } from "@/config/env";

/**
 * Guest booking links carry a token derived from the reference with a server secret (HMAC),
 * instead of a random token stored in the database. A database leak therefore exposes no
 * working links, and later emails (status changes, reminders) can still include the link.
 * Rotating BOOKING_LINK_SECRET invalidates every existing link.
 */
function secret(): string {
  const s = env.BOOKING_LINK_SECRET || env.AUTH_SECRET;
  if (!s || s.length < 32)
    throw new Error("BOOKING_LINK_SECRET (or AUTH_SECRET) must be at least 32 characters.");
  return s;
}

export function bookingAccessToken(reference: string): string {
  return createHmac("sha256", secret())
    .update(`booking-link:v1:${reference.toUpperCase()}`)
    .digest("base64url");
}

export function verifyBookingAccessToken(reference: string, token: string): boolean {
  const expected = Buffer.from(bookingAccessToken(reference));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Absolute link to the guest's private booking page */
export function bookingLink(booking: Pick<Booking, "reference">): string {
  return siteUrl(`/booking/${booking.reference}?t=${bookingAccessToken(booking.reference)}`);
}

/** Same link without the origin, for redirects */
export function bookingPath(booking: Pick<Booking, "reference">): string {
  const url = new URL(bookingLink(booking));
  return url.pathname + url.search;
}
