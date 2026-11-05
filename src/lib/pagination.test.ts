import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, toPage } from "./pagination";

describe("keyset pagination", () => {
  it("round-trips a cursor and rejects junk", () => {
    const c = { createdAt: new Date("2026-11-05T10:00:00.123Z"), id: 42 };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it("returns a next cursor only when there is another page", () => {
    const rows = [3, 2, 1].map((id) => ({ id, createdAt: new Date(2026, 0, id) }));
    expect(toPage(rows, 3, (r) => r).nextCursor).toBeNull();
    const page = toPage(rows, 2, (r) => r);
    expect(page.rows.map((r) => r.id)).toEqual([3, 2]);
    expect(decodeCursor(page.nextCursor)).toEqual({ id: 2, createdAt: rows[1].createdAt });
  });
});
