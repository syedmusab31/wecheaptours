import "server-only";
import type { PromoCode } from "@/server/db/schema";
import { ConflictError, ValidationError } from "@/server/errors";
import type { PromoFormInput } from "../promotion.schema";
import * as promoRepository from "./promo.repository";

/** Checks a code for a trip on `travelDate`. Throws a guest-readable message when it can't be used. */
export async function validatePromoCode(code: string, travelDate: string): Promise<PromoCode> {
  const promo = await promoRepository.findByCode(code.trim());
  if (!promo || !promo.isActive) throw new ValidationError("That promo code isn't valid.");
  if (promo.startsOn && travelDate < promo.startsOn)
    throw new ValidationError("That promo code isn't valid for this date.");
  if (promo.endsOn && travelDate > promo.endsOn) throw new ValidationError("That promo code has expired.");
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses)
    throw new ValidationError("That promo code has been used up.");
  return promo;
}

export async function createPromoCode(input: PromoFormInput) {
  const created = await promoRepository.insertPromoCode({
    code: input.code,
    description: input.description,
    percentOff: input.kind === "percent" ? Math.round(input.value) : null,
    amountOffCents: input.kind === "amount" ? Math.round(input.value * 100) : null,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    maxUses: input.maxUses,
  });
  if (!created) throw new ConflictError(`${input.code} already exists.`);
  return created;
}

export { listPromoCodes, setPromoActive, redeem as redeemPromoCode } from "./promo.repository";
