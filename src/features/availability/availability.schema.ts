import { z } from "zod";
import { formInt, formIntList, formText, isoDate } from "@/lib/validation";
import { ANY_TIME } from "@/server/db/schema";

const time = formText(
  z.union([z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM, e.g. 09:00"), z.literal("")]),
).transform((s) => (s ? `${s}:00` : ANY_TIME));

export const generateSlotsSchema = z
  .object({
    productId: formInt(0, z.number().int().positive()),
    from: formText(isoDate),
    to: formText(isoDate),
    capacity: formInt(0, z.number().int().min(1, "Capacity must be at least 1").max(10_000)),
    startTime: time,
    /** Checkbox group named "weekdays", values 0 (Sunday) … 6 */
    weekdays: formIntList().pipe(z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one weekday")),
  })
  .refine((v) => v.from <= v.to, { message: "The end date is before the start date." });

export const dayStatusSchema = z.object({
  productId: z.number().int().positive(),
  date: isoDate,
  status: z.enum(["open", "closed"]),
});

export const clearSlotsSchema = z.object({
  productId: formInt(0, z.number().int().positive()),
  from: formText(isoDate),
  to: formText(isoDate),
});
