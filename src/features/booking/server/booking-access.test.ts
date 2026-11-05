import { describe, expect, it } from "vitest";
import { bookingAccessToken, verifyBookingAccessToken } from "./booking-access";

describe("booking access tokens", () => {
  it("verifies its own token, case-insensitively on the reference", () => {
    const token = bookingAccessToken("WCT-ABC234");
    expect(verifyBookingAccessToken("wct-abc234", token)).toBe(true);
  });
  it("rejects a token for another reference or a tampered token", () => {
    const token = bookingAccessToken("WCT-ABC234");
    expect(verifyBookingAccessToken("WCT-ABC235", token)).toBe(false);
    expect(verifyBookingAccessToken("WCT-ABC234", token.slice(0, -1) + "x")).toBe(false);
    expect(verifyBookingAccessToken("WCT-ABC234", "")).toBe(false);
  });
});
