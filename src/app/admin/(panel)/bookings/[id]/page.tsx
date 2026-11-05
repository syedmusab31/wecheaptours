import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BookingStatusForm } from "@/features/booking/components/admin/BookingStatusForm";
import { BOOKING_STATUS_LABELS } from "@/features/booking/domain/booking-status";
import { getBookingById, guestBookingLink, listEvents } from "@/features/booking/server/booking.service";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";
import { requirePermission } from "@/features/identity/server/auth";
import { ManualPaymentForm } from "@/features/payment/components/admin/PaymentPanel";
import { amountDue } from "@/features/payment/domain/payment-status";
import { listPayments } from "@/features/payment/server/payment.service";
import { nightsBetween } from "@/lib/dates";
import { formatCentsExact } from "@/lib/money";
import { formatDate } from "@/lib/utils";

const ACTOR = { guest: "Guest", admin: "Staff", system: "System" } as const;

function dateTime(d: Date) {
  return `${formatDate(d)} ${new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("booking:view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const b = await getBookingById(id);
  if (!b) notFound();
  const [events, payments] = await Promise.all([listEvents(b.id), listPayments(b.id)]);
  const wa = b.customerPhone.replace(/\D/g, "");
  const money = (cents: number) => formatCentsExact(cents, b.currency);
  // Nothing is due on a booking that is off (cancelled, declined, expired)
  const due = ["pending", "confirmed", "completed"].includes(b.status) ? amountDue(b) : null;

  const rows: [string, React.ReactNode][] = [
    [
      CATEGORY_META[b.category].singular,
      b.optionName ? `${b.productTitle} · ${b.optionName}` : b.productTitle,
    ],
    [
      b.endDate ? "Dates" : "Travel date",
      b.endDate
        ? `${formatDate(b.travelDate)} – ${formatDate(b.endDate)} (${nightsBetween(b.travelDate, b.endDate)} nights)`
        : formatDate(b.travelDate, true),
    ],
    ["Guests", `${b.adults} adults, ${b.children} children (4–11), ${b.infants} infants`],
    ["Pickup", b.pickupLocation || "—"],
    ["Guest notes", b.notes || "—"],
    [
      "Guest saw prices in",
      b.displayCurrency === b.currency ? b.currency : `${b.displayCurrency} (rate ${Number(b.fxRate)})`,
    ],
    ["Requested", dateTime(b.createdAt)],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/bookings" className="text-lapis text-sm font-semibold hover:underline">
        All bookings
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="tabular text-2xl font-bold">{b.reference}</h1>
        <StatusBadge status={b.status} />
        <StatusBadge status={b.paymentStatus} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Booking</h2>
            <dl className="divide-line mt-3 divide-y text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[160px_1fr] gap-3 py-2.5">
                  <dt className="text-ink-mute">{k}</dt>
                  <dd className="whitespace-pre-line">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Price</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              {b.priceLines.map((l) => (
                <div key={l.label} className="text-ink-soft flex justify-between gap-3">
                  <dt>{l.label}</dt>
                  <dd className="tabular">{money(l.amountCents)}</dd>
                </div>
              ))}
              <div className="border-line flex justify-between gap-3 border-t pt-2 font-bold">
                <dt>Total</dt>
                <dd className="tabular">{money(b.totalCents)}</dd>
              </div>
              <div className="text-ink-soft flex justify-between gap-3">
                <dt>Deposit at confirmation</dt>
                <dd className="tabular">
                  {b.depositCents > 0 ? money(b.depositCents) : "None, pay on the day"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">History</h2>
            {events.length === 0 ? (
              <p className="text-ink-mute mt-2 text-sm">
                No history recorded (booking made before history was kept).
              </p>
            ) : (
              <ol className="border-line mt-3 space-y-3 border-l-2 pl-4 text-sm">
                {events.map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold">
                      {e.fromStatus ? `${BOOKING_STATUS_LABELS[e.fromStatus].split(":")[0]} → ` : ""}
                      {BOOKING_STATUS_LABELS[e.toStatus].split(":")[0]}
                    </p>
                    <p className="text-ink-mute">
                      {ACTOR[e.actorType]} · {dateTime(e.createdAt)}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Guest</h2>
            <p className="mt-2 font-semibold">{b.customerName}</p>
            <p className="text-ink-soft text-sm">{b.customerCountry}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a
                href={`mailto:${b.customerEmail}?subject=${encodeURIComponent(`Your booking ${b.reference}`)}`}
                className="btn btn-ghost py-2"
              >
                {b.customerEmail}
              </a>
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${b.customerName.split(" ")[0]}, this is WeCheapTours about your booking ${b.reference}.`)}`}
                  target="_blank"
                  rel="noopener"
                  className="btn bg-faience py-2 text-white hover:bg-[#086a63]"
                >
                  WhatsApp {b.customerPhone}
                </a>
              )}
            </div>
            <a
              href={guestBookingLink(b)}
              target="_blank"
              className="text-lapis mt-3 block text-sm font-semibold hover:underline"
            >
              Open the guest's booking page
            </a>
          </section>

          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Update status</h2>
            <BookingStatusForm id={b.id} status={b.status} adminNotes={b.adminNotes} />
          </section>

          <section className="rounded-xl bg-white p-5">
            <h2 className="font-bold">Payments</h2>
            <p className="text-ink-soft mt-1 text-sm">
              Received {money(b.paidCents)} of {money(b.totalCents)}
              {due ? ` · next due: ${due.kind} ${money(due.amountCents)}` : ""}
            </p>
            {payments.length > 0 && (
              <ul className="divide-line mt-3 divide-y text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-2">
                    <span>
                      <span className="font-semibold capitalize">{p.kind}</span>{" "}
                      <span className="text-ink-mute">
                        · {p.provider} · {formatDate(p.createdAt)}
                        {p.status !== "succeeded" ? ` · ${p.status}` : ""}
                      </span>
                    </span>
                    <span className="tabular">
                      {p.kind === "refund" ? `−${money(p.amountCents)}` : money(p.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ManualPaymentForm bookingId={b.id} suggestedCents={due?.amountCents ?? 0} />
          </section>
        </div>
      </div>
    </div>
  );
}
