import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { CalendarCheck, Inbox, LayoutDashboard, LogOut, Map as MapIcon, Package, Settings, Star, Users } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const counts = await db.execute<{ pending: number; fresh: number }>(sql`
    select (select count(*)::int from bookings where status = 'pending') as pending,
           (select count(*)::int from enquiries where status = 'new') as fresh`);
  const { pending, fresh } = counts.rows[0] ?? { pending: 0, fresh: 0 };

  const nav = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, badge: pending },
    { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, badge: fresh },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/destinations", label: "Destinations", icon: MapIcon },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/subscribers", label: "Subscribers", icon: Users },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-dvh bg-mist lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin">
            <Logo />
          </Link>
          <Link href="/" target="_blank" className="text-xs font-semibold text-lapis hover:underline lg:hidden">
            View site
          </Link>
        </div>
        <nav aria-label="Admin" className="scroll-row flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-[0.95rem] font-medium text-ink-soft hover:bg-mist hover:text-ink">
              <n.icon size={18} aria-hidden />
              {n.label}
              {!!n.badge && <span className="ml-auto rounded-full bg-sun px-2 text-xs font-bold text-ink tabular">{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="px-5 pb-3 lg:hidden">
          <button className="text-sm font-semibold text-ink-soft">Sign out</button>
        </form>
        <div className="hidden border-t border-line px-5 py-4 text-sm lg:absolute lg:bottom-0 lg:block lg:w-full">
          <p className="truncate font-semibold">{admin.name}</p>
          <p className="truncate text-ink-mute">{admin.email}</p>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/" target="_blank" className="font-semibold text-lapis hover:underline">
              View site
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink">
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
