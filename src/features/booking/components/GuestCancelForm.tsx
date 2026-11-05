"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";
import { cancelMyBooking } from "@/features/booking/server/booking.actions";

/** "Cancel my booking" on the guest's booking page */
export function GuestCancelForm({
  reference,
  token,
  isRequest,
}: {
  reference: string;
  token: string;
  isRequest: boolean;
}) {
  const [state, action] = useActionState(cancelMyBooking, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            isRequest ? "Withdraw this booking request?" : "Cancel this booking? Cancelling now is free.",
          )
        )
          e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton className="bg-danger hover:bg-danger/90" pendingText="Cancelling…">
        {isRequest ? "Withdraw request" : "Cancel booking"}
      </SubmitButton>
    </form>
  );
}
