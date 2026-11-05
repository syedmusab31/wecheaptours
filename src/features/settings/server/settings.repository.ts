import "server-only";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";

export async function getAllSettings() {
  return db.select().from(settings);
}

export async function upsertSettings(entries: Record<string, unknown>) {
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(entries)) {
      await tx
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    }
  });
}
