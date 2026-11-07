# 0006. Guests reach bookings through signed links, not accounts

- Status: Accepted
- Date: 2026-10

## Context

Most guests book once. Asking them to create an account and password adds friction at checkout and creates
credentials to protect. But a booking page shows names, phone numbers and pickup addresses, so it must not be
reachable by guessing a reference like `WCT-3D3F62`.

## Decision

The booking page URL is `/booking/{reference}?t={token}`, where the token is an HMAC-SHA256 of the reference with
`BOOKING_LINK_SECRET` (or `AUTH_SECRET` when that isn't set) (`features/booking/server/booking-access.ts`). Pages and guest actions (cancel, pay) check it in
constant time. The link is in every booking email. "Find my booking" takes a reference and the booking's email and, if both match, redirects to the signed
link. It's rate limited, so references can't be tried in bulk.

## Consequences

- No passwords for guests, and no guest data reachable by enumeration.
- Anyone with the link can see and cancel the booking, like a ticket. Links aren't revocable one by one; rotating
  `BOOKING_LINK_SECRET` invalidates all of them.
- The pages send `Referrer-Policy: strict-origin-when-cross-origin` so the token doesn't leak to other sites.
