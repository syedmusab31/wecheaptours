import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getDashboard } from "@/features/reporting/server/dashboard.service";
import { formatDate } from "@/lib/utils";
import { formatCentsExact } from "@/lib/money";

export default async function Dashboard() {
  const { stats: s, recent, upcoming, latestEnquiries } = await getDashboard();

  const tiles = [
    {
      label: "Waiting for confirmation",
      value: s.pending,
      href: "/admin/bookings?status=pending",
      hot: s.pending > 0,
    },
    { label: "Trips in the next 7 days", value: s.upcoming, href: "/admin/bookings?status=confirmed" },
    {
      label: "Confirmed this month (USD)",
      value: formatCentsExact(Number(s.month_value_cents)),
      href: "/admin/bookings",
    },
    { label: "New enquiries", value: s.new_enquiries, href: "/admin/enquiries", hot: s.new_enquiries > 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-ink-soft mt-1">
        {s.month_count} booking requests this month · {s.subscribers} deal subscribers
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`hover:ring-lapis/20 rounded-xl bg-white p-5 hover:ring-2 ${t.hot ? "ring-sun ring-2" : ""}`}
          >
            <p className="text-ink-soft text-sm">{t.label}</p>
            <p className="tabular mt-1 text-3xl font-bold">{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Latest booking requests</h2>
            <Link href="/admin/bookings" className="text-lapis text-sm font-semibold hover:underline">
              All bookings
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-ink-soft mt-4">
              No bookings yet. They'll appear here as soon as guests send requests.
            </p>
          ) : (
            <ul className="divide-line mt-3 divide-y">
              {recent.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="hover:text-lapis flex items-center gap-3 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.productTitle}</span>
                      <span className="text-ink-mute block truncate text-sm">
                        {b.customerName} · {formatDate(b.travelDate)} · {b.reference}
                      </span>
                    </span>
                    <span className="tabular text-sm font-semibold">
                      {formatCentsExact(b.totalCents, b.currency)}
                    </span>
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
              <p className="text-ink-soft mt-3 text-sm">No confirmed trips coming up.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcoming.map((b) => (
                  <li key={b.id} className="text-sm">
                    <Link href={`/admin/bookings/${b.id}`} className="hover:text-lapis">
                      <b>{formatDate(b.travelDate, true)}</b> · {b.productTitle}
                      <span className="text-ink-mute block">
                        {b.customerName},{" "}
                        {b.adults + b.children + b.infants + b.tierGuests.reduce((n, t) => n + t.count, 0)}{" "}
                        guests
                        {b.pickupLocation ? ` · ${b.pickupLocation}` : ""}
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
              <Link href="/admin/enquiries" className="text-lapis text-sm font-semibold hover:underline">
                All
              </Link>
            </div>
            {latestEnquiries.length === 0 ? (
              <p className="text-ink-soft mt-3 text-sm">No enquiries yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {latestEnquiries.map((e) => (
                  <li key={e.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <b className="truncate">{e.customerName}</b>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-ink-mute line-clamp-1">{e.message}</p>
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
