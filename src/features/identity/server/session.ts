/**
 * Admin session tokens: a signed JWT in an httpOnly cookie.
 * Edge-safe (no Node APIs, no database), because middleware verifies it too.
 * Revocation is checked in Node by `requireAdmin`, which compares `ver` with the database.
 */
import { jwtVerify, SignJWT } from "jose";
import type { AdminRole } from "@/server/db/schema";
import { env } from "@/config/env";

export const SESSION_COOKIE = "wct_admin";
/** A session lasts 12 hours and is renewed while in use (see `shouldRefresh`). */
export const SESSION_MAX_AGE = 60 * 60 * 12;

const ROLES: readonly AdminRole[] = ["owner", "manager", "agent"];

function key() {
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. Set a long random string.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
  /** Must equal admin_users.session_version, or the session has been revoked */
  ver: number;
  /** Issued at, seconds since epoch */
  iat?: number;
};

export async function signSession(p: Omit<SessionPayload, "iat">): Promise<string> {
  return new SignJWT({ email: p.email, name: p.name, role: p.role, ver: p.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const role = ROLES.find((r) => r === payload.role);
    if (!payload.sub || !role || typeof payload.ver !== "number") return null;
    return {
      sub: payload.sub,
      email: String(payload.email),
      name: String(payload.name),
      role,
      ver: payload.ver,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}

/** True once less than half of the session's lifetime is left */
export function shouldRefresh(session: SessionPayload, now = Date.now()): boolean {
  if (!session.iat) return true;
  return now / 1000 - session.iat > SESSION_MAX_AGE / 2;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/** Same attributes as when the cookie was set, so browsers reliably remove it */
export const clearSessionCookieOptions = { ...sessionCookieOptions, maxAge: 0 };

// ── Two-step sign-in ────────────────────────────────────────────────────

/** Holds the pending challenge id between the password step and the code step */
export const CHALLENGE_COOKIE = "wct_2fa";
export const challengeCookieOptions = { ...sessionCookieOptions, maxAge: 10 * 60 };

/** "Remember this device": skips the emailed code for 30 days, until the user's sessions are revoked */
export const TRUSTED_DEVICE_COOKIE = "wct_trusted";
export const TRUSTED_DEVICE_MAX_AGE = 60 * 60 * 24 * 30;
export const trustedDeviceCookieOptions = { ...sessionCookieOptions, maxAge: TRUSTED_DEVICE_MAX_AGE };

export async function signTrustedDevice(p: { sub: string; ver: number }): Promise<string> {
  return new SignJWT({ ver: p.ver, purpose: "trusted-device" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${TRUSTED_DEVICE_MAX_AGE}s`)
    .sign(key());
}

/** The trusted device's admin id and session version, or null */
export async function verifyTrustedDevice(
  token: string | undefined,
): Promise<{ sub: string; ver: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.purpose !== "trusted-device" || !payload.sub || typeof payload.ver !== "number") return null;
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}
