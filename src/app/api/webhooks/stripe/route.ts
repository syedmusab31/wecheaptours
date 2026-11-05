import { NextResponse } from "next/server";
import { onlineProvider, recordPayment } from "@/features/payment/server/payment.service";
import { AppError } from "@/server/errors";
import { requestLogger } from "@/server/logger";

export const runtime = "nodejs";

/** Stripe calls this after a checkout. Safe to receive twice: payments are unique by provider reference. */
export async function POST(req: Request) {
  const provider = onlineProvider();
  if (!provider) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const log = await requestLogger({ route: "webhooks/stripe" });
  try {
    const event = await provider.verifyWebhook(req);
    if (!event) return NextResponse.json({ received: true, ignored: true });
    const { duplicate } = await recordPayment(event);
    return NextResponse.json({ received: true, duplicate });
  } catch (err) {
    if (err instanceof AppError) {
      log.warn({ event: "webhook.rejected", reason: err.message }, "stripe webhook rejected");
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
