import { z } from "zod";
import { slugify } from "@/lib/utils";
import { formCheckbox, formInt, formLines, formList, formText } from "@/lib/validation";
import { categoryEnum, priceUnitEnum, type ItineraryStep } from "@/server/db/schema";

/** Hosts we serve images from (see next.config.ts `images.remotePatterns`) */
export const IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com"];

/**
 * Cloudinary images must come from our own account (when it is configured), so photos from
 * someone else's account can't be pasted in. Unsplash stays allowed for the demo photos.
 */
export function isAllowedImageUrl(
  url: string,
  cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !IMAGE_HOSTS.includes(u.hostname)) return false;
    if (u.hostname === "res.cloudinary.com" && cloudName) return u.pathname.startsWith(`/${cloudName}/`);
    return true;
  } catch {
    return false;
  }
}

/** The image uploader posts a JSON array of URLs in a hidden field */
export const formImageList = () =>
  z.preprocess(
    (v) => {
      try {
        const list = JSON.parse(String(v ?? "") || "[]");
        return Array.isArray(list) ? list : null;
      } catch {
        return null;
      }
    },
    z
      .array(
        z
          .string()
          .refine((u) => isAllowedImageUrl(u), "Images must be uploaded here (or be Unsplash links)."),
      )
      .max(30, { message: "Up to 30 photos per product." })
      .nullable()
      .refine((v) => v !== null, "Images could not be read. Remove and add them again."),
  );

/** Itinerary textarea: one step per line → "09:00 | Title | Detail" or "Title | Detail" */
export function parseItinerary(lines: string[]): ItineraryStep[] {
  return lines.map((line) => {
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length >= 3) {
      return {
        time: parts[0] || undefined,
        title: parts[1],
        detail: parts.slice(2).join(" | ") || undefined,
      };
    }
    if (parts.length === 2) {
      return /^\d{1,2}:\d{2}$/.test(parts[0])
        ? { time: parts[0], title: parts[1] }
        : { title: parts[0], detail: parts[1] };
    }
    return { title: parts[0] };
  });
}

const SLUG = /^[a-z0-9-]+$/;

export const productFormSchema = z
  .object({
    id: formInt(0),
    title: formText(z.string().min(3, "Title is too short").max(200)),
    slug: formText(z.string().max(140)),
    category: z.enum(categoryEnum.enumValues),
    priceUnit: z.enum(priceUnitEnum.enumValues),
    price: z.coerce
      .number({ invalid_type_error: "Enter a price" })
      .positive("Price must be more than 0")
      .max(1_000_000),
    destinationId: formInt(null, z.number().int().positive()),
    minGuests: formInt(1, z.number().int().min(1)),
    maxGuests: formInt(12, z.number().int().min(1)),
    summary: formText(z.string().max(300)),
    description: formText(z.string().max(20_000)),
    images: formImageList(),
    durationLabel: formText(z.string().max(80)),
    /** Entered in hours (decimals allowed, e.g. 1.5), stored in minutes */
    durationHours: z.coerce.number().min(0).max(10_000).default(8),
    highlights: formLines(),
    included: formLines(),
    excluded: formLines(),
    itinerary: formLines().transform(parseItinerary),
    tags: formList().transform((tags) => tags.map(slugify).filter(Boolean)),
    languages: formList(),
    meetingPoint: formText(z.string().max(2000)),
    isPrivate: formCheckbox(),
    pickupIncluded: formCheckbox(),
    bedrooms: formInt(null, z.number().int().min(0)),
    minNights: formInt(1, z.number().int().min(1)),
    isFeatured: formCheckbox(),
    isActive: formCheckbox(),
  })
  .transform((p) => ({
    ...p,
    slug: p.slug || slugify(p.title),
    destinationId: p.destinationId || null,
    images: p.images ?? [],
  }))
  .refine((p) => SLUG.test(p.slug), { message: "Slug can only have lowercase letters, numbers and dashes" })
  .refine((p) => p.minGuests <= p.maxGuests, {
    message: "Minimum guests can't be more than maximum guests.",
  });
export type ProductFormInput = z.infer<typeof productFormSchema>;

export const productToggleSchema = z.object({
  id: z.number().int().positive(),
  field: z.enum(["isActive", "isFeatured"]),
  value: z.boolean(),
});

export const idSchema = z.number().int().positive();
