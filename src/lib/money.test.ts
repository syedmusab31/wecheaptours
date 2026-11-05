import { describe, expect, it } from "vitest";
import { convert, DEFAULT_RATES, formatMoney, isCurrency } from "@/lib/money";

describe("currency", () => {
  it("converts from USD", () => expect(convert(10, "EGP", DEFAULT_RATES)).toBeCloseTo(485));
  it("formats without decimals by default", () => expect(formatMoney(12.5, "USD")).toBe("$13"));
  it("never shows decimals for EGP", () =>
    expect(formatMoney(1, "EGP", DEFAULT_RATES, { decimals: true })).toMatch(/EGP\s?49$/));
  it("validates currency codes", () => {
    expect(isCurrency("GBP")).toBe(true);
    expect(isCurrency("BTC")).toBe(false);
  });
});
