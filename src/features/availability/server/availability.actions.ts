"use server";

import { revalidatePath } from "next/cache";
import { adminCommand, adminFormAction } from "@/features/identity/server/admin-action";
import { clearSlotsSchema, dayStatusSchema, generateSlotsSchema } from "../availability.schema";
import * as availabilityService from "./availability.service";

export const generateSlots = adminFormAction("catalog:edit", generateSlotsSchema, async (input) => {
  const count = await availabilityService.generateSlots(input);
  revalidatePath(`/admin/products/${input.productId}/availability`);
  return { ok: true, message: `${count} dates saved.` };
});

const dayStatus = adminCommand("catalog:edit", dayStatusSchema, async (input) => {
  await availabilityService.setDayStatus(input.productId, input.date, input.status);
  revalidatePath(`/admin/products/${input.productId}/availability`);
});

export async function setDayStatus(productId: number, date: string, status: "open" | "closed") {
  await dayStatus({ productId, date, status });
}

export const clearSlots = adminFormAction("catalog:edit", clearSlotsSchema, async (input) => {
  const count = await availabilityService.deleteEmptySlots(input.productId, input.from, input.to);
  revalidatePath(`/admin/products/${input.productId}/availability`);
  return { ok: true, message: `${count} empty dates removed. Dates with bookings were kept.` };
});
