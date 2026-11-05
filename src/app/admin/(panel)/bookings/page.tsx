import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { db } from "@/db";
import { bookings, bookingStatusEnum, type BookingStatus } from "@/db/schema";
import { CATEGORY_META } from "@/lib/rules";
import { cn, formatDate } from "@/lib/utils";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = bookingStatusEnum.enumValues.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined;
  const q = (sp.q ?? "").trim();
  const where: SQL[] = [];
  if (status) where.push(eq(bookings.status, status));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(bookings.reference, like), ilike(bookings.customerName, like), ilike(bookings.email, like), ilike(bookings.productTitle, like))!);
  }
  const rows = await db.select().from(bookings).where(where.length ? and(...where) : undefined).orderBy(desc(bookings.createdAt)).limit(200);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <a href="/api/admin/export/bookings" className="btn btn-ghost text-sm">
          <Download size={16} aria-hidden /> Export CSV
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1 rounded-xl bg-white p-1">
          {[undefined, ...bookingStatusEnum.enumValues].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/admin/bookings?status=${s}` : "/admin/bookings"}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold capitalize", status === s ? "bg-ink text-white" : "text-ink-soft hover:bg-mist")}
            >
              {s ?? "All"}
            </Link>
          ))}
        </nav>
        <form className="flex-1">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search reference, name, email or trip" className="field max-w-md" />
        </form>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-ink-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Travel date</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-mist/60">
                <td className="px-4 py-3 font-semibold tabular">
                  <Link href={`/admin/bookings/${b.id}`} className="text-lapis hover:underline">
                    {b.reference}
                  </Link>
                  <span className="block text-xs font-normal text-ink-mute">{formatDate(b.createdAt)}</span>
                </td>
                <td className="px-4 py-3">
                  {b.customerName}
                  <span className="block text-xs text-ink-mute">{b.phone}</span>
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <span className="line-clamp-1">{b.productTitle}</span>
                  <span className="block text-xs text-ink-mute">{CATEGORY_META[b.category].singular} · {b.adults + b.children + b.infants} guests</span>
                </td>
                <td className="px-4 py-3">{formatDate(b.travelDate, true)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular">${Number(b.total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-ink-soft">No bookings match.</p>}
      </div>
    </div>
  );
}
