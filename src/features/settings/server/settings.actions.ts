"use server";

import { CACHE_TAGS, invalidate } from "@/server/cache";
import { adminFormAction } from "@/features/identity/server/admin-action";
import { settingsFormSchema } from "../settings.schema";
import * as settingsService from "./settings.service";

export const saveSettings = adminFormAction("settings:edit", settingsFormSchema, async (input) => {
  await settingsService.saveSettings(input);
  invalidate(CACHE_TAGS.settings);
  return { ok: true, message: "Settings saved." };
});
