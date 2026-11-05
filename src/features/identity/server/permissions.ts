import type { AdminRole } from "@/server/db/schema";

/**
 * Who may do what in the admin panel. The server checks this on every page, action and
 * admin API route; the sidebar only hides links as a convenience.
 */
export const PERMISSIONS = {
  "booking:view": ["owner", "manager", "agent"],
  "booking:update": ["owner", "manager", "agent"],
  "enquiry:update": ["owner", "manager", "agent"],
  "catalog:edit": ["owner", "manager"],
  "review:edit": ["owner", "manager"],
  "data:export": ["owner", "manager"],
  "settings:edit": ["owner"],
  "staff:manage": ["owner"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
}

export const ROLE_LABELS: Record<AdminRole, { label: string; summary: string }> = {
  owner: { label: "Owner", summary: "Everything, including settings and staff" },
  manager: { label: "Manager", summary: "Products, reviews, bookings, exports" },
  agent: { label: "Agent", summary: "Bookings and enquiries only" },
};
