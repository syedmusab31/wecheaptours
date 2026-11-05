"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminCommand, adminFormAction } from "@/features/identity/server/admin-action";
import { promoFormSchema } from "../promotion.schema";
import * as promoService from "./promo.service";

export const createPromoCode = adminFormAction("catalog:edit", promoFormSchema, async (input) => {
  await promoService.createPromoCode(input);
  revalidatePath("/admin/promo-codes");
  return { ok: true, message: `${input.code} created.` };
});

const toggle = adminCommand(
  "catalog:edit",
  z.object({ id: z.number().int().positive(), isActive: z.boolean() }),
  async (input) => {
    await promoService.setPromoActive(input.id, input.isActive);
    revalidatePath("/admin/promo-codes");
  },
);

export async function setPromoActive(id: number, isActive: boolean) {
  await toggle({ id, isActive });
}
