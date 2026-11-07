# 0005. Money as integer cents in USD; prices computed on the server

- Status: Accepted
- Date: 2026-10

## Context

Floating-point dollars produce totals like `155.00000000000003`, and percentages (deposits, discounts, senior
prices) make rounding errors visible on invoices. Guests come from many countries and want to see their currency.

## Decision

- Every amount is an integer number of cents (`priceCents`, `totalCents`, `paidCents`…).
- Prices and bookings are stored in USD. Other currencies (EUR, GBP, EGP…) are for display only, converted with
  rates refreshed daily and stored in settings.
- The total is always computed on the server by the pure `quote()` in `features/booking/domain/pricing.ts`. The
  browser sends a selection (option, date, guests, add-ons, promo code), never a price.
- A booking stores a copy of its price lines, so later price changes don't alter it.

## Consequences

- Exact sums and a single rounding point per line.
- Paymob charges in EGP, so the USD amount is converted at checkout with the current rate; the charged EGP amount
  is kept on the payment and used again for refunds ([ADR 0009](0009-payment-providers.md)).
- Selling in a second base currency would need a migration of stored amounts.
