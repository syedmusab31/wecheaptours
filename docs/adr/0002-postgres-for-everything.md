# 0002. One Postgres database for state, rate limits and jobs

- Status: Accepted
- Date: 2026-10

## Context

The site is run by a small team on free or cheap tiers (Vercel Hobby, Neon). Each extra service (Redis for rate
limits, a queue service, a search engine) costs money, adds a secret and an outage mode, and needs to be learnt.
Traffic is modest: hundreds of bookings a month, not thousands a minute.

## Decision

Postgres holds everything with state: the catalogue, bookings and payments, admin users and sign-in challenges,
rate-limit counters (`rate_limits`), the job queue (`jobs`, [ADR 0003](0003-postgres-job-queue.md)) and search
(`pg_trgm` trigram indexes for typo-tolerant search).

## Consequences

- One backup, one connection string, one place to look when something goes wrong.
- Writes and their side effects can share a transaction.
- Rate limiting costs a database round trip per checked request. Fine at this scale; move the counters to Redis
  (Upstash) if the database becomes the bottleneck.
- The serverless functions open many short connections, so the app uses Neon's pooled URL.
