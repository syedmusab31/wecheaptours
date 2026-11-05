import "server-only";
import { randomBytes } from "node:crypto";
import {
  releaseSeats,
  reserveSeats,
  saveReservations,
} from "@/features/availability/server/availability.service";
import { getAddonsByIds, getPricingExtras } from "@/features/catalog/server/pricing.repository";
import { getActiveProductForBooking } from "@/features/catalog/server/product.repository";
import { upsertCustomer } from "@/features/customer/server/customer.repository";
import { redeemPromoCode, validatePromoCode } from "@/features/promotion/server/promo.service";
import { getSettings } from "@/features/settings/server/settings.service";
import type { Currency } from "@/lib/money";
import { isUniqueViolation } from "@/server/db/errors";
import type { Booking, BookingStatus, Product, ProductOption } from "@/server/db/schema";
import { withTransaction } from "@/server/db/transaction";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { canCancelFree } from "../domain/booking-policy";
import { IllegalTransitionError, assertTransition, releasesSeats } from "../domain/booking-status";
import { quote, type Quote } from "../domain/pricing";
import type { CreateBookingInput, QuoteRequest } from "../booking.schema";
import { bookingPath, verifyBookingAccessToken } from "./booking-access";
import { enqueueBookingEmail, enqueueReviewRequest } from "./booking.jobs";
import * as bookingRepository from "./booking.repository";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference() {
  const bytes = randomBytes(6);
  return "WCT-" + Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
}

export type Actor = { type: "guest" | "admin" | "system"; id?: number | null };

type PricedSelection = {
  product: Product;
  option: ProductOption | null;
  quote: Extract<Quote, { ok: true }>;
  promo: { id: number; code: string } | null;
  addons: { id: number; name: string; quantity: number; amountCents: number }[];
};

/**
 * Loads everything a price depends on (option, rules, add-ons, promo code) and runs the pure quote.
 * The browser can preview with POST /api/v1/quote; the booking always re-prices here.
 */
export async function priceSelection(input: QuoteRequest, now = new Date()): Promise<PricedSelection> {
  const product = await getActiveProductForBooking(input.productId);
  if (!product) throw new NotFoundError("This option is no longer available.");

  const extras = await getPricingExtras(product.id);
  let option: ProductOption | null = null;
  if (extras.options.length) {
    option = extras.options.find((o) => o.id === input.optionId) ?? null;
    if (!option) throw new ValidationError("Choose an option.");
  }
  const basis = option ?? product;
  const rules = extras.rules
    .filter((r) => r.optionId == null || r.optionId === option?.id)
    .map((r) => ({ ...r, percentChange: Number(r.percentChange) }));
  const addons = await getAddonsByIds(product.id, input.addonIds ?? []);
  const promo = input.promoCode ? await validatePromoCode(input.promoCode, input.travelDate) : null;

  const priced = quote(
    {
      category: product.category,
      priceUnit: basis.priceUnit,
      priceCents: basis.priceCents,
      minGuests: basis.minGuests,
      maxGuests: basis.maxGuests,
      minNights: product.minNights,
      travelDate: input.travelDate,
      endDate: input.endDate || null,
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      rules,
      addons,
      promo: promo
        ? { code: promo.code, percentOff: promo.percentOff, amountOffCents: promo.amountOffCents }
        : null,
    },
    now,
    // A guest in a time zone ahead of the server may pick what their calendar shows as the earliest day
    { graceDays: 1 },
  );
  if (!priced.ok) throw new ValidationError(priced.error);

  const payingGuests = input.adults + input.children;
  return {
    product,
    option,
    quote: priced,
    promo: promo ? { id: promo.id, code: promo.code } : null,
    addons: addons.map((a) => {
      const quantity = a.unit === "person" ? payingGuests : 1;
      return { id: a.id, name: a.name, quantity, amountCents: a.priceCents * quantity };
    }),
  };
}

/**
 * Creates a booking request ("pending"). One transaction: customer, promo redemption, seats,
 * the booking, its reservations, its first history event and the confirmation emails (as jobs).
 */
export async function createBooking(input: CreateBookingInput, now = new Date()): Promise<Booking> {
  // Same submit seen before (double-click, network retry): hand back that booking, change nothing
  const repeat = await findRepeat(input);
  if (repeat) return repeat;

  try {
    return await insertNewBooking(input, now);
  } catch (err) {
    // Two copies of one submit raced; the other one won. Its transaction holds the seats and promo use.
    if (input.idempotencyKey && isUniqueViolation(err, "bookings_idempotency_key_unique")) {
      const winner = await findRepeat(input);
      if (winner) return winner;
    }
    throw err;
  }
}

/** The booking an earlier copy of this submit created, if any. Only for the same guest email. */
async function findRepeat(input: CreateBookingInput): Promise<Booking | null> {
  if (!input.idempotencyKey) return null;
  const existing = await bookingRepository.findByIdempotencyKey(input.idempotencyKey);
  if (!existing) return null;
  if (existing.customerEmail !== input.email)
    throw new ValidationError("Please reload the page and try again.");
  logger.info(
    { event: "booking.duplicate_submit", reference: existing.reference },
    "repeated booking submit",
  );
  return existing;
}

async function insertNewBooking(input: CreateBookingInput, now: Date): Promise<Booking> {
  const { product, option, quote: q, promo, addons } = await priceSelection(input, now);
  const { rates } = await getSettings();
  const displayCurrency = input.displayCurrency as Currency;

  const booking = await withTransaction(async (tx) => {
    const customerId = await upsertCustomer(
      { email: input.email, name: input.customerName, phone: input.phone, country: input.country },
      tx,
    );
    if (promo && !(await redeemPromoCode(promo.id, tx)))
      throw new ValidationError("That promo code has been used up.");
    const reservations = await reserveSeats(tx, { productId: product.id, dates: q.dates, seats: q.seats });

    let created: Booking | undefined;
    for (let attempt = 0; !created; attempt++) {
      try {
        // Savepoint, so a reference collision doesn't abort the whole transaction
        created = await tx.transaction((sp) =>
          bookingRepository.insertBooking(
            {
              reference: makeReference(),
              idempotencyKey: input.idempotencyKey ?? null,
              productId: product.id,
              optionId: option?.id ?? null,
              customerId,
              productTitle: product.title,
              optionName: option?.name ?? "",
              category: product.category,
              travelDate: input.travelDate,
              endDate: (option ?? product).priceUnit === "night" ? input.endDate || null : null,
              adults: input.adults,
              children: input.children,
              infants: input.infants,
              units: q.units,
              unitPriceCents: (option ?? product).priceCents,
              subtotalCents: q.subtotalCents,
              discountCents: q.discountCents,
              totalCents: q.totalCents,
              depositCents: q.depositCents,
              currency: product.currency,
              displayCurrency,
              fxRate: String(rates[displayCurrency] ?? 1),
              priceLines: q.lines,
              addons,
              promoCodeId: promo?.id ?? null,
              promoCode: promo?.code ?? "",
              customerName: input.customerName,
              customerEmail: input.email,
              customerPhone: input.phone,
              customerCountry: input.country,
              pickupLocation: input.pickupLocation,
              notes: input.notes,
            },
            sp,
          ),
        );
      } catch (err) {
        if (!isUniqueViolation(err, "bookings_reference_unique") || attempt >= 2) throw err;
      }
    }
    await saveReservations(tx, created.id, reservations);
    await bookingRepository.insertEvent(
      { bookingId: created.id, fromStatus: null, toStatus: "pending", actorType: "guest" },
      tx,
    );
    await enqueueBookingEmail(tx, "booking.received", created.id);
    return created;
  });
  logger.info(
    {
      event: "booking.created",
      reference: booking.reference,
      productId: product.id,
      totalCents: booking.totalCents,
    },
    "booking created",
  );
  return booking;
}

/**
 * Moves a booking to another status. Rejects moves the state machine doesn't allow, gives seats
 * back when the booking stops holding them, and records who did it.
 */
export async function transitionBooking(input: {
  bookingId: number;
  to: BookingStatus;
  actor: Actor;
  note?: string;
  adminNotes?: string;
  notify?: boolean;
}): Promise<{ booking: Booking; changed: boolean }> {
  const result = await withTransaction(async (tx) => {
    const before = await bookingRepository.getBookingById(input.bookingId, tx, { forUpdate: true });
    if (!before) throw new NotFoundError("Booking not found");
    const changed = before.status !== input.to;
    if (changed) {
      try {
        assertTransition(before.status, input.to);
      } catch (err) {
        if (err instanceof IllegalTransitionError) throw new ValidationError(err.message);
        throw err;
      }
      if (releasesSeats(before.status, input.to)) await releaseSeats(tx, before.id);
      await bookingRepository.insertEvent(
        {
          bookingId: before.id,
          fromStatus: before.status,
          toStatus: input.to,
          actorType: input.actor.type,
          actorId: input.actor.id ?? null,
          note: input.note ?? "",
        },
        tx,
      );
      if (input.notify) await enqueueBookingEmail(tx, "booking.status", before.id);
      if (input.to === "completed") await enqueueReviewRequest(tx, before.id);
    }
    const booking = await bookingRepository.updateBooking(
      before.id,
      { status: input.to, ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}) },
      tx,
    );
    return { booking: booking!, changed };
  });
  if (result.changed) {
    logger.info(
      {
        event: "booking.status_changed",
        reference: result.booking.reference,
        to: input.to,
        actor: input.actor.type,
      },
      "booking status changed",
    );
  }
  return result;
}

/** Admin form: status change + internal notes */
export async function updateBookingStatus(input: {
  id: number;
  status: BookingStatus;
  adminNotes: string;
  note: string;
  notify: boolean;
  adminId: number;
}) {
  const { booking, changed } = await transitionBooking({
    bookingId: input.id,
    to: input.status,
    actor: { type: "admin", id: input.adminId },
    note: input.note,
    adminNotes: input.adminNotes,
    notify: input.notify,
  });
  return { booking, notified: input.notify && changed };
}

/** The guest's own view of a booking, checked against the access token in their link */
export async function getGuestBooking(reference: string, accessToken: string) {
  const ref = reference.toUpperCase();
  if (!/^WCT-[A-Z0-9]{6}$/.test(ref) || !verifyBookingAccessToken(ref, accessToken)) return null;
  return bookingRepository.findByReference(ref);
}

/** Whether the guest may cancel online right now */
export function guestCanCancel(
  booking: Pick<Booking, "status" | "category" | "travelDate">,
  now = new Date(),
) {
  if (booking.status === "pending") return true;
  return booking.status === "confirmed" && canCancelFree(booking.category, booking.travelDate, now);
}

/** Guest cancels from their booking page: always for a request, for a confirmed trip only while it's free */
export async function cancelByGuest(reference: string, accessToken: string) {
  const row = await getGuestBooking(reference, accessToken);
  if (!row) throw new NotFoundError("Booking not found");
  if (!guestCanCancel(row.booking)) {
    throw new ValidationError("Free cancellation has ended for this booking. Contact us and we'll help.");
  }
  return transitionBooking({
    bookingId: row.booking.id,
    to: "cancelled",
    actor: { type: "guest" },
    note:
      row.booking.paidCents > 0 ? "Guest cancelled online. Payment to refund." : "Guest cancelled online.",
    notify: true,
  });
}

/** Nightly job: requests nobody confirmed before the travel date become "expired" */
export async function expireStalePending(today: string): Promise<number> {
  const stale = await bookingRepository.listStalePending(today);
  for (const { id } of stale) {
    await transitionBooking({
      bookingId: id,
      to: "expired",
      actor: { type: "system" },
      note: "Not confirmed before the travel date.",
    });
  }
  return stale.length;
}

/** "Find my booking": returns the guest's private link when reference and email match */
export async function findGuestBookingLink(reference: string, email: string): Promise<string | null> {
  const booking = await bookingRepository.findByReferenceAndEmail(reference, email);
  return booking ? bookingPath(booking) : null;
}

export { listForAdmin, getBookingById, listForExport, listEvents } from "./booking.repository";
export { bookingLink as guestBookingLink } from "./booking-access";
