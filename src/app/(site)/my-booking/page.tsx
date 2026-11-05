import type { Metadata } from "next";
import { findBooking } from "@/features/booking/server/booking.actions";

export const metadata: Metadata = { title: "Find my booking" };

export default async function MyBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ notfound?: string; limited?: string }>;
}) {
  const { notfound, limited } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display-md text-3xl">Find my booking</h1>
      <p className="text-ink-soft mt-2">
        Use the reference from your confirmation email (it starts with WCT-) and the email you booked with.
      </p>
      <form action={findBooking} className="mt-8 space-y-4">
        <label className="block">
          <span className="label">Booking reference</span>
          <input name="reference" required placeholder="WCT-AB12CD" className="field tabular uppercase" />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" required className="field" />
        </label>
        {notfound && (
          <p role="alert" className="bg-danger-tint text-danger rounded-lg px-4 py-3 text-sm">
            We couldn't find a booking with that reference and email. Check both and try again.
          </p>
        )}
        {limited && (
          <p role="alert" className="bg-danger-tint text-danger rounded-lg px-4 py-3 text-sm">
            Too many attempts. Please wait an hour and try again, or contact us.
          </p>
        )}
        <button className="btn btn-primary w-full">Show my booking</button>
      </form>
    </div>
  );
}
