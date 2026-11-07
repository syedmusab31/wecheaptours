# 0009. Payment providers behind one interface: Stripe and Paymob

- Status: Accepted
- Date: 2026-11

## Context

International guests pay comfortably with Stripe. Egyptian guests and local cards are better served by Paymob
(cards, Meeza, mobile wallets, installments in EGP). The booking flow shouldn't care which one is used.

## Decision

`PaymentProvider` (`features/payment/payment.types.ts`) has three methods: `createCheckout`, `verifyWebhook` and
`refund`. `StripeProvider` and `PaymobProvider` implement it over plain `fetch` (no SDKs).

- `checkoutProvider()` picks the provider for new checkouts: `PAYMENT_PROVIDER`, or the only one configured.
- Webhooks arrive at `/api/webhooks/stripe` and `/api/webhooks/paymob`, are verified (Stripe signature header;
  Paymob HMAC-SHA512 over its documented fields) and recorded through the same `recordPayment()`.
- Payments are unique by provider reference, so a webhook delivered twice is recorded once.
- Refunds go through the provider that took the payment (`providerByName(payment.provider)`).
- Offline payments (cash, bank transfer) are recorded by staff in the admin.

## Consequences

- Adding a provider is one class and one webhook route.
- Paymob amounts are converted from USD at the stored EGP rate ([ADR 0005](0005-money-in-cents.md)).
- With no provider configured, the site still works: guests get payment instructions by email.
