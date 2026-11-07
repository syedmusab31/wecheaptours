import { describe, expect, it } from "vitest";
import { describeGuests } from "./guests";

describe("describeGuests", () => {
  it("lists every guest type that is present, in order", () => {
    expect(
      describeGuests({
        adults: 2,
        children: 1,
        infants: 0,
        tierGuests: [{ label: "Senior (65+)", count: 1 }],
      }),
    ).toBe("2 adults, 1 Senior (65+), 1 child");
    expect(describeGuests({ adults: 1, children: 0, infants: 2 })).toBe("1 adult, 2 infants");
  });
});

describe("describeGuests: tiers with nobody in them", () => {
  it("skips a tier with zero guests", () => {
    expect(
      describeGuests({ adults: 1, children: 0, infants: 0, tierGuests: [{ label: "Student", count: 0 }] }),
    ).toBe("1 adult");
  });
});
