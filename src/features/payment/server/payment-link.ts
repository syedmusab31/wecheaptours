import "server-only";
import { bookingAccessToken } from "@/features/booking/server/booking-access";
import { formatCentsExact } from "@/lib/money";
import { siteUrl } from "@/lib/routes";
import type { Booking } from "@/server/db/schema";
import { amountDue } from "../domain/payment-status";
import { onlinePaymentsEnabled } from "./payment-config";

/** The "Pay the deposit" button for emails: only for confirmed bookings with something due and online payment set up */
export function paymentLinkFor(b: Booking): { url: string; label: string } | null {
  const due = amountDue(b);
  if (!onlinePaymentsEnabled() || !due || b.status !== "confirmed") return null;
  return {
    url: siteUrl(`/booking/${b.reference}/pay?t=${bookingAccessToken(b.reference)}`),
    label: `Pay ${due.kind === "deposit" ? "the deposit" : "now"}: ${formatCentsExact(due.amountCents, b.currency)}`,
  };
}
