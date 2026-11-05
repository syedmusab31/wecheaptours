import { describe, expect, it } from "vitest";
import { joinList } from "./text";

describe("joinList", () => {
  it("handles none, one, two and many", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["Egypt"])).toBe("Egypt");
    expect(joinList(["Egypt", "Jordan"])).toBe("Egypt and Jordan");
    expect(joinList(["Egypt", "Jordan", "Morocco"], "or")).toBe("Egypt, Jordan or Morocco");
    expect(joinList(["Egypt", "Jordan"], "&")).toBe("Egypt & Jordan");
  });
});
