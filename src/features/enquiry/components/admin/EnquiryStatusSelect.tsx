"use client";

import { useTransition } from "react";
import { setEnquiryStatus } from "@/features/enquiry/server/enquiry.actions";

export function EnquiryStatusSelect({ id, status }: { id: number; status: "new" | "quoted" | "closed" }) {
  const [pending, start] = useTransition();
  return (
    <label className="text-sm">
      <span className="sr-only">Status</span>
      <select
        defaultValue={status}
        disabled={pending}
        onChange={(e) => start(() => setEnquiryStatus(id, e.target.value as typeof status))}
        className="border-line rounded-lg border bg-white px-2.5 py-1.5 font-semibold"
      >
        <option value="new">New</option>
        <option value="quoted">Quoted</option>
        <option value="closed">Closed</option>
      </select>
    </label>
  );
}
