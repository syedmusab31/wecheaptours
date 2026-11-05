import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Package,
  Settings,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getSidebarCounts } from "@/features/reporting/server/dashboard.service";
import { requireAdmin } from "@/features/identity/server/auth";
import { can, ROLE_LABELS, type Permission } from "@/features/identity/server/permissions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const { pending, fresh } = await getSidebarCounts();

  const allNav: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
    permission?: Permission;
  }[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/admin/bookings",
      label: "Bookings",
      icon: CalendarCheck,
      badge: pending,
      permission: "booking:view",
    },
    { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, badge: fresh, permission: "booking:view" },
    { href: "/admin/products", label: "Products", icon: Package, permission: "catalog:edit" },
    { href: "/admin/destinations", label: "Destinations", icon: MapIcon, permission: "catalog:edit" },
    { href: "/admin/promo-codes", label: "Promo codes", icon: Ticket, permission: "catalog:edit" },
    { href: "/admin/reviews", label: "Reviews", icon: Star, permission: "review:edit" },
    { href: "/admin/subscribers", label: "Subscribers", icon: Users, permission: "data:export" },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];
  // Hiding links is a convenience only: every page and action checks the permission itself.
  const nav = allNav.filter((n) => !n.permission || can(admin.role, n.permission));

  return (
    <div className="bg-mist min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-line border-b bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin">
            <Logo />
          </Link>
          <Link
            href="/"
            target="_blank"
            className="text-lapis text-xs font-semibold hover:underline lg:hidden"
          >
            View site
          </Link>
        </div>
        <nav
          aria-label="Admin"
          className="scroll-row flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible"
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-ink-soft hover:bg-mist hover:text-ink flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-[0.95rem] font-medium"
            >
              <n.icon size={18} aria-hidden />
              {n.label}
              {!!n.badge && (
                <span className="bg-sun text-ink tabular ml-auto rounded-full px-2 text-xs font-bold">
                  {n.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="px-5 pb-3 lg:hidden">
          <button className="text-ink-soft text-sm font-semibold">Sign out</button>
        </form>
        <div className="border-line hidden border-t px-5 py-4 text-sm lg:absolute lg:bottom-0 lg:block lg:w-full">
          <p className="truncate font-semibold">{admin.name}</p>
          <p className="text-ink-mute truncate">{admin.email}</p>
          <p className="text-ink-mute text-xs">{ROLE_LABELS[admin.role].label}</p>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/" target="_blank" className="text-lapis font-semibold hover:underline">
              View site
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="text-ink-soft hover:text-ink inline-flex items-center gap-1.5">
                <LogOut size={15} aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
