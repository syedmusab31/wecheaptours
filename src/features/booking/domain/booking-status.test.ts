import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isFinal, nextStatuses, releasesSeats } from "./booking-status";

describe("booking state machine", () => {
  it("allows the forward moves", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(nextStatuses("confirmed")).toEqual(["completed", "cancelled", "no_show"]);
  });

  it("rejects moving backwards or out of a final state", () => {
    expect(canTransition("completed", "pending")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(() => assertTransition("declined", "confirmed")).toThrow(
      "A declined booking can't be changed to confirmed.",
    );
  });

  it("marks the end states final", () => {
    for (const s of ["declined", "expired", "completed", "cancelled", "no_show"] as const)
      expect(isFinal(s)).toBe(true);
    expect(isFinal("pending")).toBe(false);
  });

  it("releases seats only when leaving a seat-holding state", () => {
    expect(releasesSeats("confirmed", "cancelled")).toBe(true);
    expect(releasesSeats("pending", "declined")).toBe(true);
    expect(releasesSeats("confirmed", "completed")).toBe(false);
  });
});
