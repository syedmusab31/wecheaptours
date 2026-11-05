import { z } from "zod";
import { formInt, formIntList, formText, isoDate } from "@/lib/validation";
import { addonUnitEnum, priceUnitEnum } from "@/server/db/schema";

const money = z.coerce.number({ invalid_type_error: "Enter a price" }).min(0).max(1_000_000);
const optionalDate = formText(z.union([isoDate, z.literal("")])).transform((s) => s || null);

export const optionFormSchema = z
  .object({
    productId: formInt(0, z.number().int().positive()),
    name: formText(z.string().min(2, "Name the option").max(120)),
    description: formText(z.string().max(300)),
    price: money.refine((v) => v > 0, "Price must be more than 0"),
    priceUnit: z.enum(priceUnitEnum.enumValues),
    minGuests: formInt(1, z.number().int().min(1)),
    maxGuests: formInt(12, z.number().int().min(1)),
    sortOrder: formInt(0),
  })
  .refine((o) => o.minGuests <= o.maxGuests, {
    message: "Minimum guests can't be more than maximum guests.",
  });

export const addonFormSchema = z.object({
  productId: formInt(0, z.number().int().positive()),
  name: formText(z.string().min(2, "Name the extra").max(120)),
  price: money.refine((v) => v > 0, "Price must be more than 0"),
  unit: z.enum(addonUnitEnum.enumValues),
  sortOrder: formInt(0),
});

export const ruleFormSchema = z
  .object({
    productId: formInt(0, z.number().int().positive()),
    optionId: formInt(null, z.number().int().positive()),
    name: formText(z.string().min(2, "Name the rule, e.g. Christmas week").max(120)),
    startsOn: optionalDate,
    endsOn: optionalDate,
    weekdays: formIntList().pipe(z.array(z.number().int().min(0).max(6))),
    minGuests: formInt(null, z.number().int().min(1)),
    percentChange: z.coerce
      .number({ invalid_type_error: "Enter a percentage, e.g. 25 or -10" })
      .min(-90, "At most −90%")
      .max(500, "At most +500%")
      .refine((v) => v !== 0, "Enter a percentage other than 0"),
  })
  .refine((r) => !r.startsOn || !r.endsOn || r.startsOn <= r.endsOn, {
    message: "The end date is before the start date.",
  });

export const extraRefSchema = z.object({
  productId: z.number().int().positive(),
  id: z.number().int().positive(),
});
