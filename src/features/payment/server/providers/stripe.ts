import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ValidationError } from "@/server/errors";
import type { PaymentEvent, PaymentProvider } from "../../payment.types";

const API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

/** Stripe over its REST API (no SDK). Cards in USD/EUR/GBP. */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {}

  private async call<T>(path: string, params: Record<string, string>, idempotencyKey?: string): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) throw new Error(`Stripe ${path} failed: ${data.error?.message ?? res.status}`);
    return data;
  }

  async createCheckout({
    booking,
    amountCents,
    kind,
    successUrl,
    cancelUrl,
  }: Parameters<PaymentProvider["createCheckout"]>[0]) {
    const label = kind === "deposit" ? "Deposit" : kind === "balance" ? "Balance" : "Payment";
    const session = await this.call<{ url: string }>(
      "/checkout/sessions",
      {
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: booking.customerEmail,
        client_reference_id: booking.reference,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": booking.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(amountCents),
        "line_items[0][price_data][product_data][name]": `${label} · ${booking.productTitle} · ${booking.reference}`,
        "metadata[booking_id]": String(booking.id),
        "metadata[kind]": kind,
        "payment_intent_data[metadata][booking_id]": String(booking.id),
        "payment_intent_data[metadata][kind]": kind,
      },
      // The same booking, kind and amount never opens two checkouts
      `checkout-${booking.id}-${kind}-${amountCents}`,
    );
    return { url: session.url };
  }

  async verifyWebhook(req: Request): Promise<PaymentEvent | null> {
    const body = await req.text();
    const header = req.headers.get("stripe-signature") ?? "";
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
    const timestamp = Number(parts.t);
    if (!timestamp || !parts.v1) throw new ValidationError("Missing Stripe signature");
    if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS)
      throw new ValidationError("Stale Stripe signature");
    const expected = Buffer.from(
      createHmac("sha256", this.webhookSecret).update(`${timestamp}.${body}`).digest("hex"),
    );
    const given = Buffer.from(parts.v1);
    if (expected.length !== given.length || !timingSafeEqual(expected, given))
      throw new ValidationError("Bad Stripe signature");

    const event = JSON.parse(body) as {
      type: string;
      data: { object: Record<string, unknown> & { metadata?: Record<string, string> } };
    };
    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.async_payment_succeeded"
    )
      return null;
    const session = event.data.object as {
      id: string;
      payment_intent?: string | null;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };
    const bookingId = Number(session.metadata?.booking_id);
    if (!bookingId) return null;
    return {
      provider: this.name,
      providerRef: session.payment_intent || session.id,
      bookingId,
      kind: (session.metadata?.kind as PaymentEvent["kind"]) ?? "full",
      amountCents: session.amount_total ?? 0,
      currency: (session.currency ?? "usd").toUpperCase(),
      status: session.payment_status === "paid" ? "succeeded" : "pending",
      raw: event,
    };
  }

  async refund({ payment, amountCents }: Parameters<PaymentProvider["refund"]>[0]) {
    const refund = await this.call<{ id: string }>("/refunds", {
      payment_intent: payment.providerRef,
      amount: String(amountCents),
    });
    return { refundRef: refund.id };
  }
}
