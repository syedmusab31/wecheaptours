import "server-only";
import { countForProduct } from "@/features/booking/server/booking.repository";
import { withTransaction } from "@/server/db/transaction";
import { toCents } from "@/lib/money";
import { isUniqueViolation } from "@/server/db/errors";
import { ConflictError, NotFoundError } from "@/server/errors";
import type { ProductFormInput } from "../catalog.schema";
import * as productRepository from "./product.repository";

export async function saveProduct(input: ProductFormInput) {
  const { id, price, durationHours, ...rest } = input;
  const values = { ...rest, priceCents: toCents(price), durationMinutes: Math.round(durationHours * 60) };
  try {
    if (id) {
      const updated = await productRepository.updateProduct(id, values);
      if (!updated) throw new NotFoundError("Product not found");
      return updated;
    }
    return await productRepository.insertProduct(values);
  } catch (err) {
    if (isUniqueViolation(err, "products_slug_unique")) {
      throw new ConflictError("Another product already uses this slug. Change it.");
    }
    throw err;
  }
}

export async function setProductFlag(id: number, field: "isActive" | "isFeatured", value: boolean) {
  await productRepository.updateProduct(
    id,
    field === "isActive" ? { isActive: value } : { isFeatured: value },
  );
}

/** Deletes a product, or hides it when bookings reference it (booking history stays intact). */
export async function removeProduct(id: number): Promise<"deleted" | "hidden"> {
  return withTransaction(async (tx) => {
    if ((await countForProduct(id, tx)) > 0) {
      await productRepository.updateProduct(id, { isActive: false }, tx);
      return "hidden";
    }
    await productRepository.deleteProduct(id, tx);
    return "deleted";
  });
}
