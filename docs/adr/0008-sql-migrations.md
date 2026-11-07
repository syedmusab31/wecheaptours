# 0008. Versioned SQL migrations, applied on deploy

- Status: Accepted
- Date: 2026-11

## Context

The schema used to be applied with `drizzle-kit push`, which compares the live database with the code and
changes it to match. It asks questions interactively, can drop columns it doesn't recognise, and leaves no record
of what changed when.

## Decision

- `npm run db:generate -- --name <change>` writes a SQL migration in `drizzle/` from the schema in
  `src/server/db/schema`. Migrations are reviewed and committed like code.
- `npm run db:migrate` applies pending migrations. `vercel-build` runs it before `next build`, so a deploy and its
  schema change ship together.
- CI generates migrations again and fails if any file changes, so a schema edit can't ship without its migration.
- Existing databases created with `push` are marked as already at the baseline with `npm run db:baseline`.
- Schema tools use the direct (non-pooled) database URL, derived from `DATABASE_URL`.

## Consequences

- Every schema change is reviewable, ordered and repeatable on a fresh database (CI and the e2e job do this).
- Migrations must stay compatible with the running version for the few seconds of a deploy: add columns with
  defaults, remove them in a later release.
