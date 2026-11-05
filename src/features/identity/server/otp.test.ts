import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, otpMatches } from "./otp";

describe("one-time codes", () => {
  it("are six digits, leading zeros included", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("match only for the same challenge, ignoring spaces", () => {
    const hash = hashOtp("challenge-a", "012345");
    expect(otpMatches("challenge-a", "012 345", hash)).toBe(true);
    expect(otpMatches("challenge-a", "012346", hash)).toBe(false);
    expect(otpMatches("challenge-b", "012345", hash)).toBe(false);
  });
});
