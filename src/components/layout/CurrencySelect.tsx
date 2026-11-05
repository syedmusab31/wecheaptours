"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CURRENCIES, type Currency } from "@/lib/money";

export function CurrencySelect({ value, className }: { value: Currency; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={className}>
      <span className="sr-only">Currency</span>
      <select
        value={value}
        disabled={pending}
        onChange={async (e) => {
          await fetch("/api/currency", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ currency: e.target.value }),
          });
          start(() => router.refresh());
        }}
        className="border-line tabular hover:border-ink h-10 cursor-pointer appearance-none rounded-full border bg-white px-3.5 text-sm font-semibold transition-colors"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
