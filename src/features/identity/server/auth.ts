import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { findById } from "./admin-user.repository";
import { can, type Permission } from "./permissions";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

export type SessionAdmin = SessionPayload & { id: number };

/**
 * The signed-in admin, or null. Besides the signature, checks the database so that
 * disabled accounts and revoked sessions (password change, "sign out everywhere") stop at once.
 * Cached per request.
 */
export const getAdmin = cache(async (): Promise<SessionAdmin | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await findById(Number(session.sub));
  if (!user || !user.isActive || user.sessionVersion !== session.ver) return null;
  // Role and name come from the database, so a role change applies immediately.
  return { ...session, id: user.id, role: user.role, name: user.name, email: user.email };
});

/** Use at the top of every admin page and server action */
export async function requireAdmin(): Promise<SessionAdmin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Signed in AND allowed; otherwise the 403 page */
export async function requirePermission(permission: Permission): Promise<SessionAdmin> {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) forbidden();
  return admin;
}
