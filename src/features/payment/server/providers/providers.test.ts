import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Booking } from "@/server/db/schema";
import { makeMerchantReference, parseMerchantReference, paymobHmac, PaymobProvider } from "./paymob";
import { StripeProvider } from "./stripe";

const paymob = new PaymobProvider({
  secretKey: "sk",
  publicKey: "pk",
  hmacSecret: "hmac-secret",
  integrationIds: [123],
  currency: "EGP",
  apiUrl: "https://accept.paymob.com",
});

function paymobCallback(obj: Record<string, unknown>, hmac = paymobHmac(obj, "hmac-secret")) {
  return new Request(`https://site/api/webhooks/paymob?hmac=${hmac}`, {
    method: "POST",
    body: JSON.stringify({ type: "TRANSACTION", obj }),
  });
}

const transaction = {
  id: 987654,
  amount_cents: 485000,
  created_at: "2026-11-07T10:00:00",
  currency: "EGP",
  error_occured: false,
  has_parent_transaction: false,
  integration_id: 123,
  is_3d_secure: true,
  is_auth: false,
  is_capture: false,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 555, merchant_order_id: makeMerchantReference(42, "deposit", 10000, 1) },
  owner: 9,
  pending: false,
  source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
  success: true,
};

describe("Paymob", () => {
  it("round-trips our merchant reference", () => {
    expect(parseMerchantReference(makeMerchantReference(42, "balance", 7500, 1700000000000))).toEqual({
      bookingId: 42,
      kind: "balance",
      bookingCents: 7500,
    });
    expect(parseMerchantReference("someone-elses-order")).toBeNull();
  });

  it("signs the documented fields in order, booleans as text", () => {
    const joined =
      "4850002026-11-07T10:00:00EGPfalsefalse987654123truefalsefalsefalsetruefalse5559false2346MasterCardcardtrue";
    expect(paymobHmac(transaction, "hmac-secret")).toBe(
      createHmac("sha512", "hmac-secret").update(joined).digest("hex"),
    );
  });

  it("records a successful callback in the booking's currency, keeping what was charged", async () => {
    const event = await paymob.verifyWebhook(paymobCallback(transaction));
    expect(event).toMatchObject({
      provider: "paymob",
      providerRef: "987654",
      bookingId: 42,
      kind: "deposit",
      amountCents: 10000,
      currency: "USD",
      status: "succeeded",
      raw: { chargedCents: 485000, chargedCurrency: "EGP" },
    });
  });

  it("rejects a forged or altered callback", async () => {
    await expect(paymob.verifyWebhook(paymobCallback(transaction, "0".repeat(128)))).rejects.toThrow(
      /signature/,
    );
    const signed = paymobHmac(transaction, "hmac-secret");
    await expect(
      paymob.verifyWebhook(paymobCallback({ ...transaction, amount_cents: 1 }, signed)),
    ).rejects.toThrow(/signature/);
  });

  it("marks a declined card failed and ignores refund callbacks", async () => {
    expect((await paymob.verifyWebhook(paymobCallback({ ...transaction, success: false })))?.status).toBe(
      "failed",
    );
    expect(await paymob.verifyWebhook(paymobCallback({ ...transaction, is_refunded: true }))).toBeNull();
  });

  it("converts the USD amount to EGP when opening a checkout", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ client_secret: "cs_123" }), { status: 201 });
    }) as typeof fetch;
    try {
      const { url } = await paymob.createCheckout({
        booking: {
          id: 42,
          reference: "WCT-ABC234",
          currency: "USD",
          customerName: "Jane Doe",
          customerEmail: "j@x.co",
          customerPhone: "+20100",
          productTitle: "Pyramids",
        } as Booking,
        amountCents: 10000,
        kind: "deposit",
        successUrl: "https://site/booking/WCT-ABC234?t=x&paid=1",
        cancelUrl: "https://site/booking/WCT-ABC234?t=x",
        rates: { USD: 1, EGP: 48.5 },
      });
      expect(url).toBe("https://accept.paymob.com/unifiedcheckout/?publicKey=pk&clientSecret=cs_123");
      expect(calls[0].body).toMatchObject({
        amount: 485000,
        currency: "EGP",
        payment_methods: [123],
        notification_url: "https://site/api/webhooks/paymob",
      });
      expect(parseMerchantReference(String(calls[0].body.special_reference))).toMatchObject({
        bookingId: 42,
        bookingCents: 10000,
      });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("Stripe webhook", () => {
  const stripe = new StripeProvider("sk_test", "whsec_test");
  const session = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        payment_intent: "pi_1",
        payment_status: "paid",
        amount_total: 2000,
        currency: "usd",
        metadata: { booking_id: "42", kind: "deposit" },
      },
    },
  };
  const signed = (body: string, t = Math.floor(Date.now() / 1000), secret = "whsec_test") =>
    new Request("https://site/api/webhooks/stripe", {
      method: "POST",
      body,
      headers: {
        "stripe-signature": `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`,
      },
    });

  it("accepts a correctly signed checkout", async () => {
    expect(await stripe.verifyWebhook(signed(JSON.stringify(session)))).toMatchObject({
      providerRef: "pi_1",
      bookingId: 42,
      kind: "deposit",
      amountCents: 2000,
      status: "succeeded",
    });
  });

  it("rejects a wrong secret or an old timestamp", async () => {
    await expect(stripe.verifyWebhook(signed(JSON.stringify(session), undefined, "other"))).rejects.toThrow(
      /signature/,
    );
    await expect(
      stripe.verifyWebhook(signed(JSON.stringify(session), Math.floor(Date.now() / 1000) - 3600)),
    ).rejects.toThrow(/Stale/);
  });
});
