"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; msg?: string }>({ status: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "sending" });
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setState({ status: "done" });
    else setState({ status: "error", msg: data.error ?? "Couldn't subscribe. Check the address and try again." });
  }

  if (state.status === "done") {
    return <p className="rounded-full bg-white/10 px-5 py-3 font-semibold">You're subscribed. Watch your inbox for the next deals email.</p>;
  }
  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 focus-within:ring-white/40">
        <label className="sr-only" htmlFor="subscribe-email">
          Email address
        </label>
        <input
          id="subscribe-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 bg-transparent px-4 text-white outline-none placeholder:text-white/45"
        />
        <button className="btn btn-sun shrink-0 py-2.5" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Subscribing…" : "Subscribe"}
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="mt-2 px-4 text-sm text-sun">
          {state.msg}
        </p>
      )}
    </form>
  );
}
