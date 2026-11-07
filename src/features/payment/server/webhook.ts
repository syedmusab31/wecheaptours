import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";
import { requestLogger } from "@/server/logger";
import { providerByName, recordPayment } from "./payment.service";

/** Verifies and records a provider callback. Safe to receive twice: payments are unique by provider reference. */
export async function handlePaymentWebhook(providerName: "stripe" | "paymob", req: Request) {
  const provider = providerByName(providerName);
  if (!provider) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const log = await requestLogger({ route: `webhooks/${providerName}` });
  try {
    const event = await provider.verifyWebhook(req);
    if (!event) return NextResponse.json({ received: true, ignored: true });
    const { duplicate } = await recordPayment(event);
    return NextResponse.json({ received: true, duplicate });
  } catch (err) {
    if (err instanceof AppError) {
      log.warn({ event: "webhook.rejected", reason: err.message }, `${providerName} webhook rejected`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
