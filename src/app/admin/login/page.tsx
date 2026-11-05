"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/brand/Logo";

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const data = (await res?.json().catch(() => ({}))) ?? {};
  return { ok: Boolean(res?.ok), data: data as { error?: string; step?: string; sentTo?: string } };
}

/** Step 1: email and password. Step 2: the 6-digit code emailed to the account. */
function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/admin";
  const [step, setStep] = useState<"password" | "code">("password");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = () => {
    router.replace(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  async function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { ok, data } = await post("/api/auth/login", {
      email: f.get("email"),
      password: f.get("password"),
    });
    setBusy(false);
    if (!ok) return setError(data.error ?? "Sign-in failed.");
    if (data.step === "done") return finish();
    setSentTo(data.sentTo ?? "your email");
    setStep("code");
  }

  async function submitCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setNotice(null);
    const { ok, data } = await post("/api/auth/verify-code", {
      code: String(f.get("code") ?? ""),
      rememberDevice: f.get("remember") === "on",
    });
    setBusy(false);
    if (ok) return finish();
    setError(data.error ?? "That code didn't work.");
  }

  async function resend() {
    setError(null);
    const { ok, data } = await post("/api/auth/resend-code");
    if (!ok) return setError(data.error ?? "Couldn't send a new code.");
    setNotice(`A new code is on its way to ${data.sentTo}. Older codes no longer work.`);
  }

  const alert = error && (
    <p role="alert" className="bg-danger-tint text-danger rounded-lg px-3 py-2 text-sm">
      {error}
    </p>
  );

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="mt-6 space-y-4">
        <p className="text-ink-soft text-sm">
          We emailed a 6-digit code to <b>{sentTo}</b>. It works for 10 minutes.
        </p>
        <label className="block">
          <span className="label">Sign-in code</span>
          <input
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{3}\s?\d{3}"
            maxLength={7}
            autoFocus
            className="field tabular text-center text-2xl tracking-[0.4em]"
          />
        </label>
        <label className="text-ink-soft flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="remember" className="mt-0.5 h-4 w-4" />
          Remember this device for 30 days (only on your own computer)
        </label>
        {alert}
        {notice && (
          <p role="status" className="bg-faience-tint text-faience rounded-lg px-3 py-2 text-sm">
            {notice}
          </p>
        )}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={resend} className="text-lapis font-semibold hover:underline">
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("password");
              setError(null);
              setNotice(null);
            }}
            className="text-ink-soft hover:underline"
          >
            Use another account
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="mt-8 space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {alert}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="bg-mist flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-xl font-bold">Staff sign in</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
