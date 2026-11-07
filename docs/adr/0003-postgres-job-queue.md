# 0003. Transactional outbox job queue instead of a queue service

- Status: Accepted
- Date: 2026-10

## Context

Booking emails used to be sent inline. If SMTP was slow the guest waited; if it failed after the booking was saved,
the email was lost; if the email was sent and the transaction then failed, the guest got an email for a booking
that didn't exist. Hosted queues (Inngest, QStash, SQS) solve this but add a service, a webhook and a secret.

## Decision

Side effects are written as rows in the `jobs` table **in the same transaction** as the change that causes them
(`src/server/jobs/queue.ts`). A worker (`src/server/jobs/worker.ts`) claims due jobs with
`FOR UPDATE SKIP LOCKED`, runs the handler registered for the job type (`src/jobs/handlers.ts`), and retries
failures with a growing delay (1, 4, 9, 16 minutes…) before marking them failed.

The worker runs:

1. right after the request, through Next.js `after()`, so emails normally go out within a second;
2. from `/api/cron/run-jobs`, called by an external scheduler every few minutes (Vercel Hobby crons run at most
   daily), which catches anything the first path missed.

## Consequences

- A job exists if and only if its change was committed.
- Handlers must be idempotent: a job can run twice if a worker dies after sending but before marking it done.
- Not built for high throughput; fine for tens of jobs a minute.
- Failed jobs are visible with a SQL query; there's no dashboard.
