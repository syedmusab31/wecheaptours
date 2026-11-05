# WeCheapTours

Booking website for Egypt & Jordan day trips, Nile cruises, transfers, stays and packages, with a custom admin panel.

- **Frontend + backend:** Next.js 15 (App Router). Pages are React server components; the backend is Node.js API routes (`src/app/api`) and server actions. Everything deploys to Vercel as one project.
- **Database:** PostgreSQL through Drizzle ORM (`src/db/schema.ts`).
- **Images:** Cloudinary (uploads from the admin panel, resized on the fly). Demo photos come from Unsplash.
- **Email:** any SMTP provider through Nodemailer. If SMTP isn't set, emails are printed in the terminal.
- **Payments:** not integrated yet. Guests send a _booking request_, you confirm it in the admin panel, and payment happens after confirmation (cash, card or bank transfer).

## What's included

| Area             | Pages                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public site      | Home with ticket-style search · `/search` results with filters and sorting · `/tours`, `/cruises`, `/transfers`, `/stays`, `/packages` · product pages with gallery, itinerary and live price · `/book/[slug]` booking request · `/booking/[ref]` guest booking page · `/my-booking` lookup · `/destinations` + 12 destination pages · `/concierge` (concierge & events) · `/enquire` quote/contact form · `/booking-terms` · `/privacy` · sitemap and robots |
| Admin (`/admin`) | Dashboard · Bookings (filter, search, change status and email the guest, CSV export) · Enquiries · Products (create, edit, photos, hide/feature, options, extras, price rules, availability calendar) · Promo codes · Destinations · Reviews · Subscribers (CSV) · Settings (contact details, exchange rates, demo banner, password, staff accounts with roles, sign out everywhere)                                                                          |
| API              | `POST /api/bookings` · `POST /api/enquiries` · `POST /api/subscribe` · `GET /api/products?type=tour&where=luxor&sort=cheapest` · `GET /api/health`                                                                                                                                                                                                                                                                                                            |

## Standard rules (demo, change in `src/lib/rules.ts`)

| Type         | Book ahead | Free cancellation               | Payment                     |
| ------------ | ---------- | ------------------------------- | --------------------------- |
| Day trips    | 24 hours   | until 24 h before               | on the day                  |
| Transfers    | 12 hours   | until 24 h before               | on the day                  |
| Nile cruises | 3 days     | until 14 days before (then 50%) | 20% deposit at confirmation |
| Stays        | 24 hours   | until 7 days before (then 50%)  | 20% deposit                 |
| Packages     | 7 days     | until 21 days before (then 50%) | 20% deposit                 |

Children 0–3 free, 4–11 pay 50% on per-person prices. Prices are stored in USD; visitors can view USD, EUR, GBP, EGP or JOD (rates editable in Admin → Settings). The server always re-calculates the price, so the browser can't change it.

## Run it on your computer

Needs Node.js 20+ and PostgreSQL (e.g. [Postgres.app](https://postgresapp.com) on Mac, or a free [Neon](https://neon.tech) database).

```bash
cp .env.example .env          # then edit DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:setup              # creates the tables and loads the demo products (admin role: owner)
npm run dev                   # http://localhost:3000  ·  admin: http://localhost:3000/admin
```

`npm run db:seed` can be run again at any time; it updates the demo products and destinations without duplicating anything.

## Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel.
2. In the Vercel project: **Storage → Create Database → Neon (Postgres)**. This adds `DATABASE_URL`.
3. Add the other environment variables from `.env.example` (Settings → Environment Variables). Set `NEXT_PUBLIC_SITE_URL` to your domain, e.g. `https://www.wecheaptours.com`, and a long random `AUTH_SECRET` (`openssl rand -base64 32`).
4. Create the tables and demo data once, from your computer, pointing at the production database:
   ```bash
   DATABASE_URL="<the Neon URL from Vercel>" ADMIN_EMAIL=you@… ADMIN_PASSWORD=… npm run db:setup
   ```
5. Deploy. Then add your domain under Settings → Domains.

### Cloudinary

Create a free account, then copy **Cloud name**, **API key** and **API secret** into `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Uploads are signed by the server, so the secret never reaches the browser.

### Email

Any SMTP service works (Zoho, Brevo, Gmail with an app password, Amazon SES, Resend SMTP). Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` and `NOTIFY_EMAIL` (where new booking alerts go).

Emails sent: booking request received (guest + you), booking confirmed / cancelled / completed (guest, when you change the status with "Email the guest" ticked), enquiry received (guest + you).

## Before launch

- Replace demo photos, prices and texts in **Admin → Products** and **Destinations**.
- Delete the demo reviews in **Admin → Reviews** ("Sample guest A", …) and add real guest reviews.
- Add your phone, WhatsApp, email and tourism licence number in **Admin → Settings**, then untick **Demo mode**.
- Change the admin password (Admin → Settings).

## Development

```bash
npm run check          # lint + typecheck + format check + unit tests (what CI runs, minus the build)
npm test               # unit tests; integration tests also run when TEST_DATABASE_URL is set:
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/wecheaptours_test npm test
npm run format         # Prettier (a pre-commit hook formats staged files)
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, unit + integration tests (against a Postgres service) and `next build` on every pull request.

Environment variables are validated at startup by `src/config/env.ts`; see `.env.example` for the full list.

### Upgrading an existing database

Schema changes go through `npm run db:push`. A database created before the travel domain model (money in cents, countries, availability) needs one upgrade first, which backfills the new columns without losing data:

```bash
npm run db:upgrade
```

## Project map

Code is organised by feature. Pages, API routes and server actions are thin adapters that call services; only repositories query the database (enforced by ESLint).

```
src/
  app/                 routing only: (site) pages, admin pages, api/ (v1 public API, webhooks, cron)
  features/<area>/     one folder per area: booking, catalog, availability, payment, promotion,
                       destination, review, enquiry, newsletter, customer, identity, settings, reporting
    domain/            pure rules, unit-tested (pricing, booking states, payment status)
    server/            *.repository.ts (database), *.service.ts (use cases), *.actions.ts (admin forms)
    components/        that area's UI (admin/ for admin screens)
  components/          shared UI: layout, brand, ui, admin form controls
  server/              infrastructure: db (client, schema, pool), email, jobs, cache, logger, security
  lib/                 small pure helpers: money, dates, csv, routes, validation
  config/env.ts        validated environment variables
  jobs/                job handlers and scheduled tasks (run by /api/cron/*)
scripts/               seed data and one-off upgrades
tests/integration/     service tests against a real Postgres
```

## Operations

- **Background jobs:** emails, trip reminders, review requests and other work are queued in the `jobs` table in the same transaction as the booking, sent right after the response, and retried by `/api/cron/run-jobs`. `vercel.json` schedules the worker every minute (Vercel Pro), plus daily (expire stale requests, queue reminders, optional exchange-rate sync) and weekly (data retention, cleanup) tasks. Cron routes need `Authorization: Bearer $CRON_SECRET`.
- **Logs:** structured JSON (pino) with request IDs; guest emails and phones are redacted.
- **Errors:** Sentry when `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set; reports are scrubbed of booking tokens, emails and phone numbers.
- **Health:** `GET /api/health` returns 503 when the database is down or jobs have waited over 10 minutes.
- **Security:** rate limits on login, bookings, enquiries, subscribe and booking lookup; nonce-based CSP and security headers; revocable admin sessions with owner / manager / agent roles.

## Payments

Online payment is built in with Stripe and off until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set. Once a booking is confirmed, the guest gets a "Pay deposit" link; the webhook (`/api/webhooks/stripe`, event `checkout.session.completed`) records the payment once, even if Stripe sends it twice. Cash and bank transfers are recorded on the admin booking page. Other providers (Paymob, PayPal) plug into `src/features/payment/payment.types.ts`.
