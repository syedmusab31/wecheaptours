import "server-only";
import { checkoutProvider } from "./providers";

/** True when a payment provider is configured (Stripe or Paymob) */
export function onlinePaymentsEnabled(): boolean {
  return checkoutProvider() !== null;
}
