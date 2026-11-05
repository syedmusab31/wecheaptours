/**
 * Keyset ("cursor") pagination for lists sorted newest first by (created_at, id).
 * Unlike OFFSET, the cost doesn't grow with the page number, and rows added meanwhile don't shift pages.
 */
export const ADMIN_PAGE_SIZE = 200;

export type Cursor = { createdAt: Date; id: number };

/** Opaque, URL-safe position of the last row on a page */
export function encodeCursor(row: Cursor): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString("base64url");
}

/** The position from a `?after=` value, or null when it is missing or malformed */
export function decodeCursor(value: string | undefined | null): Cursor | null {
  if (!value || value.length > 100) return null;
  const [iso, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
  const createdAt = new Date(iso ?? "");
  const n = Number(id);
  if (Number.isNaN(createdAt.getTime()) || !Number.isInteger(n) || n <= 0) return null;
  return { createdAt, id: n };
}

/** Splits a query result fetched with `limit + 1` into the page and the cursor for the next one */
export function toPage<T>(
  rows: T[],
  limit: number,
  position: (row: T) => Cursor,
): { rows: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { rows, nextCursor: null };
  const page = rows.slice(0, limit);
  return { rows: page, nextCursor: encodeCursor(position(page[page.length - 1])) };
}
