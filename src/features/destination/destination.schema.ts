import { z } from "zod";
import { slugify } from "@/lib/utils";
import { formCheckbox, formInt, formText } from "@/lib/validation";
import { formImageList } from "@/features/catalog/catalog.schema";

/** Decimal degrees, e.g. 25.69; blank = not on the map */
const formCoordinate = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => {
      const t = String(v ?? "")
        .trim()
        .replace(",", ".");
      return t === "" ? null : Number(t);
    },
    z
      .number({ invalid_type_error: `${label} must be a number, e.g. 25.69` })
      .min(min, `${label} must be between ${min} and ${max}`)
      .max(max, `${label} must be between ${min} and ${max}`)
      .nullable(),
  );

export const destinationFormSchema = z
  .object({
    id: formInt(0),
    name: formText(z.string().min(2, "Enter a name").max(120)),
    slug: formText(z.string().max(80)),
    countryCode: formText(z.string().regex(/^[A-Z]{2}$/, "Choose a country")),
    tagline: formText(z.string().max(200)),
    description: formText(z.string().max(20_000)),
    images: formImageList(),
    latitude: formCoordinate(-90, 90, "Latitude"),
    longitude: formCoordinate(-180, 180, "Longitude"),
    sortOrder: formInt(0),
    isActive: formCheckbox(),
  })
  .refine((d) => (d.latitude === null) === (d.longitude === null), {
    message: "Enter both latitude and longitude, or neither.",
  })
  .transform(({ images, ...d }) => ({ ...d, slug: d.slug || slugify(d.name), image: images?.[0] ?? "" }))
  .refine((d) => /^[a-z0-9-]+$/.test(d.slug), {
    message: "Slug can only have lowercase letters, numbers and dashes",
  });
export type DestinationFormInput = z.infer<typeof destinationFormSchema>;

export const countryFormSchema = z.object({
  code: formText(z.string().regex(/^[A-Za-z]{2}$/, "Use the 2-letter ISO code, e.g. MA")).transform((s) =>
    s.toUpperCase(),
  ),
  name: formText(z.string().min(2, "Enter the country name").max(80)),
  currency: formText(z.string().regex(/^[A-Za-z]{3}$/, "Use the 3-letter currency code, e.g. MAD")).transform(
    (s) => s.toUpperCase(),
  ),
  sortOrder: formInt(0),
  isActive: formCheckbox(),
});
export type CountryFormInput = z.infer<typeof countryFormSchema>;
