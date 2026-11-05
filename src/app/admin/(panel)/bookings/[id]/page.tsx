import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookingStatusForm } from "@/components/admin/BookingStatusForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { bookingLink } from "@/lib/email";
import { CATEGORY_META, nightsBetween } from "@/lib/rules";
import { formatDate } from "@/lib/utils";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!b) notFound();
  const wa = b.phone.replace(/\D/g, "");

  const rows: [string, React.ReactNode][] = [
    [CATEGORY_META[b.category].singular, b.productTitle],
    [b.endDate ? "Dates" : "Travel date", b.endDate ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)} (${nightsBetween(b.travelDate, b.endDate)} nights)` : formatDate(b.travelDate, true)],
    ["Guests", `${b.adults} adults, ${b.children} children (4–11), ${b.infants} infants`],
    ["Unit price", `$${Number(b.unitPrice).toFixed(2)}`],
    ["Total", <b key="t">${Number(b.total).toFixed(2)}</b>],
    ["Deposit at confirmation", Number(b.deposit) > 0 ? `$${Number(b.deposit).toFixed(2)}` : "None, pay on the day"],
    ["Pickup", b.pickupLocation || "—"],
    ["Guest notes", b.notes || "—"],
    ["Requested", formatDate(b.createdAt) + " " + new Date(b.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/bookings" className="text-sm font-semibold text-lapis hover:underline">
        All bookings
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tabular">{b.reference}</h1>
        <StatusBadge status={b.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl bg-white p-5">
          <h2 className="font-bold">Booking</h2>
          <dl className="mt-3 divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[160px_1fr] gap-3 py-2.5">
                <dt className="text-ink-mute">{k}</dt>
                <dd className="whitespace-pre-line">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Guest</h2>
            <p className="mt-2 font-semibold">{b.customerName}</p>
            <p className="text-sm text-ink-soft">{b.country}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href={`mailto:${b.email}?subject=${encodeURIComponent(`Your booking ${b.reference}`)}`} className="btn btn-ghost py-2">
                {b.email}
              </a>
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${b.customerName.split(" ")[0]}, this is WeCheapTours about your booking ${b.reference}.`)}`}
                  target="_blank"
                  rel="noopener"
                  className="btn bg-faience py-2 text-white hover:bg-[#086a63]"
                >
                  WhatsApp {b.phone}
                </a>
              )}
            </div>
            <a href={bookingLink(b)} target="_blank" className="mt-3 block text-sm font-semibold text-lapis hover:underline">
              Open the guest's booking page
            </a>
          </section>

          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Update status</h2>
            <BookingStatusForm id={b.id} status={b.status} adminNotes={b.adminNotes} />
          </section>
        </div>
      </div>
    </div>
  );
}
