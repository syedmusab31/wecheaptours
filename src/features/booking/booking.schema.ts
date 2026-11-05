import { z } from "zod";
import { formCheckbox, formInt, formText, isoDate } from "@/lib/validation";
import { bookingStatusEnum } from "@/server/db/schema";
import { CURRENCIES } from "@/lib/money";

/** Body of POST /api/bookings (a guest's booking request) */
export const createBookingSchema = z.object({
  productId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive().nullish(),
  addonIds: z.array(z.coerce.number().int().positive()).max(20).default([]),
  promoCode: z.string().trim().max(40).nullish(),
  travelDate: isoDate,
  endDate: isoDate.optional().nullable().or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(50),
  children: z.coerce.number().int().min(0).max(50).default(0),
  infants: z.coerce.number().int().min(0).max(20).default(0),
  customerName: z.string().trim().min(2, "Enter your full name").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone: z.string().trim().min(6, "Enter a phone or WhatsApp number").max(40),
  country: z.string().trim().max(80).default(""),
  pickupLocation: z.string().trim().max(240).default(""),
  notes: z.string().trim().max(2000).default(""),
  displayCurrency: z.enum(CURRENCIES).default("USD"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the booking terms" }) }),
  // Honeypot: real people never fill this in
  website: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().max(4096).nullish(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** Body of POST /api/v1/quote: the same selection, priced without booking */
export const quoteRequestSchema = createBookingSchema.pick({
  productId: true,
  optionId: true,
  addonIds: true,
  promoCode: true,
  travelDate: true,
  endDate: true,
  adults: true,
  children: true,
  infants: true,
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

/** Admin form: move a booking to another status and/or edit internal notes */
export const updateBookingStatusSchema = z.object({
  id: formInt(0, z.number().int().positive("Booking not found")),
  status: z.enum(bookingStatusEnum.enumValues, { errorMap: () => ({ message: "Unknown status" }) }),
  adminNotes: formText(z.string().max(4000)),
  note: formText(z.string().max(1000)),
  notify: formCheckbox(),
});

/** Admin form: record a payment taken outside the website (cash, bank transfer) */
export const manualPaymentSchema = z.object({
  bookingId: formInt(0, z.number().int().positive()),
  kind: z.enum(["deposit", "balance", "full", "refund"]),
  amount: z.coerce
    .number({ invalid_type_error: "Enter the amount" })
    .positive("Enter the amount")
    .max(1_000_000),
  note: formText(z.string().max(500)),
});

/** Guest form: find a booking by reference and email */
export const lookupBookingSchema = z.object({
  reference: formText(z.string().max(20)).transform((s) => s.toUpperCase()),
  email: formText(z.string().max(200)).transform((s) => s.toLowerCase()),
});

/** Guest action on their booking page */
export const guestBookingActionSchema = z.object({
  reference: formText(z.string().regex(/^WCT-[A-Z0-9]{6}$/i)).transform((s) => s.toUpperCase()),
  token: formText(z.string().min(10).max(200)),
});
