"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";
import { updateBooking } from "@/features/booking/server/booking.actions";
import { BOOKING_STATUS_LABELS, nextStatuses } from "@/features/booking/domain/booking-status";
import type { BookingStatus } from "@/server/db/schema";

/** Offers only the moves the state machine allows from the current status */
export function BookingStatusForm({
  id,
  status,
  adminNotes,
}: {
  id: number;
  status: BookingStatus;
  adminNotes: string;
}) {
  const [state, action] = useActionState(updateBooking, null);
  const options = [status, ...nextStatuses(status)];
  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="label">Status</span>
        <select name="status" defaultValue={status} className="field" disabled={options.length === 1}>
          {options.map((s) => (
            <option key={s} value={s}>
              {s === status ? `${BOOKING_STATUS_LABELS[s]} (current)` : BOOKING_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {options.length === 1 && <input type="hidden" name="status" value={status} />}
        {options.length === 1 && (
          <span className="text-ink-mute mt-1 block text-xs">This is a final status.</span>
        )}
      </label>
      <label className="block">
        <span className="label">Reason (kept in the history)</span>
        <input name="note" className="field" placeholder="e.g. Boat full that week" />
      </label>
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="notify"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-[var(--color-lapis)]"
        />
        Email the guest about the new status
      </label>
      <label className="block">
        <span className="label">Internal notes</span>
        <textarea
          name="adminNotes"
          rows={4}
          defaultValue={adminNotes}
          className="field"
          placeholder="Guide, driver, boat, payment received… (guests never see this)"
        />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
