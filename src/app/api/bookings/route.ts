import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, products } from "@/db/schema";
import { bookingLink, sendBookingReceived } from "@/lib/email";
import { quote } from "@/lib/rules";
import { bookingSchema, firstError } from "@/lib/validation";

export const runtime = "nodejs";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeReference() {
  const bytes = randomBytes(6);
  return "WCT-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Create a booking request. No payment is taken: status starts as "pending". */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true }); // bot

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.isActive, true)));
  if (!product) return NextResponse.json({ error: "This option is no longer available." }, { status: 404 });

  // Price on the server, never trust the browser's total
  const q = quote(
    {
      category: product.category,
      priceUnit: product.priceUnit,
      price: Number(product.price),
      minGuests: product.minGuests,
      maxGuests: product.maxGuests,
      minNights: product.minNights,
      travelDate: input.travelDate,
      endDate: input.endDate || null,
      adults: input.adults,
      children: input.children,
      infants: input.infants,
    },
    new Date(),
    { graceDays: 1 },
  );
  if (!q.ok) return NextResponse.json({ error: q.error }, { status: 422 });

  let booking;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    try {
      [booking] = await db
        .insert(bookings)
        .values({
          reference: makeReference(),
          accessToken: randomBytes(24).toString("hex"),
          productId: product.id,
          productTitle: product.title,
          category: product.category,
          travelDate: input.travelDate,
          endDate: product.priceUnit === "night" ? input.endDate || null : null,
          adults: input.adults,
          children: input.children,
          infants: input.infants,
          units: q.units,
          unitPrice: product.price,
          total: String(q.total),
          deposit: String(q.deposit),
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          country: input.country,
          pickupLocation: input.pickupLocation,
          notes: input.notes,
        })
        .returning();
    } catch (err) {
      // Retry only on the (very unlikely) reference collision
      if (!String(err).includes("bookings_reference_unique") || attempt === 2) throw err;
    }
  }
  if (!booking) return NextResponse.json({ error: "Could not save the booking. Try again." }, { status: 500 });

  await sendBookingReceived(booking);

  const url = new URL(bookingLink(booking));
  return NextResponse.json({ ok: true, reference: booking.reference, url: url.pathname + url.search });
}
