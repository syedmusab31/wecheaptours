# 0004. Nonce-based CSP, so every page renders per request

- Status: Accepted
- Date: 2026-10

## Context

A strict Content-Security-Policy is the best defence against injected scripts, which matters on pages that show
guest-written text (reviews, enquiries in the admin). A strict policy means `script-src 'nonce-…' 'strict-dynamic'`
with no `unsafe-inline`. A nonce must be new for every response, so pages can't be served from a static cache.

## Decision

Middleware creates a nonce per request and sets the CSP header (`src/server/security/csp.ts`). Next.js adds the
nonce to its own scripts. The root layout reads the request headers, which makes every page dynamic.

To keep pages fast, **data** is cached rather than pages: catalogue and settings reads go through
`unstable_cache` with tags (`src/server/cache.ts`), and admin writes invalidate the tags they affect.

## Consequences

- Strong XSS protection without hand-maintained script hashes.
- Every page costs a function invocation; there is no static HTML at the edge. Cached data keeps render times low.
- Third-party scripts must be loaded with the nonce (see `components/analytics/Analytics.tsx`).
- `loading.tsx` on a route makes Next.js send a 200 before the page runs, so a missing item can't return a 404.
  Product pages don't use one, so dead links return a real 404.
