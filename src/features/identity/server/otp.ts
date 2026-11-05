import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

/** A uniformly random 6-digit code (leading zeros kept) */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/** Bound to the challenge, so a hash can't be reused for another sign-in */
export function hashOtp(challengeId: string, code: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(`login-otp:v1:${challengeId}:${code}`).digest("hex");
}

export function otpMatches(challengeId: string, code: string, expectedHash: string): boolean {
  const given = Buffer.from(hashOtp(challengeId, code.replace(/\s/g, "")));
  const expected = Buffer.from(expectedHash);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
