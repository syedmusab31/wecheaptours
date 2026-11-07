import "server-only";
import { env } from "@/config/env";
import type { PaymentProvider } from "../../payment.types";
import { PaymobProvider } from "./paymob";
import { StripeProvider } from "./stripe";

/** A provider by name (webhooks and refunds use the one that took the payment), or null if not configured */
export function providerByName(name: string): PaymentProvider | null {
  if (name === "stripe" && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
    return new StripeProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET);
  }
  if (
    name === "paymob" &&
    env.PAYMOB_SECRET_KEY &&
    env.PAYMOB_PUBLIC_KEY &&
    env.PAYMOB_HMAC_SECRET &&
    env.PAYMOB_INTEGRATION_IDS.length
  ) {
    return new PaymobProvider({
      secretKey: env.PAYMOB_SECRET_KEY,
      publicKey: env.PAYMOB_PUBLIC_KEY,
      hmacSecret: env.PAYMOB_HMAC_SECRET,
      integrationIds: env.PAYMOB_INTEGRATION_IDS,
      currency: env.PAYMOB_CURRENCY,
      apiUrl: env.PAYMOB_API_URL,
    });
  }
  return null;
}

/** The provider new checkouts use: PAYMENT_PROVIDER, or the only one configured */
export function checkoutProvider(): PaymentProvider | null {
  if (env.PAYMENT_PROVIDER) return providerByName(env.PAYMENT_PROVIDER);
  return providerByName("stripe") ?? providerByName("paymob");
}
