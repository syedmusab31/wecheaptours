import { requirePermission } from "@/features/identity/server/auth";
import { can } from "@/features/identity/server/permissions";
import Link from "next/link";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { listForAdmin } from "@/features/booking/server/booking.service";
import { bookingStatusEnum, type BookingStatus } from "@/server/db/schema";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";
import { cn, formatDate } from "@/lib/utils";
import { formatCentsExact } from "@/lib/money";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const admin = await requirePermission("booking:view");
  const sp = await searchParams;
  const status = bookingStatusEnum.enumValues.includes(sp.status as BookingStatus)
    ? (sp.status as BookingStatus)
    : undefined;
  const q = (sp.q ?? "").trim();
  const rows = await listForAdmin({ status, q });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Bookings</h1>
        {can(admin.role, "data:export") && (
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page */}
            <a href="/api/admin/export/bookings" className="btn btn-ghost text-sm">
              <Download size={16} aria-hidden /> Export CSV
            </a>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1 rounded-xl bg-white p-1">
          {[undefined, ...bookingStatusEnum.enumValues].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/admin/bookings?status=${s}` : "/admin/bookings"}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold capitalize",
                status === s ? "bg-ink text-white" : "text-ink-soft hover:bg-mist",
              )}
            >
              {s ?? "All"}
            </Link>
          ))}
        </nav>
        <form className="flex-1">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search reference, name, email or trip"
            className="field max-w-md"
          />
        </form>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-line text-ink-mute border-b">
            <tr>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Travel date</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-mist/60">
                <td className="tabular px-4 py-3 font-semibold">
                  <Link href={`/admin/bookings/${b.id}`} className="text-lapis hover:underline">
                    {b.reference}
                  </Link>
                  <span className="text-ink-mute block text-xs font-normal">{formatDate(b.createdAt)}</span>
                </td>
                <td className="px-4 py-3">
                  {b.customerName}
                  <span className="text-ink-mute block text-xs">{b.customerPhone}</span>
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <span className="line-clamp-1">{b.productTitle}</span>
                  <span className="text-ink-mute block text-xs">
                    {CATEGORY_META[b.category].singular} · {b.adults + b.children + b.infants} guests
                  </span>
                </td>
                <td className="px-4 py-3">{formatDate(b.travelDate, true)}</td>
                <td className="tabular px-4 py-3 text-right font-semibold">
                  {formatCentsExact(b.totalCents, b.currency)}
                  <span className="text-ink-mute block text-xs font-normal capitalize">
                    {b.paymentStatus.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-ink-soft p-8 text-center">No bookings match.</p>}
      </div>
    </div>
  );
}
