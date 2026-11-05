import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("can", () => {
  it("lets agents work bookings but not the catalogue or exports", () => {
    expect(can("agent", "booking:update")).toBe(true);
    expect(can("agent", "catalog:edit")).toBe(false);
    expect(can("agent", "data:export")).toBe(false);
  });
  it("keeps settings and staff to owners", () => {
    expect(can("manager", "settings:edit")).toBe(false);
    expect(can("manager", "staff:manage")).toBe(false);
    expect(can("owner", "staff:manage")).toBe(true);
  });
});
