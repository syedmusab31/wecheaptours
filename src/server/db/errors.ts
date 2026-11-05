/** Postgres error codes we handle on purpose: https://www.postgresql.org/docs/current/errcodes-appendix.html */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

type PgError = { code?: string; constraint?: string };

function pgError(err: unknown): PgError | null {
  if (typeof err !== "object" || err === null) return null;
  // Drizzle wraps driver errors; the original is on `cause`.
  const e = err as PgError & { cause?: unknown };
  if (e.code) return e;
  return e.cause ? pgError(e.cause) : null;
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = pgError(err);
  return e?.code === UNIQUE_VIOLATION && (!constraint || e.constraint === constraint);
}

export function isForeignKeyViolation(err: unknown, constraint?: string): boolean {
  const e = pgError(err);
  return e?.code === FOREIGN_KEY_VIOLATION && (!constraint || e.constraint === constraint);
}
