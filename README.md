# WeCheapTours

Booking website for Egypt & Jordan day trips, Nile cruises, transfers, stays and packages, with a custom admin panel.

- **Frontend + backend:** Next.js 15 (App Router). Pages are React server components; the backend is Node.js API routes (`src/app/api`) and server actions. Everything deploys to Vercel as one project.
- **Database:** PostgreSQL through Drizzle ORM (`src/db/schema.ts`).
- **Images:** Cloudinary (uploads from the admin panel, resized on the fly). Demo photos come from Unsplash.
- **Email:** any SMTP provider through Nodemailer. If SMTP isn't set, emails are printed in the terminal.
- **Payments:** not integrated yet. Guests send a *booking request*, you confirm it in the admin panel, and payment happens after confirmation (cash, card or bank transfer).

## What's included

| Area | Pages |
| --- | --- |
| Public site | Home with ticket-style search · `/search` results with filters and sorting · `/tours`, `/cruises`, `/transfers`, `/stays`, `/packages` · product pages with gallery, itinerary and live price · `/book/[slug]` booking request · `/booking/[ref]` guest booking page · `/my-booking` lookup · `/destinations` + 12 destination pages · `/concierge` (concierge & events) · `/enquire` quote/contact form · `/booking-terms` · `/privacy` · sitemap and robots |
| Admin (`/admin`) | Dashboard · Bookings (filter, search, change status and email the guest, CSV export) · Enquiries · Products (create, edit, photos, hide/feature) · Destinations · Reviews · Subscribers (CSV) · Settings (contact details, exchange rates, demo banner, password, staff accounts) |
| API | `POST /api/bookings` · `POST /api/enquiries` · `POST /api/subscribe` · `GET /api/products?type=tour&where=luxor&sort=cheapest` · `GET /api/health` |

## Standard rules (demo, change in `src/lib/rules.ts`)

| Type | Book ahead | Free cancellation | Payment |
| --- | --- | --- | --- |
| Day trips | 24 hours | until 24 h before | on the day |
| Transfers | 12 hours | until 24 h before | on the day |
| Nile cruises | 3 days | until 14 days before (then 50%) | 20% deposit at confirmation |
| Stays | 24 hours | until 7 days before (then 50%) | 20% deposit |
| Packages | 7 days | until 21 days before (then 50%) | 20% deposit |

Children 0–3 free, 4–11 pay 50% on per-person prices. Prices are stored in USD; visitors can view USD, EUR, GBP, EGP or JOD (rates editable in Admin → Settings). The server always re-calculates the price, so the browser can't change it.

## Run it on your computer

Needs Node.js 20+ and PostgreSQL (e.g. [Postgres.app](https://postgresapp.com) on Mac, or a free [Neon](https://neon.tech) database).

```bash
cp .env.example .env          # then edit DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:setup              # creates the tables and loads the demo products
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

## Project map

```
src/
  app/(site)/        public pages
  app/admin/         admin panel (login, pages, server actions in actions.ts)
  app/api/           Node.js API routes
  components/site/   public UI (SearchTicket, ProductCard, BookingPanel, FilterPanel…)
  components/admin/  admin UI (ProductForm, ImageUploader…)
  db/                schema.ts, seed.ts, data/ (demo destinations, products, reviews)
  lib/               rules.ts (booking rules + pricing), queries.ts, email.ts, currency.ts…
```

## Adding payments later

The booking flow already stores `total` and `deposit`. To take payments, add a gateway (e.g. Paymob, Fawry, PayPal or Stripe) in `src/app/api/bookings/route.ts` after the booking is created, and mark it paid from the gateway's webhook.
