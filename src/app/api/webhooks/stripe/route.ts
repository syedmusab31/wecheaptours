import { handlePaymentWebhook } from "@/features/payment/server/webhook";

export const runtime = "nodejs";

/** Stripe calls this after a checkout (event: checkout.session.completed) */
export async function POST(req: Request) {
  return handlePaymentWebhook("stripe", req);
}
