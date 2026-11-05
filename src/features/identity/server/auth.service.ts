import "server-only";
import bcrypt from "bcryptjs";
import type { AdminRole, AdminUser } from "@/server/db/schema";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@/server/errors";
import * as adminUsers from "./admin-user.repository";
import { signSession } from "./session";

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

/** Checks credentials and returns a signed session token. */
export async function login(email: string, password: string): Promise<string> {
  const user = await adminUsers.findByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw new UnauthorizedError("Email or password is incorrect.");
  await adminUsers.updateAdmin(user.id, { lastLoginAt: new Date() });
  return sessionFor(user);
}

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
