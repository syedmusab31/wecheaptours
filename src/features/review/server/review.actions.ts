"use server";

import { CACHE_TAGS, invalidate } from "@/server/cache";
import { z } from "zod";
import { adminCommand, adminFormAction } from "@/features/identity/server/admin-action";
import { reviewFormSchema } from "../review.schema";
import * as reviewService from "./review.service";

export const saveReview = adminFormAction("review:edit", reviewFormSchema, async (input) => {
  await reviewService.addReview(input);
  invalidate(CACHE_TAGS.reviews, CACHE_TAGS.products);
  return { ok: true, message: "Review added." };
});

const publish = adminCommand(
  "review:edit",
  z.object({ id: z.number().int().positive(), published: z.boolean() }),
  async (input) => {
    await reviewService.setReviewPublished(input.id, input.published);
    invalidate(CACHE_TAGS.reviews, CACHE_TAGS.products);
  },
);

export async function setReviewPublished(id: number, published: boolean) {
  await publish({ id, published });
}

const remove = adminCommand("review:edit", z.number().int().positive(), async (id) => {
  await reviewService.deleteReview(id);
  invalidate(CACHE_TAGS.reviews, CACHE_TAGS.products);
});

export async function deleteReview(id: number) {
  await remove(id);
}
