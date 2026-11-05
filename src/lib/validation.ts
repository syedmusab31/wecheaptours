import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

export const bookingSchema = z.object({
  productId: z.coerce.number().int().positive(),
  travelDate: isoDate,
  endDate: isoDate.optional().nullable().or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(50),
  children: z.coerce.number().int().min(0).max(50).default(0),
  infants: z.coerce.number().int().min(0).max(20).default(0),
  customerName: z.string().trim().min(2, "Enter your full name").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a phone or WhatsApp number").max(40),
  country: z.string().trim().max(80).default(""),
  pickupLocation: z.string().trim().max(240).default(""),
  notes: z.string().trim().max(2000).default(""),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the booking terms" }) }),
  // Honeypot: real people never fill this in
  website: z.string().max(0).optional().or(z.literal("")),
});

export const enquirySchema = z.object({
  topic: z.enum(["general", "package", "concierge", "event", "product"]).default("general"),
  productId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().trim().min(2, "Enter your name").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(40).default(""),
  travelDate: isoDate.optional().nullable().or(z.literal("")),
  guests: z.coerce.number().int().min(1).max(500).optional().nullable(),
  budget: z.string().trim().max(60).default(""),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  website: z.string().max(0).optional().or(z.literal("")),
});

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Please check the form";
}
