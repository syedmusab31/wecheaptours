import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ValidationError } from "@/server/errors";
import type { PaymentEvent, PaymentProvider } from "../../payment.types";

/**
 * Paymob (Egypt): cards, Meeza, mobile wallets and installments, charged in EGP.
 * Uses the Intention API and Paymob's Unified Checkout page.
 * https://developers.paymob.com/egypt/api-reference-guide
 *
 * Bookings are priced in USD, so the due amount is converted with the site's EGP display rate when the
 * checkout opens. The payment is recorded in the booking's currency; the EGP charged is kept in `raw`
 * and used again for refunds.
 */
export type PaymobConfig = {
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  integrationIds: number[];
  currency: string;
  apiUrl: string;
};

/** The transaction fields Paymob signs, in the order its HMAC uses */
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

type Transaction = Record<string, unknown> & {
  id?: number;
  amount_cents?: number;
  currency?: string;
  success?: boolean;
  pending?: boolean;
  is_refunded?: boolean;
  is_voided?: boolean;
  order?: { id?: number; merchant_order_id?: string };
};

function pick(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (v, k) => (v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined),
      obj,
    );
}

/** HMAC-SHA512 over the signed transaction fields (booleans as "true"/"false") */
export function paymobHmac(obj: Record<string, unknown>, secret: string): string {
  const joined = HMAC_FIELDS.map((f) => {
    const v = pick(obj, f);
    return v === undefined || v === null ? "" : String(v);
  }).join("");
  return createHmac("sha512", secret).update(joined).digest("hex");
}

/**
 * Our reference on the Paymob order: "<bookingId>-<kind>-<amount in booking cents>-<time>".
 * It carries what the payment is for back to us in the webhook.
 */
export function makeMerchantReference(
  bookingId: number,
  kind: string,
  bookingCents: number,
  now = Date.now(),
) {
  return `wct-${bookingId}-${kind}-${bookingCents}-${now}`;
}

export function parseMerchantReference(ref: string | undefined) {
  const m = /^wct-(\d+)-(deposit|balance|full)-(\d+)-\d+$/.exec(ref ?? "");
  return m
    ? { bookingId: Number(m[1]), kind: m[2] as "deposit" | "balance" | "full", bookingCents: Number(m[3]) }
    : null;
}

export class PaymobProvider implements PaymentProvider {
  readonly name = "paymob";

  constructor(private readonly config: PaymobConfig) {}

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.apiUrl}${path}`, {
      method: "POST",
      headers: { authorization: `Token ${this.config.secretKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as T & { detail?: string; message?: string };
    if (!res.ok) throw new Error(`Paymob ${path} failed: ${data.detail ?? data.message ?? res.status}`);
    return data;
  }

  async createCheckout({
    booking,
    amountCents,
    kind,
    successUrl,
    rates,
  }: Parameters<PaymentProvider["createCheckout"]>[0]) {
    const rate = booking.currency === this.config.currency ? 1 : rates[this.config.currency];
    if (!rate) throw new Error(`No ${this.config.currency} exchange rate to charge through Paymob`);
    const chargeCents = Math.round(amountCents * rate);
    const [first, ...rest] = booking.customerName.trim().split(/\s+/);
    const label = kind === "deposit" ? "Deposit" : kind === "balance" ? "Balance" : "Payment";
    const intention = await this.call<{ client_secret: string }>("/v1/intention/", {
      amount: chargeCents,
      currency: this.config.currency,
      payment_methods: this.config.integrationIds,
      items: [
        {
          name: `${label} · ${booking.reference}`.slice(0, 50),
          amount: chargeCents,
          description: booking.productTitle.slice(0, 255),
          quantity: 1,
        },
      ],
      // Paymob requires every billing field; "NA" is its documented placeholder
      billing_data: {
        first_name: first || "Guest",
        last_name: rest.join(" ") || "NA",
        email: booking.customerEmail,
        phone_number: booking.customerPhone || "NA",
        apartment: "NA",
        floor: "NA",
        street: "NA",
        building: "NA",
        city: "NA",
        state: "NA",
        country: "NA",
      },
      special_reference: makeMerchantReference(booking.id, kind, amountCents),
      extras: { booking_reference: booking.reference },
      notification_url: new URL("/api/webhooks/paymob", successUrl).toString(),
      redirection_url: successUrl,
    });
    const url = new URL("/unifiedcheckout/", this.config.apiUrl);
    url.searchParams.set("publicKey", this.config.publicKey);
    url.searchParams.set("clientSecret", intention.client_secret);
    return { url: url.toString() };
  }

  /** Paymob's "transaction processed" callback: JSON body, HMAC in the `hmac` query parameter */
  async verifyWebhook(req: Request): Promise<PaymentEvent | null> {
    const given = new URL(req.url).searchParams.get("hmac") ?? "";
    const body = (await req.json().catch(() => null)) as { type?: string; obj?: Transaction } | null;
    const obj = body?.obj;
    if (!obj) throw new ValidationError("Not a Paymob callback");
    const expected = Buffer.from(paymobHmac(obj, this.config.hmacSecret));
    const received = Buffer.from(given.toLowerCase());
    if (expected.length !== received.length || !timingSafeEqual(expected, received))
      throw new ValidationError("Bad Paymob signature");
    if (body.type && body.type !== "TRANSACTION") return null;
    // Refunds and voids are recorded when we start them (refund()), not from callbacks
    if (obj.is_refunded || obj.is_voided) return null;

    const ref = parseMerchantReference(obj.order?.merchant_order_id);
    if (!ref || !obj.id) return null;
    return {
      provider: this.name,
      providerRef: String(obj.id),
      bookingId: ref.bookingId,
      kind: ref.kind,
      amountCents: ref.bookingCents,
      currency: "USD",
      status: obj.success && !obj.pending ? "succeeded" : obj.pending ? "pending" : "failed",
      raw: { chargedCents: obj.amount_cents, chargedCurrency: obj.currency, transaction: obj },
    };
  }

  async refund({ payment, amountCents }: Parameters<PaymentProvider["refund"]>[0]) {
    const raw = (payment.raw ?? {}) as { chargedCents?: number };
    // Refund the same share of what was charged in EGP
    const chargedCents = raw.chargedCents
      ? Math.round((raw.chargedCents * amountCents) / payment.amountCents)
      : amountCents;
    const result = await this.call<{ id: number }>("/api/acceptance/void_refund/refund", {
      transaction_id: Number(payment.providerRef),
      amount_cents: chargedCents,
    });
    return { refundRef: `paymob-refund-${result.id}` };
  }
}
