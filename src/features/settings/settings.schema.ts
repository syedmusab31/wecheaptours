import { z } from "zod";
import { CURRENCIES, type Currency } from "@/lib/money";
import { formCheckbox, formText } from "@/lib/validation";

export const contactSchema = z.object({
  phone: z.string().max(40).default(""),
  whatsapp: z.string().max(20).default(""),
  email: z.string().max(200).default(""),
  address: z.string().max(300).default(""),
  licence: z.string().max(300).default(""),
});
export type ContactSettings = z.infer<typeof contactSchema>;

export const ratesSchema = z.object(
  Object.fromEntries(CURRENCIES.map((c) => [c, z.number().positive()])) as Record<Currency, z.ZodNumber>,
);

/** Admin settings form. Rates arrive as `rate_EUR`, `rate_GBP`, … */
export const settingsFormSchema = z
  .object({
    phone: formText(z.string().max(40)),
    whatsapp: formText(z.string().max(30)).transform((s) => s.replace(/\D/g, "")),
    email: formText(z.string().max(200)),
    address: formText(z.string().max(300)),
    licence: formText(z.string().max(300)),
    demoMode: formCheckbox(),
    ...Object.fromEntries(
      CURRENCIES.map((c) => [
        `rate_${c}`,
        z.coerce
          .number({ invalid_type_error: `Enter a rate above 0 for ${c}` })
          .refine((v) => v > 0, `Enter a rate above 0 for ${c}`),
      ]),
    ),
  })
  .transform((f) => {
    const raw = f as Record<string, unknown>;
    return {
      contact: {
        phone: f.phone,
        whatsapp: f.whatsapp,
        email: f.email,
        address: f.address,
        licence: f.licence,
      },
      demoMode: f.demoMode,
      rates: Object.fromEntries(
        CURRENCIES.map((c) => [c, c === "USD" ? 1 : Number(raw[`rate_${c}`])]),
      ) as Record<Currency, number>,
    };
  });
export type SettingsFormInput = z.infer<typeof settingsFormSchema>;
