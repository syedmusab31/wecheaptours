"use server";

import { CACHE_TAGS, invalidate } from "@/server/cache";
import { redirect } from "next/navigation";
import { adminFormAction } from "@/features/identity/server/admin-action";
import { countryFormSchema, destinationFormSchema } from "../destination.schema";
import * as destinationService from "./destination.service";

export const saveDestination = adminFormAction("catalog:edit", destinationFormSchema, async (input) => {
  await destinationService.saveDestination(input);
  invalidate(CACHE_TAGS.destinations);
  redirect("/admin/destinations");
});

export const saveCountry = adminFormAction("catalog:edit", countryFormSchema, async (input) => {
  await destinationService.saveCountry(input);
  invalidate(CACHE_TAGS.destinations);
  return { ok: true, message: `${input.name} saved.` };
});
