import { describe, expect, it } from "vitest";
import { isLocale, negotiateLocale, textDirection } from "./config";

describe("locale negotiation", () => {
  it("falls back to English for unsupported or missing languages", () => {
    expect(negotiateLocale("de-DE,de;q=0.9")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
  it("picks a supported language by quality", () => {
    expect(negotiateLocale("fr;q=0.5,en-GB;q=0.8")).toBe("en");
  });
  it("knows its locales and text direction", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("en")).toBe("ltr");
  });
});
