# Architecture decision records

Short notes on decisions that shape the code: the context, what we chose, and what it costs.
A new decision gets the next number. A decision that changes gets a new ADR that supersedes the old one,
so the history stays readable.

| #                                           | Decision                                                     | Status   |
| ------------------------------------------- | ------------------------------------------------------------ | -------- |
| [0001](0001-feature-modules.md)             | Feature modules with domain / repository / service layers    | Accepted |
| [0002](0002-postgres-for-everything.md)     | One Postgres database for state, rate limits and jobs        | Accepted |
| [0003](0003-postgres-job-queue.md)          | Transactional outbox job queue instead of a queue service    | Accepted |
| [0004](0004-nonce-csp-dynamic-rendering.md) | Nonce-based CSP, so every page renders per request           | Accepted |
| [0005](0005-money-in-cents.md)              | Money as integer cents in USD; prices computed on the server | Accepted |
| [0006](0006-hmac-booking-links.md)          | Guests reach bookings through signed links, not accounts     | Accepted |
| [0007](0007-translations.md)                | next-intl without locale routing, English first              | Accepted |
| [0008](0008-sql-migrations.md)              | Versioned SQL migrations, applied on deploy                  | Accepted |
| [0009](0009-payment-providers.md)           | Payment providers behind one interface: Stripe and Paymob    | Accepted |
| [0010](0010-email-otp-admin-sign-in.md)     | Admin two-step sign-in with an emailed code                  | Accepted |

Template:

```md
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```
