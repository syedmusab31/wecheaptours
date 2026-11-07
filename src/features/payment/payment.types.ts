import type { Booking, Payment, PaymentKind } from "@/server/db/schema";

/** What a provider tells us happened, already verified */
/**
 * `amountCents` and `currency` are always in the booking's currency, so payments can be added up.
 * A provider that charged another currency puts the charged amount in `raw`.
 */
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
    /** Display rates (1 USD = x), for providers that charge in another currency */
    rates: Record<string, number>;
  }): Promise<{ url: string }>;
  /** Verifies the webhook signature and returns the payment event, or null for events we ignore */
  verifyWebhook(req: Request): Promise<PaymentEvent | null>;
  /** Refunds part or all of `payment`. `amountCents` is in the booking's currency, like every payment record. */
  refund(input: { payment: Payment; amountCents: number }): Promise<{ refundRef: string }>;
}
