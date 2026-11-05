import { z } from "zod";
import { isoDate } from "@/lib/validation";

export const ENQUIRY_TOPICS = ["general", "package", "concierge", "event", "product"] as const;

/** Body of POST /api/enquiries */
export const createEnquirySchema = z.object({
  topic: z.enum(ENQUIRY_TOPICS).default("general"),
  productId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().trim().min(2, "Enter your name").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(40).default(""),
  travelDate: isoDate.optional().nullable().or(z.literal("")),
  guests: z.coerce.number().int().min(1).max(500).optional().nullable(),
  budget: z.string().trim().max(60).default(""),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  website: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().max(4096).nullish(),
});
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
