# 0007. next-intl without locale routing, English first

- Status: Accepted
- Date: 2026-11

## Context

Most guests read English, but Arabic, German, Italian and Spanish speakers are a large share of Egypt and Jordan
visitors. We want the public site ready for translation without paying the cost of locale URLs (`/de/…`), which
change every link, the sitemap and canonical tags, before there's a second language to serve.

## Decision

- [next-intl](https://next-intl.dev) loads `messages/<locale>.json` for each request (`src/i18n/request.ts`).
- The locale is the `locale` cookie if it's supported, else the best match for the browser's `Accept-Language`,
  else English (`src/i18n/config.ts`). Today `LOCALES = ["en"]`.
- `<html lang dir>` comes from the locale, so a right-to-left language (Arabic) works once added.
- Message keys are type-checked against `en.json` (`src/i18n/types.d.ts`).
- The public site's shared UI is translated first: header, footer, checkout form, error pages. Other pages move
  over as they're edited. The admin stays in English.
- Emails and domain error messages (pricing, validation) stay in English for now.

### Adding a language

1. Add the code to `LOCALES` in `src/i18n/config.ts`.
2. Copy `messages/en.json` to `messages/<code>.json` and translate it. TypeScript reports missing keys.
3. Add a language switcher that sets the `locale` cookie.
4. When it should be indexed by search engines: move pages under `app/[locale]/`, use next-intl's routing
   middleware, and add `hreflang` alternates to the sitemap and metadata. This ADR is then superseded.

## Consequences

- No URL changes now; translations can be added gradually.
- Until locale routing exists, search engines only index English, and a shared link shows the reader's own language.
- Pages that use `getTranslations` must render per request, which they already do ([ADR 0004](0004-nonce-csp-dynamic-rendering.md)).
