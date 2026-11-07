import { handlePaymentWebhook } from "@/features/payment/server/webhook";

export const runtime = "nodejs";

/** Paymob's "transaction processed" callback (HMAC in the `hmac` query parameter) */
export async function POST(req: Request) {
  return handlePaymentWebhook("paymob", req);
}
