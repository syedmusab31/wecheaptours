import { z } from "zod";
import { formInt, formText, isoDate } from "@/lib/validation";

const optionalDate = formText(z.union([isoDate, z.literal("")])).transform((s) => s || null);

export const promoFormSchema = z
  .object({
    code: formText(z.string().regex(/^[A-Za-z0-9_-]{3,40}$/, "Use 3–40 letters, digits, - or _")).transform(
      (s) => s.toUpperCase(),
    ),
    description: formText(z.string().max(200)),
    kind: z.enum(["percent", "amount"]),
    value: z.coerce.number({ invalid_type_error: "Enter the discount" }).positive("Enter the discount"),
    startsOn: optionalDate,
    endsOn: optionalDate,
    maxUses: formInt(null, z.number().int().positive()),
  })
  .refine((p) => p.kind !== "percent" || p.value <= 100, { message: "A percentage can't be over 100." })
  .refine((p) => !p.startsOn || !p.endsOn || p.startsOn <= p.endsOn, {
    message: "The end date is before the start date.",
  });
export type PromoFormInput = z.infer<typeof promoFormSchema>;
