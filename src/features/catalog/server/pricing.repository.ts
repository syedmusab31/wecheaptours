import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { priceRules, productAddons, productOptions } from "@/server/db/schema";

export type NewProductOption = typeof productOptions.$inferInsert;
export type NewProductAddon = typeof productAddons.$inferInsert;
export type NewPriceRule = typeof priceRules.$inferInsert;

/** Options, add-ons and price rules of one product (active ones only unless `includeInactive`) */
export async function getPricingExtras(productId: number, opts: { includeInactive?: boolean } = {}) {
  const all = Boolean(opts.includeInactive);
  const [options, addons, rules] = await Promise.all([
    db
      .select()
      .from(productOptions)
      .where(
        and(eq(productOptions.productId, productId), all ? undefined : eq(productOptions.isActive, true)),
      )
      .orderBy(asc(productOptions.sortOrder), asc(productOptions.id)),
    db
      .select()
      .from(productAddons)
      .where(and(eq(productAddons.productId, productId), all ? undefined : eq(productAddons.isActive, true)))
      .orderBy(asc(productAddons.sortOrder), asc(productAddons.id)),
    db
      .select()
      .from(priceRules)
      .where(and(eq(priceRules.productId, productId), all ? undefined : eq(priceRules.isActive, true)))
      .orderBy(asc(priceRules.id)),
  ]);
  return { options, addons, rules };
}

export async function getAddonsByIds(productId: number, ids: number[]) {
  if (!ids.length) return [];
  return db
    .select()
    .from(productAddons)
    .where(
      and(
        eq(productAddons.productId, productId),
        eq(productAddons.isActive, true),
        inArray(productAddons.id, ids),
      ),
    );
}

export async function insertOption(values: NewProductOption) {
  const [row] = await db.insert(productOptions).values(values).returning();
  return row;
}

export async function insertAddon(values: NewProductAddon) {
  const [row] = await db.insert(productAddons).values(values).returning();
  return row;
}

export async function insertRule(values: NewPriceRule) {
  const [row] = await db.insert(priceRules).values(values).returning();
  return row;
}

/** Hides an option instead of deleting it: past bookings still reference it */
export async function deactivateOption(productId: number, id: number) {
  await db
    .update(productOptions)
    .set({ isActive: false })
    .where(and(eq(productOptions.id, id), eq(productOptions.productId, productId)));
}

export async function deleteAddon(productId: number, id: number) {
  await db.delete(productAddons).where(and(eq(productAddons.id, id), eq(productAddons.productId, productId)));
}

export async function deleteRule(productId: number, id: number) {
  await db.delete(priceRules).where(and(eq(priceRules.id, id), eq(priceRules.productId, productId)));
}
