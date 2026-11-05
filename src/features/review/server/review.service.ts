import "server-only";
import { CACHE_TAGS, cached } from "@/server/cache";
import { recomputeRating } from "@/features/catalog/server/product.repository";
import { withTransaction } from "@/server/db/transaction";
import type { ReviewFormInput } from "../review.schema";
import * as reviewRepository from "./review.repository";

// Each change and the product's rating update commit together, so the rating never drifts.

export async function addReview(input: ReviewFormInput) {
  return withTransaction(async (tx) => {
    const review = await reviewRepository.insertReview({ ...input, isPublished: true }, tx);
    await recomputeRating(input.productId, tx);
    return review;
  });
}

export async function setReviewPublished(id: number, published: boolean) {
  await withTransaction(async (tx) => {
    const review = await reviewRepository.setPublished(id, published, tx);
    if (review?.productId) await recomputeRating(review.productId, tx);
  });
}

export async function deleteReview(id: number) {
  await withTransaction(async (tx) => {
    const review = await reviewRepository.deleteReview(id, tx);
    if (review?.productId) await recomputeRating(review.productId, tx);
  });
}

const tags = [CACHE_TAGS.reviews];
export const getProductReviews = cached(reviewRepository.getProductReviews, "reviews:product", { tags });
export const getReviewStats = cached(reviewRepository.getReviewStats, "reviews:stats", { tags });
export const getLatestReviews = cached(reviewRepository.getLatestReviews, "reviews:latest", { tags });

export { listForAdmin as listReviewsForAdmin } from "./review.repository";
