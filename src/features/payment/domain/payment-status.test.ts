import { describe, expect, it } from "vitest";
import { amountDue, summarisePayments } from "./payment-status";

const booking = { totalCents: 10000, depositCents: 2000 };

describe("summarisePayments", () => {
  it("is unpaid with no payments and ignores failed ones", () => {
    expect(summarisePayments(booking, [{ kind: "deposit", amountCents: 2000, status: "failed" }])).toEqual({
      paidCents: 0,
      paymentStatus: "unpaid",
    });
  });
  it("moves through deposit_paid to paid", () => {
    const deposit = { kind: "deposit" as const, amountCents: 2000, status: "succeeded" };
    expect(summarisePayments(booking, [deposit]).paymentStatus).toBe("deposit_paid");
    expect(
      summarisePayments(booking, [deposit, { kind: "balance", amountCents: 8000, status: "succeeded" }]),
    ).toEqual({
      paidCents: 10000,
      paymentStatus: "paid",
    });
  });
  it("tracks partial and full refunds", () => {
    const paid = { kind: "full" as const, amountCents: 10000, status: "succeeded" };
    expect(
      summarisePayments(booking, [paid, { kind: "refund", amountCents: 5000, status: "succeeded" }])
        .paymentStatus,
    ).toBe("partially_refunded");
    expect(
      summarisePayments(booking, [paid, { kind: "refund", amountCents: 10000, status: "succeeded" }])
        .paymentStatus,
    ).toBe("refunded");
  });
});

describe("amountDue", () => {
  it("asks for the deposit, then the balance, then nothing", () => {
    expect(amountDue({ ...booking, paidCents: 0 })).toEqual({ kind: "deposit", amountCents: 2000 });
    expect(amountDue({ ...booking, paidCents: 2000 })).toEqual({ kind: "balance", amountCents: 8000 });
    expect(amountDue({ ...booking, paidCents: 10000 })).toBeNull();
  });
  it("asks for the full amount when there is no deposit", () => {
    expect(amountDue({ totalCents: 5000, depositCents: 0, paidCents: 0 })).toEqual({
      kind: "full",
      amountCents: 5000,
    });
  });
});
