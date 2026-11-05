import { eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import type * as Mailer from "@/server/email/mailer";
import { describeDb, resetDatabase } from "./helpers";
import { createProduct, isoInDays } from "./fixtures";

vi.mock("@/server/email/mailer", async (orig) => ({
  ...(await orig<typeof Mailer>()),
  sendMail: vi.fn(),
}));

const guest = {
  optionId: null,
  addonIds: [] as number[],
  promoCode: null,
  adults: 2,
  children: 1,
  infants: 0,
  customerName: "Test Guest",
  email: "guest@example.com",
  phone: "+201000000000",
  country: "",
  pickupLocation: "",
  notes: "",
  displayCurrency: "USD" as const,
  acceptTerms: true as const,
};

async function services() {
  const booking = await import("@/features/booking/server/booking.service");
  const { db } = await import("@/server/db/client");
  const schema = await import("@/server/db/schema");
  return { ...booking, db, schema };
}

describeDb("booking.service: creating bookings", () => {
  beforeEach(resetDatabase);

  it("creates a pending booking priced on the server, with a customer, history and email job", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct({ priceCents: 4000 });
    const booking = await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    expect(booking).toMatchObject({
      status: "pending",
      paymentStatus: "unpaid",
      totalCents: 10000,
      productTitle: product.title,
    });
    expect(booking.reference).toMatch(/^WCT-[A-Z2-9]{6}$/);
    expect(booking.customerId).toBeTruthy();
    const events = await db
      .select()
      .from(schema.bookingEvents)
      .where(eq(schema.bookingEvents.bookingId, booking.id));
    expect(events).toMatchObject([{ fromStatus: null, toStatus: "pending", actorType: "guest" }]);
    const jobs = await db.select().from(schema.jobs);
    expect(jobs).toMatchObject([
      { type: "booking.received", payload: { bookingId: booking.id }, status: "queued" },
    ]);
  });

  it("rejects an inactive product and a date inside the lead time", async () => {
    const { createBooking } = await services();
    const hidden = await createProduct({ isActive: false });
    await expect(
      createBooking({ ...guest, productId: hidden.id, travelDate: isoInDays(10) }),
    ).rejects.toThrow(/no longer available/);
    const product = await createProduct();
    await expect(
      createBooking({ ...guest, productId: product.id, travelDate: isoInDays(0) }),
    ).rejects.toThrow(/notice/);
  });

  it("finds the guest link only with the matching email", async () => {
    const { createBooking, findGuestBookingLink } = await services();
    const product = await createProduct();
    const booking = await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    expect(await findGuestBookingLink(booking.reference, "guest@example.com")).toMatch(
      `/booking/${booking.reference}?t=`,
    );
    expect(await findGuestBookingLink(booking.reference, "someone@else.com")).toBeNull();
  });

  it("applies options, extras and a promo code, and uses up the code", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct({ priceCents: 4000 });
    const [option] = await db
      .insert(schema.productOptions)
      .values({
        productId: product.id,
        name: "Private car",
        priceCents: 12000,
        priceUnit: "group",
        maxGuests: 6,
      })
      .returning();
    const [lunch] = await db
      .insert(schema.productAddons)
      .values({ productId: product.id, name: "Lunch", priceCents: 1000, unit: "person" })
      .returning();
    await db.insert(schema.promoCodes).values({ code: "TEN", percentOff: 10, maxUses: 1 });

    const base = {
      ...guest,
      productId: product.id,
      travelDate: isoInDays(10),
      optionId: option.id,
      addonIds: [lunch.id],
    };
    const booking = await createBooking({ ...base, promoCode: "ten" });
    // 120.00 private car + 3 × 10.00 lunch = 150.00, minus 10% = 135.00
    expect(booking).toMatchObject({
      optionName: "Private car",
      subtotalCents: 15000,
      discountCents: 1500,
      totalCents: 13500,
      promoCode: "TEN",
    });
    await expect(createBooking({ ...base, promoCode: "TEN" })).rejects.toThrow(/used up/);
  });

  it("requires an option when the product has options", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct();
    await db
      .insert(schema.productOptions)
      .values({ productId: product.id, name: "Shared", priceCents: 3000 });
    await expect(
      createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) }),
    ).rejects.toThrow(/Choose an option/);
  });
});

describeDb("booking.service: availability", () => {
  beforeEach(resetDatabase);

  it("lets exactly one of two parallel bookings take the last seats", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct();
    const date = isoInDays(10);
    const [slot] = await db
      .insert(schema.availabilitySlots)
      .values({ productId: product.id, startsOn: date, capacity: 4 })
      .returning();

    // Each booking needs 3 of the 4 seats (2 adults + 1 child)
    const results = await Promise.allSettled([
      createBooking({ ...guest, productId: product.id, travelDate: date }),
      createBooking({ ...guest, productId: product.id, travelDate: date, email: "other@example.com" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(failed.reason)).toMatch(/Sold out/);
    const [after] = await db
      .select()
      .from(schema.availabilitySlots)
      .where(eq(schema.availabilitySlots.id, slot.id));
    expect(after.reserved).toBe(3);
  });

  it("refuses closed dates and dates without a slot once a calendar exists", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct();
    await db
      .insert(schema.availabilitySlots)
      .values({ productId: product.id, startsOn: isoInDays(10), capacity: 10, status: "closed" });
    await expect(
      createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) }),
    ).rejects.toThrow(/Not available/);
    await expect(
      createBooking({ ...guest, productId: product.id, travelDate: isoInDays(11) }),
    ).rejects.toThrow(/Not available/);
  });

  it("gives the seats back when a booking is cancelled", async () => {
    const { createBooking, transitionBooking, db, schema } = await services();
    const product = await createProduct();
    const [slot] = await db
      .insert(schema.availabilitySlots)
      .values({ productId: product.id, startsOn: isoInDays(10), capacity: 10 })
      .returning();
    const booking = await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    await transitionBooking({ bookingId: booking.id, to: "confirmed", actor: { type: "admin", id: 1 } });
    await transitionBooking({ bookingId: booking.id, to: "cancelled", actor: { type: "guest" } });
    const [after] = await db
      .select()
      .from(schema.availabilitySlots)
      .where(eq(schema.availabilitySlots.id, slot.id));
    expect(after.reserved).toBe(0);
  });
});

describeDb("booking.service: status changes", () => {
  beforeEach(resetDatabase);

  it("rejects an illegal move and writes nothing", async () => {
    const { createBooking, transitionBooking, db, schema } = await services();
    const product = await createProduct();
    const booking = await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    await transitionBooking({ bookingId: booking.id, to: "confirmed", actor: { type: "admin", id: 1 } });
    await transitionBooking({ bookingId: booking.id, to: "completed", actor: { type: "admin", id: 1 } });
    await expect(
      transitionBooking({ bookingId: booking.id, to: "pending", actor: { type: "admin", id: 1 } }),
    ).rejects.toThrow("A completed booking can't be changed to pending.");
    const events = await db
      .select()
      .from(schema.bookingEvents)
      .where(eq(schema.bookingEvents.bookingId, booking.id));
    expect(events.map((e) => e.toStatus)).toEqual(["pending", "confirmed", "completed"]);
    // Completing queues the review request for the next day
    const jobs = await db.select().from(schema.jobs).where(eq(schema.jobs.type, "booking.review_request"));
    expect(jobs).toHaveLength(1);
  });

  it("expires requests nobody confirmed before the travel date", async () => {
    const { createBooking, expireStalePending, getBookingById } = await services();
    const product = await createProduct();
    const booking = await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    expect(await expireStalePending(isoInDays(11))).toBe(1);
    expect((await getBookingById(booking.id))?.status).toBe("expired");
  });
});

describeDb("payments", () => {
  beforeEach(resetDatabase);

  it("records a webhook payment once, even when Stripe sends it twice", async () => {
    const { createBooking } = await services();
    const { recordPayment } = await import("@/features/payment/server/payment.service");
    const product = await createProduct({ category: "package", priceCents: 50000, priceUnit: "group" });
    const booking = await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(20) });
    const event = {
      provider: "stripe",
      providerRef: "pi_test_123",
      bookingId: booking.id,
      kind: "deposit" as const,
      amountCents: booking.depositCents,
      currency: "USD",
      status: "succeeded" as const,
      raw: {},
    };
    const first = await recordPayment(event);
    const second = await recordPayment(event);
    expect(first).toMatchObject({
      duplicate: false,
      booking: { paymentStatus: "deposit_paid", paidCents: 10000 },
    });
    expect(second).toMatchObject({ duplicate: true, booking: { paidCents: 10000 } });
  });
});

describeDb("booking.service: duplicate submits", () => {
  beforeEach(resetDatabase);

  it("returns the same booking for a repeated submit and takes the seats once", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct();
    const [slot] = await db
      .insert(schema.availabilitySlots)
      .values({ productId: product.id, startsOn: isoInDays(10), capacity: 10 })
      .returning();
    const submit = {
      ...guest,
      productId: product.id,
      travelDate: isoInDays(10),
      idempotencyKey: crypto.randomUUID(),
    };

    const [a, b] = await Promise.all([createBooking(submit), createBooking(submit)]);
    const c = await createBooking(submit);
    expect(new Set([a.id, b.id, c.id]).size).toBe(1);
    expect(await db.select().from(schema.bookings)).toHaveLength(1);
    const [after] = await db
      .select()
      .from(schema.availabilitySlots)
      .where(eq(schema.availabilitySlots.id, slot.id));
    expect(after.reserved).toBe(3);
    expect(await db.select().from(schema.jobs)).toHaveLength(1); // one confirmation email
  });

  it("refuses to hand a booking to a different email with the same key", async () => {
    const { createBooking } = await services();
    const product = await createProduct();
    const submit = {
      ...guest,
      productId: product.id,
      travelDate: isoInDays(10),
      idempotencyKey: crypto.randomUUID(),
    };
    await createBooking(submit);
    await expect(createBooking({ ...submit, email: "someone@else.com" })).rejects.toThrow(/reload the page/);
  });

  it("still makes separate bookings without a key", async () => {
    const { createBooking, db, schema } = await services();
    const product = await createProduct();
    await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) });
    expect(await db.select().from(schema.bookings)).toHaveLength(2);
  });
});

describeDb("admin lists: pagination", () => {
  beforeEach(resetDatabase);

  it("walks every booking exactly once, newest first", async () => {
    const { createBooking } = await services();
    const repo = await import("@/features/booking/server/booking.repository");
    const { decodeCursor } = await import("@/lib/pagination");
    const product = await createProduct();
    const made = [];
    for (let i = 0; i < 5; i++)
      made.push(await createBooking({ ...guest, productId: product.id, travelDate: isoInDays(10) }));

    const seen: number[] = [];
    let after = null;
    for (let page = 0; page < 5; page++) {
      const result = await repo.listForAdmin({ after }, 2);
      seen.push(...result.rows.map((b) => b.id));
      if (!result.nextCursor) break;
      after = decodeCursor(result.nextCursor);
    }
    expect(seen).toEqual(made.map((b) => b.id).reverse());
  });
});
