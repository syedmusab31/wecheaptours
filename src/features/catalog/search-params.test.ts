import { describe, expect, it } from "vitest";
import { parseSearchParams } from "@/features/catalog/search-params";

describe("parseSearchParams", () => {
  it("falls back to safe defaults", () => {
    expect(parseSearchParams({ type: "rockets", sort: "drop table" })).toMatchObject({
      category: "all",
      sort: "recommended",
    });
  });

  it("accepts category names and URL paths", () => {
    expect(parseSearchParams({ type: "cruise" }).category).toBe("cruise");
    expect(parseSearchParams({ type: "cruises" }).category).toBe("cruise");
  });

  it("strips unsafe characters from the destination slug", () => {
    expect(parseSearchParams({ where: "luxor'; --" }).destination).toBe("luxor--");
  });

  it("parses numbers, lists and flags", () => {
    const p = parseSearchParams({ min: "10", max: "abc", duration: "short,full", private: "1" });
    expect(p).toMatchObject({
      minPrice: 10,
      maxPrice: undefined,
      duration: ["short", "full"],
      privateOnly: true,
    });
  });

  it("accepts a country code or name, and nothing else", () => {
    expect(parseSearchParams({ country: "Jordan" }).country).toBe("Jordan");
    expect(parseSearchParams({ country: "EG" }).country).toBe("EG");
    expect(parseSearchParams({ country: "x'; drop table" }).country).toBeUndefined();
  });

  it("keeps only slug-shaped tags", () => {
    expect(parseSearchParams({ tags: "private,4x4,<script>" }).tags).toEqual(["private", "4x4"]);
  });
});
