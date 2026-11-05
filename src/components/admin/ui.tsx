"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/app/admin/actions";

export function SubmitButton({ children, pendingText, className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={cn("btn btn-primary", className)} disabled={pending}>
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state?.error) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);
  if (!state) return null;
  if (state.error)
    return (
      <p ref={ref} role="alert" className="rounded-lg bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-lg bg-faience-tint px-4 py-3 text-sm font-medium text-faience">
        {state.message}
      </p>
    );
  return null;
}
