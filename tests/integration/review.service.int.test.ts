import { eq } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import { describeDb, resetDatabase } from "./helpers";
import { createProduct } from "./fixtures";

describeDb("review.service", () => {
  beforeEach(resetDatabase);

  it("keeps the product rating in step with published reviews", async () => {
    const { db } = await import("@/server/db/client");
    const { products } = await import("@/server/db/schema");
    const reviews = await import("@/features/review/server/review.service");
    const product = await createProduct();
    const base = { productId: product.id, title: "", authorName: "A", authorCountry: "", travelMonth: "" };

    const five = await reviews.addReview({ ...base, rating: 5, body: "Wonderful day" });
    await reviews.addReview({ ...base, rating: 3, body: "Good but long" });
    const rating = async () => (await db.select().from(products).where(eq(products.id, product.id)))[0];
    expect(await rating()).toMatchObject({ rating: "4.0", reviewCount: 2 });

    await reviews.setReviewPublished(five.id, false);
    expect(await rating()).toMatchObject({ rating: "3.0", reviewCount: 1 });

    await reviews.deleteReview(five.id);
    expect(await rating()).toMatchObject({ rating: "3.0", reviewCount: 1 });
  });
});
