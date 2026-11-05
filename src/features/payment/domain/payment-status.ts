import type { PaymentKind, PaymentStatus } from "@/server/db/schema";

/** Works out what has been paid from the payment records. Pure. */
export function summarisePayments(
  booking: { totalCents: number; depositCents: number },
  records: { kind: PaymentKind; amountCents: number; status: string }[],
): { paidCents: number; paymentStatus: PaymentStatus } {
  const ok = records.filter((r) => r.status === "succeeded");
  const received = ok.filter((r) => r.kind !== "refund").reduce((s, r) => s + r.amountCents, 0);
  const refunded = ok.filter((r) => r.kind === "refund").reduce((s, r) => s + r.amountCents, 0);
  const paidCents = Math.max(0, received - refunded);
  let paymentStatus: PaymentStatus = "unpaid";
  if (refunded > 0) paymentStatus = paidCents > 0 ? "partially_refunded" : "refunded";
  else if (paidCents >= booking.totalCents && booking.totalCents > 0) paymentStatus = "paid";
  else if (booking.depositCents > 0 && paidCents >= booking.depositCents) paymentStatus = "deposit_paid";
  return { paidCents, paymentStatus };
}

/** The next amount to ask for: the deposit first, then the balance */
export function amountDue(booking: { totalCents: number; depositCents: number; paidCents: number }): {
  kind: "deposit" | "balance" | "full";
  amountCents: number;
} | null {
  if (booking.paidCents >= booking.totalCents) return null;
  if (booking.depositCents > 0 && booking.paidCents < booking.depositCents) {
    return { kind: "deposit", amountCents: booking.depositCents - booking.paidCents };
  }
  return {
    kind: booking.paidCents > 0 ? "balance" : "full",
    amountCents: booking.totalCents - booking.paidCents,
  };
}
