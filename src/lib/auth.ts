import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";

export async function getAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** Use at the top of every admin page and server action */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
