"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckoutForm({
  booking,
  needsPickup,
  pickupLabel,
}: {
  booking: { productId: number; travelDate: string; endDate?: string; adults: number; children: number; infants: number };
  needsPickup: boolean;
  pickupLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    setSending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...booking,
          customerName: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          country: f.get("country"),
          pickupLocation: f.get("pickup") ?? "",
          notes: f.get("notes"),
          acceptTerms: f.get("terms") === "on",
          website: f.get("website"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "We couldn't send your request. Check the form and try again.");
        setSending(false);
        return;
      }
      router.push(data.url);
    } catch {
      setError("No connection. Check your internet and try again.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Full name</span>
          <input name="name" required autoComplete="name" className="field" />
        </label>
        <label>
          <span className="label">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
          <span className="mt-1 block text-xs text-ink-mute">We send your confirmation here.</span>
        </label>
        <label>
          <span className="label">Phone or WhatsApp</span>
          <input name="phone" type="tel" required autoComplete="tel" placeholder="+44 7700 900000" className="field" />
          <span className="mt-1 block text-xs text-ink-mute">With country code. Your guide uses it on the day.</span>
        </label>
        <label>
          <span className="label">Country of residence</span>
          <input name="country" autoComplete="country-name" className="field" />
        </label>
        {needsPickup && (
          <label>
            <span className="label">{pickupLabel}</span>
            <input name="pickup" placeholder="Hotel name or address" className="field" />
            <span className="mt-1 block text-xs text-ink-mute">Not sure yet? Leave blank and tell us later.</span>
          </label>
        )}
        <label className="sm:col-span-2">
          <span className="label">
            Anything we should know? <span className="font-normal text-ink-mute">(optional)</span>
          </span>
          <textarea name="notes" rows={3} className="field" placeholder="Flight number, dietary needs, mobility, celebrations…" />
        </label>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input name="terms" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-lapis)]" />
        <span>
          I agree to the{" "}
          <Link href="/booking-terms" target="_blank" className="font-semibold text-lapis underline-offset-2 hover:underline">
            booking terms and cancellation policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button className="btn btn-primary w-full py-4 text-base sm:w-auto sm:px-10" disabled={sending}>
        {sending ? "Sending request…" : "Send booking request"}
      </button>
      <p className="text-sm text-ink-mute">You won't be charged now. We confirm availability within 24 hours.</p>
    </form>
  );
}
