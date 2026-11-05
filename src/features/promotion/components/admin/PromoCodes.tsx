"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";
import { createPromoCode, setPromoActive } from "@/features/promotion/server/promo.actions";
import { formatCentsExact } from "@/lib/money";
import type { PromoCode } from "@/server/db/schema";

function ActiveToggle({ id, isActive }: { id: number; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setPromoActive(id, !isActive))}
      className="text-lapis text-sm font-semibold hover:underline disabled:opacity-50"
    >
      {isActive ? "Turn off" : "Turn on"}
    </button>
  );
}

export function PromoCodeList({ codes }: { codes: PromoCode[] }) {
  if (!codes.length) return <p className="text-ink-soft rounded-xl bg-white p-6">No promo codes yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-line text-ink-mute border-b">
          <tr>
            <th className="px-4 py-3 font-semibold">Code</th>
            <th className="px-4 py-3 font-semibold">Discount</th>
            <th className="px-4 py-3 font-semibold">Valid for trips</th>
            <th className="px-4 py-3 font-semibold">Used</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {codes.map((c) => (
            <tr key={c.id} className={c.isActive ? "" : "opacity-50"}>
              <td className="px-4 py-3">
                <b className="tabular">{c.code}</b>
                {c.description && <span className="text-ink-mute block text-xs">{c.description}</span>}
              </td>
              <td className="px-4 py-3">
                {c.percentOff ? `${c.percentOff}% off` : `${formatCentsExact(c.amountOffCents ?? 0)} off`}
              </td>
              <td className="px-4 py-3">
                {c.startsOn || c.endsOn ? `${c.startsOn ?? "now"} to ${c.endsOn ?? "no end"}` : "Any date"}
              </td>
              <td className="tabular px-4 py-3">
                {c.usedCount}
                {c.maxUses != null ? ` / ${c.maxUses}` : ""}
              </td>
              <td className="px-4 py-3 text-right">
                <ActiveToggle id={c.id} isActive={c.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PromoCodeForm() {
  const [state, action] = useActionState(createPromoCode, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 rounded-xl bg-white p-6 sm:grid-cols-3">
      <h2 className="font-bold sm:col-span-3">New promo code</h2>
      <label className="block">
        <span className="label">Code</span>
        <input name="code" required className="field uppercase" placeholder="SPRING10" />
      </label>
      <label className="block">
        <span className="label">Discount</span>
        <div className="flex gap-2">
          <input name="value" type="number" step="0.01" min="0.01" required className="field tabular" />
          <select name="kind" className="field w-28" defaultValue="percent">
            <option value="percent">%</option>
            <option value="amount">USD</option>
          </select>
        </div>
      </label>
      <label className="block">
        <span className="label">Max uses (optional)</span>
        <input name="maxUses" type="number" min="1" className="field tabular" />
      </label>
      <label className="block">
        <span className="label">Trips from</span>
        <input name="startsOn" type="date" className="field" />
      </label>
      <label className="block">
        <span className="label">Trips until</span>
        <input name="endsOn" type="date" className="field" />
      </label>
      <label className="block">
        <span className="label">Note (internal)</span>
        <input name="description" className="field" placeholder="Newsletter, March" />
      </label>
      <div className="space-y-2 sm:col-span-3">
        <FormMessage state={state} />
        <SubmitButton>Create code</SubmitButton>
      </div>
    </form>
  );
}
