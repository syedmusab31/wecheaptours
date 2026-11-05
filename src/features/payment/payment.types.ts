import type { Booking, PaymentKind } from "@/server/db/schema";

/** What a provider tells us happened, already verified */
export type PaymentEvent = {
  provider: string;
  providerRef: string;
  bookingId: number;
  kind: PaymentKind;
  amountCents: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  raw: unknown;
};

/**
 * One interface for every payment provider, so Paymob (EGP cards, wallets) or PayPal can be added
 * next to Stripe without touching the booking code.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    booking: Booking;
    amountCents: number;
    kind: "deposit" | "balance" | "full";
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  /** Verifies the webhook signature and returns the payment event, or null for events we ignore */
  verifyWebhook(req: Request): Promise<PaymentEvent | null>;
  refund(input: { providerRef: string; amountCents: number }): Promise<{ refundRef: string }>;
}
