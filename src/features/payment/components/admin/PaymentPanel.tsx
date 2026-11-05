"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";
import { recordManualPayment } from "@/features/payment/server/payment.actions";

/** Record cash, bank transfers and refunds against a booking */
export function ManualPaymentForm({
  bookingId,
  suggestedCents,
}: {
  bookingId: number;
  suggestedCents: number;
}) {
  const [state, action] = useActionState(recordManualPayment, null);
  return (
    <form action={action} className="border-line mt-4 space-y-3 border-t pt-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Type</span>
          <select name="kind" className="field" defaultValue="full">
            <option value="deposit">Deposit received</option>
            <option value="balance">Balance received</option>
            <option value="full">Full payment received</option>
            <option value="refund">Refund paid back</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Amount (USD)</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={suggestedCents > 0 ? (suggestedCents / 100).toFixed(2) : ""}
            className="field tabular"
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Note</span>
        <input name="note" className="field" placeholder="Cash to the guide, bank transfer ref…" />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Record</SubmitButton>
    </form>
  );
}
