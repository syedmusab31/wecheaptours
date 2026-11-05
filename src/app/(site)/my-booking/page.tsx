import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookings } from "@/db/schema";

export const metadata: Metadata = { title: "Find my booking" };

async function findBooking(formData: FormData) {
  "use server";
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const [b] = await db
    .select({ reference: bookings.reference, accessToken: bookings.accessToken })
    .from(bookings)
    .where(and(eq(bookings.reference, reference), eq(bookings.email, email)));
  if (!b) redirect("/my-booking?notfound=1");
  redirect(`/booking/${b.reference}?t=${b.accessToken}`);
}

export default async function MyBookingPage({ searchParams }: { searchParams: Promise<{ notfound?: string }> }) {
  const { notfound } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display-md text-3xl">Find my booking</h1>
      <p className="mt-2 text-ink-soft">Use the reference from your confirmation email (it starts with WCT-) and the email you booked with.</p>
      <form action={findBooking} className="mt-8 space-y-4">
        <label className="block">
          <span className="label">Booking reference</span>
          <input name="reference" required placeholder="WCT-AB12CD" className="field uppercase tabular" />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" required className="field" />
        </label>
        {notfound && (
          <p role="alert" className="rounded-lg bg-danger-tint px-4 py-3 text-sm text-danger">
            We couldn't find a booking with that reference and email. Check both and try again.
          </p>
        )}
        <button className="btn btn-primary w-full">Show my booking</button>
      </form>
    </div>
  );
}
