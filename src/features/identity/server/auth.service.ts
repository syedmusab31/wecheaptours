import "server-only";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { withTransaction } from "@/server/db/transaction";
import { enqueue } from "@/server/jobs/queue";
import type { JobHandlers } from "@/server/jobs/worker";
import { logger } from "@/server/logger";
import { countEvent } from "@/server/security/rate-limit";
import { sendFailedLoginAlert, sendLoginCode } from "./identity.emails";
import * as challenges from "./login-challenge.repository";
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES, otpMatches } from "./otp";
import type { AdminRole, AdminUser } from "@/server/db/schema";
import {
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from "@/server/errors";
import * as adminUsers from "./admin-user.repository";
import { signSession, signTrustedDevice, verifyTrustedDevice } from "./session";

const BCRYPT_ROUNDS = 10;
/** Compared against when the email is unknown, so response time doesn't reveal which emails exist */
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-placeholder", BCRYPT_ROUNDS);

function sessionFor(user: AdminUser) {
  return signSession({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    ver: user.sessionVersion,
  });
}

export type SignInResult =
  | { status: "signed_in"; sessionToken: string }
  | { status: "code_sent"; challengeId: string; maskedEmail: string };

const FAILED_LOGIN_ALERT_AT = 10;

/** "jane@example.com" → "j***@example.com", shown on the code screen */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

/** Counts a failed attempt; at the 10th in an hour the account and the owners get an alert email */
async function recordFailure(user: AdminUser) {
  const failures = await countEvent(`loginFailures:${user.id}`, 60 * 60);
  if (failures === FAILED_LOGIN_ALERT_AT) {
    await withTransaction((tx) =>
      enqueue(
        tx,
        "identity.failed_login_alert",
        { adminId: user.id, failures },
        {
          dedupeKey: `failed-login:${user.id}:${new Date().toISOString().slice(0, 13)}`,
        },
      ),
    );
  }
}

async function sendCode(user: AdminUser, ip: string) {
  const code = generateOtp();
  const challengeId = randomUUID();
  await challenges.replaceChallenge({
    id: challengeId,
    adminId: user.id,
    codeHash: hashOtp(challengeId, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    ip,
  });
  // Sent before responding (not queued): the person is waiting for it, and a failure must show now
  try {
    await sendLoginCode(user.email, user.name, code, ip);
  } catch (err) {
    logger.error({ event: "login_code.send_failed", adminId: user.id, err }, "could not send sign-in code");
    throw new ServiceUnavailableError("We couldn't send your sign-in code. Try again in a minute.");
  }
  return { status: "code_sent" as const, challengeId, maskedEmail: maskEmail(user.email) };
}

/**
 * Step 1: email and password. Then either signs in straight away (a device the admin chose to
 * remember) or emails a 6-digit code for step 2.
 */
export async function beginSignIn(input: {
  email: string;
  password: string;
  ip: string;
  trustedDevice?: string;
}): Promise<SignInResult> {
  const user = await adminUsers.findByEmail(input.email);
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    if (user) await recordFailure(user);
    throw new UnauthorizedError("Email or password is incorrect.");
  }
  const trusted = await verifyTrustedDevice(input.trustedDevice);
  if (trusted && trusted.sub === String(user.id) && trusted.ver === user.sessionVersion) {
    await adminUsers.updateAdmin(user.id, { lastLoginAt: new Date() });
    return { status: "signed_in", sessionToken: await sessionFor(user) };
  }
  return sendCode(user, input.ip);
}

/** Step 2: the emailed code. Returns a session, plus a trusted-device token when asked to remember. */
export async function verifySignInCode(input: {
  challengeId: string;
  code: string;
  rememberDevice: boolean;
}) {
  const outcome = await withTransaction(async (tx) => {
    const challenge = await challenges.lockChallenge(input.challengeId, tx);
    if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date())
      return { error: "expired" as const };
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) return { error: "locked" as const };
    if (!otpMatches(challenge.id, input.code, challenge.codeHash)) {
      const attempts = challenge.attempts + 1;
      await challenges.updateChallenge(
        challenge.id,
        { attempts, ...(attempts >= OTP_MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) },
        tx,
      );
      return { error: "wrong" as const, left: OTP_MAX_ATTEMPTS - attempts, adminId: challenge.adminId };
    }
    await challenges.updateChallenge(challenge.id, { consumedAt: new Date() }, tx);
    return { adminId: challenge.adminId };
  });

  if ("error" in outcome) {
    if (outcome.error === "wrong") {
      const user = await adminUsers.findById(outcome.adminId);
      if (user) await recordFailure(user);
      if (outcome.left > 0)
        throw new UnauthorizedError(
          `That code isn't right. ${outcome.left} ${outcome.left === 1 ? "try" : "tries"} left.`,
        );
    }
    throw new UnauthorizedError(
      "This code has expired or was used too many times. Sign in again to get a new one.",
    );
  }

  const user = await adminUsers.findById(outcome.adminId);
  if (!user || !user.isActive) throw new UnauthorizedError("This account can't sign in.");
  await adminUsers.updateAdmin(user.id, { lastLoginAt: new Date() });
  return {
    sessionToken: await sessionFor(user),
    trustedDeviceToken: input.rememberDevice
      ? await signTrustedDevice({ sub: String(user.id), ver: user.sessionVersion })
      : null,
  };
}

/** "Send a new code": replaces the pending challenge with a fresh one */
export async function resendSignInCode(challengeId: string, ip: string): Promise<SignInResult> {
  const challenge = await challenges.findChallenge(challengeId);
  if (!challenge || challenge.expiresAt < new Date(Date.now() - 50 * 60_000)) {
    throw new UnauthorizedError("Sign in again to get a new code.");
  }
  const user = await adminUsers.findById(challenge.adminId);
  if (!user || !user.isActive) throw new UnauthorizedError("Sign in again to get a new code.");
  return sendCode(user, ip);
}

export const identityJobHandlers: JobHandlers = {
  "identity.failed_login_alert": async (p) => {
    const user = await adminUsers.findById(Number(p.adminId));
    if (!user) return;
    const owners = (await adminUsers.listAdmins())
      .filter((a) => a.role === "owner" && a.isActive)
      .map((a) => a.email);
    await sendFailedLoginAlert([...new Set([user.email, ...owners])], user.email, Number(p.failures));
  },
};

/** Changes the password and signs out every other session. Returns a fresh token for this one. */
export async function changePassword(adminId: number, current: string, next: string): Promise<string> {
  const user = await adminUsers.findById(adminId);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    throw new ValidationError("Current password is wrong.");
  }
  const updated = await adminUsers.bumpSessionVersion(user.id, {
    passwordHash: await bcrypt.hash(next, BCRYPT_ROUNDS),
  });
  return sessionFor(updated!);
}

/** Signs out every session of this user, including the current one */
export async function signOutEverywhere(adminId: number) {
  await adminUsers.bumpSessionVersion(adminId);
}

export async function addAdmin(input: { email: string; name: string; password: string; role: AdminRole }) {
  const created = await adminUsers.insertAdmin({
    email: input.email,
    name: input.name,
    role: input.role,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  });
  if (!created) throw new ConflictError(`${input.email} already has an account.`);
  return created;
}

/** Changes a staff member's role or disables them. Disabling also ends their sessions. */
export async function updateStaff(
  actorId: number,
  input: { id: number; role: AdminRole; isActive: boolean },
) {
  const user = await adminUsers.findById(input.id);
  if (!user) throw new NotFoundError("Staff member not found");
  if (input.id === actorId && (input.role !== user.role || !input.isActive)) {
    throw new ValidationError("You can't change your own role or disable yourself.");
  }
  const losesOwner = user.role === "owner" && (input.role !== "owner" || !input.isActive);
  if (losesOwner && (await adminUsers.countOtherActiveOwners(user.id)) === 0) {
    throw new ValidationError("Keep at least one active owner.");
  }
  // Ending sessions on any change means the new role applies on the next request.
  return adminUsers.bumpSessionVersion(user.id, { role: input.role, isActive: input.isActive });
}

export { listAdmins } from "./admin-user.repository";
