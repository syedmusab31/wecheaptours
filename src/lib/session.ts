/** Admin session tokens (signed JWT in an httpOnly cookie). Edge-safe: used by middleware too. */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "wct_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set a long random string in your environment.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { sub: string; email: string; name: string };

export async function signSession(p: SessionPayload) {
  return new SignJWT({ email: p.email, name: p.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return { sub: String(payload.sub), email: String(payload.email), name: String(payload.name) };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};
