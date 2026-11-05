"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Turnstile } from "@/components/ui/Turnstile";
import { toISODate } from "@/lib/dates";
import { track } from "@/lib/analytics";

const TOPICS = [
  { value: "general", label: "A general question" },
  { value: "package", label: "A custom trip or package" },
  { value: "concierge", label: "Concierge: laundry, groceries, food, shopping" },
  { value: "event", label: "A birthday, anniversary or private event" },
  { value: "product", label: "A specific trip on the site" },
];

export function EnquiryForm({
  topic = "general",
  productId,
  productTitle,
  defaultMessage = "",
}: {
  topic?: string;
  productId?: number;
  productTitle?: string;
  defaultMessage?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setTopic] = useState(topic);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: currentTopic,
        productId: currentTopic === "product" ? productId : null,
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        travelDate: f.get("date") || null,
        guests: f.get("guests") ? Number(f.get("guests")) : null,
        budget: f.get("budget") ?? "",
        message: f.get("message"),
        website: f.get("website"),
        turnstileToken: f.get("cf-turnstile-response"),
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      track("enquiry_sent", { topic: currentTopic });
      setState("done");
    } else {
      setError(data.error ?? "We couldn't send your message. Check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="bg-faience-tint rounded-2xl p-6">
        <CircleCheck className="text-faience" size={28} aria-hidden />
        <p className="mt-3 text-lg font-bold">Message sent</p>
        <p className="text-ink-soft mt-1">
          We'll reply within 24 hours by email{currentTopic !== "general" ? " with a price" : ""}. Check your
          inbox for a copy.
        </p>
      </div>
    );
  }

  const showBudget = ["package", "event"].includes(currentTopic);
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label">What's it about?</span>
        <select value={currentTopic} onChange={(e) => setTopic(e.target.value)} className="field">
          {TOPICS.filter((t) => t.value !== "product" || productId).map((t) => (
            <option key={t.value} value={t.value}>
              {t.value === "product" && productTitle ? `About: ${productTitle}` : t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Name</span>
          <input name="name" required autoComplete="name" className="field" />
        </label>
        <label>
          <span className="label">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label>
          <span className="label">
            Phone or WhatsApp <span className="text-ink-mute font-normal">(optional)</span>
          </span>
          <input name="phone" type="tel" autoComplete="tel" className="field" />
        </label>
        <label>
          <span className="label">
            Date <span className="text-ink-mute font-normal">(optional)</span>
          </span>
          <input name="date" type="date" min={toISODate(new Date())} className="field" />
        </label>
        <label>
          <span className="label">
            Number of people <span className="text-ink-mute font-normal">(optional)</span>
          </span>
          <input name="guests" type="number" min={1} max={500} className="field" />
        </label>
        {showBudget && (
          <label>
            <span className="label">
              Budget <span className="text-ink-mute font-normal">(optional)</span>
            </span>
            <input name="budget" placeholder="e.g. $1,500 for two" className="field" />
          </label>
        )}
      </div>
      <label className="block">
        <span className="label">Your message</span>
        <textarea
          name="message"
          required
          minLength={10}
          rows={5}
          defaultValue={defaultMessage}
          className="field"
        />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error && (
        <p role="alert" className="bg-danger-tint text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}
      <Turnstile />
      <button className="btn btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
