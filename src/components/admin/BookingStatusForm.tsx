"use client";

import { useActionState } from "react";
import { updateBooking } from "@/app/admin/actions";
import type { BookingStatus } from "@/db/schema";
import { FormMessage, SubmitButton } from "./ui";

const LABELS: Record<BookingStatus, string> = {
  pending: "Pending: waiting for us to confirm",
  confirmed: "Confirmed",
  completed: "Completed: trip done",
  cancelled: "Cancelled",
};

export function BookingStatusForm({ id, status, adminNotes }: { id: number; status: BookingStatus; adminNotes: string }) {
  const [state, action] = useActionState(updateBooking, null);
  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="label">Status</span>
        <select name="status" defaultValue={status} className="field">
          {(Object.keys(LABELS) as BookingStatus[]).map((s) => (
            <option key={s} value={s}>
              {LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--color-lapis)]" />
        Email the guest about the new status
      </label>
      <label className="block">
        <span className="label">Internal notes</span>
        <textarea name="adminNotes" rows={4} defaultValue={adminNotes} className="field" placeholder="Guide, driver, boat, payment received… (guests never see this)" />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
