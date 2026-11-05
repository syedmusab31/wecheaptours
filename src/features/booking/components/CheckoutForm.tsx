"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@/components/ui/Turnstile";
import { formatCents, type Currency } from "@/lib/money";

type Selection = {
  productId: number;
  optionId: number | null;
  addonIds: number[];
  travelDate: string;
  endDate?: string;
  adults: number;
  children: number;
  infants: number;
};

export function CheckoutForm({
  booking,
  currency,
  rates,
  needsPickup,
  pickupLabel,
}: {
  booking: Selection;
  currency: Currency;
  rates: Record<Currency, number>;
  needsPickup: boolean;
  pickupLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountCents: number; totalCents: number } | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);

  /** Checks the code with the server (same pricing as the booking) and shows the new total */
  async function applyPromo() {
    setPromoError(null);
    const code = promoInput.trim();
    if (!code) return;
    const res = await fetch("/api/v1/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...booking, promoCode: code }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setPromo(null);
      setPromoError(data?.error ?? "We couldn't check that code.");
      return;
    }
    setPromo({ code: data.promoCode, discountCents: data.discountCents, totalCents: data.totalCents });
  }

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
          promoCode: promo?.code ?? null,
          displayCurrency: currency,
          customerName: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          country: f.get("country"),
          pickupLocation: f.get("pickup") ?? "",
          notes: f.get("notes"),
          acceptTerms: f.get("terms") === "on",
          website: f.get("website"),
          turnstileToken: f.get("cf-turnstile-response"),
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
          <span className="text-ink-mute mt-1 block text-xs">We send your confirmation here.</span>
        </label>
        <label>
          <span className="label">Phone or WhatsApp</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+44 7700 900000"
            className="field"
          />
          <span className="text-ink-mute mt-1 block text-xs">
            With country code. Your guide uses it on the day.
          </span>
        </label>
        <label>
          <span className="label">Country of residence</span>
          <input name="country" autoComplete="country-name" className="field" />
        </label>
        {needsPickup && (
          <label>
            <span className="label">{pickupLabel}</span>
            <input name="pickup" placeholder="Hotel name or address" className="field" />
            <span className="text-ink-mute mt-1 block text-xs">
              Not sure yet? Leave blank and tell us later.
            </span>
          </label>
        )}
        <label className="sm:col-span-2">
          <span className="label">
            Anything we should know? <span className="text-ink-mute font-normal">(optional)</span>
          </span>
          <textarea
            name="notes"
            rows={3}
            className="field"
            placeholder="Flight number, dietary needs, mobility, celebrations…"
          />
        </label>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          name="terms"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-lapis)]"
        />
        <span>
          I agree to the{" "}
          <Link
            href="/booking-terms"
            target="_blank"
            className="text-lapis font-semibold underline-offset-2 hover:underline"
          >
            booking terms and cancellation policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p role="alert" className="bg-danger-tint text-danger rounded-lg px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}

      <div>
        <span className="label">Promo code</span>
        <div className="flex gap-2">
          <input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            className="field uppercase"
            maxLength={40}
            aria-label="Promo code"
          />
          <button type="button" onClick={applyPromo} className="btn btn-ghost shrink-0">
            Apply
          </button>
        </div>
        {promo && (
          <p role="status" className="text-faience mt-1.5 text-sm">
            {promo.code} applied: −{formatCents(promo.discountCents, currency, rates, { decimals: true })}.
            New total <b>{formatCents(promo.totalCents, currency, rates, { decimals: true })}</b>.
          </p>
        )}
        {promoError && (
          <p role="alert" className="text-danger mt-1.5 text-sm">
            {promoError}
          </p>
        )}
      </div>
      <Turnstile />
      <button className="btn btn-primary w-full py-4 text-base sm:w-auto sm:px-10" disabled={sending}>
        {sending ? "Sending request…" : "Send booking request"}
      </button>
      <p className="text-ink-mute text-sm">
        You won't be charged now. We confirm availability within 24 hours.
      </p>
    </form>
  );
}
