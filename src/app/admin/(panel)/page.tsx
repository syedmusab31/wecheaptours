import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { db } from "@/db";
import { bookings, enquiries } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export default async function Dashboard() {
  const stats = await db.execute<{
    pending: number;
    upcoming: number;
    month_value: string;
    month_count: number;
    new_enquiries: number;
    subscribers: number;
  }>(sql`
    select
      (select count(*)::int from bookings where status = 'pending') as pending,
      (select count(*)::int from bookings where status = 'confirmed' and travel_date between current_date and current_date + 7) as upcoming,
      (select coalesce(sum(total), 0) from bookings where status in ('confirmed','completed') and date_trunc('month', created_at) = date_trunc('month', now())) as month_value,
      (select count(*)::int from bookings where date_trunc('month', created_at) = date_trunc('month', now())) as month_count,
      (select count(*)::int from enquiries where status = 'new') as new_enquiries,
      (select count(*)::int from subscribers) as subscribers`);
  const s = stats.rows[0];

  const [recent, upcoming, latestEnquiries] = await Promise.all([
    db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(8),
    db
      .select()
      .from(bookings)
      .where(sql`${bookings.status} = 'confirmed' and ${bookings.travelDate} >= current_date`)
      .orderBy(bookings.travelDate)
      .limit(6),
    db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(5),
  ]);

  const tiles = [
    { label: "Waiting for confirmation", value: s.pending, href: "/admin/bookings?status=pending", hot: s.pending > 0 },
    { label: "Trips in the next 7 days", value: s.upcoming, href: "/admin/bookings?status=confirmed" },
    { label: "Confirmed this month (USD)", value: `$${Math.round(Number(s.month_value)).toLocaleString()}`, href: "/admin/bookings" },
    { label: "New enquiries", value: s.new_enquiries, href: "/admin/enquiries", hot: s.new_enquiries > 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-ink-soft">
        {s.month_count} booking requests this month · {s.subscribers} deal subscribers
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-xl bg-white p-5 hover:ring-2 hover:ring-lapis/20 ${t.hot ? "ring-2 ring-sun" : ""}`}>
            <p className="text-sm text-ink-soft">{t.label}</p>
            <p className="mt-1 text-3xl font-bold tabular">{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Latest booking requests</h2>
            <Link href="/admin/bookings" className="text-sm font-semibold text-lapis hover:underline">
              All bookings
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-ink-soft">No bookings yet. They'll appear here as soon as guests send requests.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center gap-3 py-3 hover:text-lapis">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.productTitle}</span>
                      <span className="block truncate text-sm text-ink-mute">
                        {b.customerName} · {formatDate(b.travelDate)} · {b.reference}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular">${Number(b.total).toFixed(0)}</span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Coming up</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No confirmed trips coming up.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcoming.map((b) => (
                  <li key={b.id} className="text-sm">
                    <Link href={`/admin/bookings/${b.id}`} className="hover:text-lapis">
                      <b>{formatDate(b.travelDate, true)}</b> · {b.productTitle}
                      <span className="block text-ink-mute">
                        {b.customerName}, {b.adults + b.children + b.infants} guests{b.pickupLocation ? ` · ${b.pickupLocation}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Latest enquiries</h2>
              <Link href="/admin/enquiries" className="text-sm font-semibold text-lapis hover:underline">
                All
              </Link>
            </div>
            {latestEnquiries.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No enquiries yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {latestEnquiries.map((e) => (
                  <li key={e.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <b className="truncate">{e.name}</b>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="line-clamp-1 text-ink-mute">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
