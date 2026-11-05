import { NextResponse } from "next/server";
import { quoteRequestSchema } from "@/features/booking/booking.schema";
import { priceSelection } from "@/features/booking/server/booking.service";
import { firstError } from "@/lib/validation";
import { readJson, toErrorResponse } from "@/server/http";

export const runtime = "nodejs";

/** Prices a selection (option, add-ons, promo code) exactly as a booking would, without booking. */
export async function POST(req: Request) {
  const parsed = quoteRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
  try {
    const { quote, promo, option } = await priceSelection(parsed.data);
    return NextResponse.json({
      ok: true,
      option: option ? { id: option.id, name: option.name } : null,
      promoCode: promo?.code ?? null,
      lines: quote.lines,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
      depositCents: quote.depositCents,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
