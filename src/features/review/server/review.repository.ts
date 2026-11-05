import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { products, reviews } from "@/server/db/schema";

export type NewReview = typeof reviews.$inferInsert;

export async function getProductReviews(productId: number, limit = 6) {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isPublished, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function getReviewStats() {
  const [row] = await db
    .select({ avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.isPublished, true));
  return { avg: Number(row?.avg ?? 0), count: row?.count ?? 0 };
}

export async function getLatestReviews(limit = 6) {
  return db
    .select({
      review: reviews,
      productTitle: products.title,
      productSlug: products.slug,
      category: products.category,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(reviews.isPublished, true), gte(reviews.rating, 4)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// ── Admin ───────────────────────────────────────────────────────────────

export async function listForAdmin() {
  return db
    .select({ review: reviews, productTitle: products.title })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt));
}

export async function insertReview(values: NewReview, exec: Executor = db) {
  const [row] = await exec.insert(reviews).values(values).returning();
  return row;
}

export async function setPublished(id: number, isPublished: boolean, exec: Executor = db) {
  const [row] = await exec.update(reviews).set({ isPublished }).where(eq(reviews.id, id)).returning();
  return row ?? null;
}

export async function deleteReview(id: number, exec: Executor = db) {
  const [row] = await exec.delete(reviews).where(eq(reviews.id, id)).returning();
  return row ?? null;
}
