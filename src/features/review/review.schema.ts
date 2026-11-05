import { z } from "zod";
import { formInt, formText } from "@/lib/validation";

export const reviewFormSchema = z.object({
  productId: formInt(0, z.number().int().positive("Choose the trip this review is for")),
  rating: formInt(5, z.number().int().min(1, "Rating must be 1 to 5").max(5, "Rating must be 1 to 5")),
  body: formText(z.string().min(5, "Add the review text").max(4000)),
  title: formText(z.string().max(160)),
  authorName: formText(z.string().max(120)).transform((s) => s || "Guest"),
  authorCountry: formText(z.string().max(80)),
  travelMonth: formText(z.string().max(40)),
});
export type ReviewFormInput = z.infer<typeof reviewFormSchema>;
