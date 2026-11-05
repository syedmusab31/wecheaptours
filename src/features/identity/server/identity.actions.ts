"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { addAdminSchema, changePasswordSchema, updateStaffSchema } from "../identity.schema";
import { adminFormAction } from "./admin-action";
import * as authService from "./auth.service";
import { requireAdmin } from "./auth";
import { SESSION_COOKIE, clearSessionCookieOptions, sessionCookieOptions } from "./session";

export const changePassword = adminFormAction(null, changePasswordSchema, async (input, { admin }) => {
  const token = await authService.changePassword(admin.id, input.current, input.next);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  return { ok: true, message: "Password changed. Other devices have been signed out." };
});

export const addAdmin = adminFormAction("staff:manage", addAdminSchema, async (input) => {
  await authService.addAdmin(input);
  revalidatePath("/admin/settings");
  return { ok: true, message: `${input.email} can now sign in.` };
});

export const updateStaff = adminFormAction("staff:manage", updateStaffSchema, async (input, { admin }) => {
  const user = await authService.updateStaff(admin.id, input);
  revalidatePath("/admin/settings");
  return { ok: true, message: `${user?.email} updated. Their sessions were signed out.` };
});

export async function signOutEverywhere() {
  const admin = await requireAdmin();
  await authService.signOutEverywhere(admin.id);
  (await cookies()).set(SESSION_COOKIE, "", clearSessionCookieOptions);
  redirect("/admin/login");
}
