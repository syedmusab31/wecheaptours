# 0001. Feature modules with domain / repository / service layers

- Status: Accepted
- Date: 2026-10

## Context

The first version kept database queries, business rules and rendering together in route files. Pricing logic
was duplicated between the booking panel and the booking API, and nothing stopped a page from writing to the
database directly. Testing a rule meant starting the app.

## Decision

Code is grouped by business area under `src/features/<area>/`, and each area has the same layers:

- `domain/`: pure functions and types (pricing, the booking state machine, cancellation policy). No I/O.
- `server/*.repository.ts`: Drizzle queries. The only feature code that touches the database.
- `server/*.service.ts`: use cases that combine repositories, domain rules, transactions and job enqueueing.
- `server/*.actions.ts`: server actions for admin forms (permission check, parse with Zod, call a service).
- `components/`, `emails/`: UI for the area.

Routes in `src/app` stay thin and call services. ESLint enforces the boundaries (`eslint.config.mjs`), and the
domain layer has a 100% line/function/statement coverage gate in `vitest.config.ts`.

## Consequences

- Rules are tested in milliseconds, without a database.
- One `quote()` prices the panel preview, the quote API and the booking, so they can't disagree.
- More files per feature, and some pass-through service functions for simple reads.
- Cross-feature calls go service to service (for example, booking calls promotion and availability), never into
  another feature's repository.
