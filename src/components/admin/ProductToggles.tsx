"use client";

import { useOptimistic, useTransition } from "react";
import { toggleProduct } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className="flex items-center gap-2 text-xs font-semibold text-ink-soft disabled:opacity-60"
    >
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-faience" : "bg-line")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

export function ProductToggles({ id, isActive, isFeatured }: { id: number; isActive: boolean; isFeatured: boolean }) {
  const [pending, start] = useTransition();
  type Flags = { isActive: boolean; isFeatured: boolean };
  const [state, set] = useOptimistic<Flags, Partial<Flags>>({ isActive, isFeatured }, (s, patch) => ({ ...s, ...patch }));
  const flip = (field: keyof Flags) =>
    start(async () => {
      set({ [field]: !state[field] });
      await toggleProduct(id, field, !state[field]);
    });
  return (
    <div className="space-y-1.5">
      <Switch on={state.isActive} label="Visible" onChange={() => flip("isActive")} disabled={pending} />
      <Switch on={state.isFeatured} label="Featured" onChange={() => flip("isFeatured")} disabled={pending} />
    </div>
  );
}
