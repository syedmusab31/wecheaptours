"use server";

import { CACHE_TAGS, invalidate } from "@/server/cache";
import { redirect } from "next/navigation";
import { adminCommand, adminFormAction } from "@/features/identity/server/admin-action";
import { idSchema, productFormSchema, productToggleSchema } from "../catalog.schema";
import * as productService from "./product.service";

export const saveProduct = adminFormAction("catalog:edit", productFormSchema, async (input) => {
  await productService.saveProduct(input);
  invalidate(CACHE_TAGS.products);
  redirect("/admin/products?saved=1");
});

const toggle = adminCommand("catalog:edit", productToggleSchema, async ({ id, field, value }) => {
  await productService.setProductFlag(id, field, value);
  invalidate(CACHE_TAGS.products);
});

export async function toggleProduct(id: number, field: "isActive" | "isFeatured", value: boolean) {
  await toggle({ id, field, value });
}

const remove = adminCommand("catalog:edit", idSchema, async (id) => {
  await productService.removeProduct(id);
  invalidate(CACHE_TAGS.products);
});

export async function deleteProduct(id: number) {
  await remove(id);
  redirect("/admin/products");
}
