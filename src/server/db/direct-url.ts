/**
 * Neon gives every database two addresses: the pooled one (host contains "-pooler", via PgBouncer)
 * for the app, and the direct one for schema changes. PgBouncer hands the connection back after
 * each transaction, which long migrations and the migration lock don't tolerate.
 *
 * The direct address is derived from DATABASE_URL (not read from a second variable), so a script
 * can never end up talking to a different database than the one DATABASE_URL names.
 * Any other URL is returned unchanged. Pure: also used by drizzle.config.ts.
 */
export function directDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("-pooler.")) return url;
    u.hostname = u.hostname.replace("-pooler.", ".");
    return u.toString();
  } catch {
    return url;
  }
}

export function isPooledUrl(url: string): boolean {
  return directDatabaseUrl(url) !== url;
}
