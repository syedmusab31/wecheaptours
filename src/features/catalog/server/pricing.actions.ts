"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidate } from "@/server/cache";
import { adminCommand, adminFormAction } from "@/features/identity/server/admin-action";
import { toCents } from "@/lib/money";
import { addonFormSchema, extraRefSchema, optionFormSchema, ruleFormSchema } from "../pricing.schema";
import * as pricingRepository from "./pricing.repository";

const refresh = (productId: number) => {
  revalidatePath(`/admin/products/${productId}/pricing`);
  invalidate(CACHE_TAGS.products);
};

export const addOption = adminFormAction("catalog:edit", optionFormSchema, async ({ price, ...input }) => {
  await pricingRepository.insertOption({ ...input, priceCents: toCents(price) });
  refresh(input.productId);
  return { ok: true, message: `Option "${input.name}" added.` };
});

export const addAddon = adminFormAction("catalog:edit", addonFormSchema, async ({ price, ...input }) => {
  await pricingRepository.insertAddon({ ...input, priceCents: toCents(price) });
  refresh(input.productId);
  return { ok: true, message: `Extra "${input.name}" added.` };
});

export const addRule = adminFormAction(
  "catalog:edit",
  ruleFormSchema,
  async ({ weekdays, percentChange, ...input }) => {
    await pricingRepository.insertRule({
      ...input,
      weekdays: weekdays.length ? weekdays : null,
      percentChange: String(percentChange),
    });
    refresh(input.productId);
    return { ok: true, message: `Rule "${input.name}" added.` };
  },
);

const removeOption = adminCommand("catalog:edit", extraRefSchema, async ({ productId, id }) => {
  await pricingRepository.deactivateOption(productId, id);
  refresh(productId);
});
const removeAddon = adminCommand("catalog:edit", extraRefSchema, async ({ productId, id }) => {
  await pricingRepository.deleteAddon(productId, id);
  refresh(productId);
});
const removeRule = adminCommand("catalog:edit", extraRefSchema, async ({ productId, id }) => {
  await pricingRepository.deleteRule(productId, id);
  refresh(productId);
});

export async function removePricingItem(kind: "option" | "addon" | "rule", productId: number, id: number) {
  const fn = kind === "option" ? removeOption : kind === "addon" ? removeAddon : removeRule;
  await fn({ productId, id });
}
