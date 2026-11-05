import { describe, expect, it } from "vitest";
import { formatDate, lines, slugify } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases, strips accents and joins words with dashes", () => {
    expect(slugify("Café de Flore — Luxor!")).toBe("cafe-de-flore-luxor");
  });
  it("turns & into 'and'", () => expect(slugify("Sun & Sand")).toBe("sun-and-sand"));
  it("caps the length at 120", () => expect(slugify("a".repeat(200))).toHaveLength(120));
});

describe("formatDate", () => {
  it("formats ISO dates without shifting the day", () => expect(formatDate("2026-03-01")).toBe("1 Mar 2026"));
  it("prints a dash for empty values", () => expect(formatDate(null)).toBe("—"));
});

describe("lines", () => {
  it("splits and trims textarea input", () => expect(lines(" a \n\n b ")).toEqual(["a", "b"]));
});
