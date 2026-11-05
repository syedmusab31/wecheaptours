import { NextResponse } from "next/server";
import { startGuestCheckout } from "@/features/payment/server/payment.service";
import { AppError } from "@/server/errors";

export const runtime = "nodejs";

/** The "Pay deposit" link in the confirmation email: opens the provider's checkout page */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  try {
    return NextResponse.redirect(await startGuestCheckout(ref, token), { status: 303 });
  } catch (err) {
    if (err instanceof AppError) {
      const back = new URL(`/booking/${ref}`, url);
      back.searchParams.set("t", token);
      back.searchParams.set("payError", err.message);
      return NextResponse.redirect(back, { status: 303 });
    }
    throw err;
  }
}
