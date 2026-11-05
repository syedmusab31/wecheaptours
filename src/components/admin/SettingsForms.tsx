"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAdmin, changePassword, saveSettings } from "@/app/admin/actions";
import { CURRENCIES } from "@/lib/currency";
import type { SiteSettings } from "@/lib/settings";
import { FormMessage, SubmitButton } from "./ui";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState(saveSettings, null);
  const c = settings.contact;
  return (
    <form action={action} className="space-y-6">
      <section className="rounded-xl bg-white p-6">
        <h2 className="font-bold">Contact details on the site</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Phone</span>
            <input name="phone" defaultValue={c.phone} className="field" />
          </label>
          <label className="block">
            <span className="label">WhatsApp number</span>
            <input name="whatsapp" defaultValue={c.whatsapp} placeholder="201001234567" className="field tabular" />
            <span className="mt-1 block text-xs text-ink-mute">Country code and number, digits only.</span>
          </label>
          <label className="block">
            <span className="label">Public email</span>
            <input name="email" type="email" defaultValue={c.email} className="field" />
          </label>
          <label className="block">
            <span className="label">Address</span>
            <input name="address" defaultValue={c.address} className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Tourism licence line</span>
            <input name="licence" defaultValue={c.licence} placeholder="Egyptian Tourism Authority licence no. 1234" className="field" />
          </label>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="font-bold">Exchange rates</h2>
        <p className="mt-0.5 text-sm text-ink-mute">How much 1 US dollar is worth. Used only to show prices; bookings are stored in USD.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {CURRENCIES.map((cur) => (
            <label key={cur} className="block">
              <span className="label">{cur}</span>
              <input
                name={`rate_${cur}`}
                type="number"
                step="0.0001"
                min="0.0001"
                defaultValue={settings.rates[cur]}
                readOnly={cur === "USD"}
                className="field tabular read-only:bg-mist"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="font-bold">Launch</h2>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input type="checkbox" name="demoMode" defaultChecked={settings.demoMode} className="mt-0.5 h-4 w-4 accent-[var(--color-lapis)]" />
          <span>
            <b>Demo mode</b>: show a banner saying photos, prices and reviews are samples. Turn off when real content is in.
          </span>
        </label>
      </section>

      <div className="flex items-center gap-4">
        <SubmitButton>Save settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-xl bg-white p-6">
      <h2 className="font-bold">Change your password</h2>
      <label className="block">
        <span className="label">Current password</span>
        <input name="current" type="password" required autoComplete="current-password" className="field" />
      </label>
      <label className="block">
        <span className="label">New password</span>
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}

export function AddAdminForm({ admins }: { admins: { id: number; email: string; name: string }[] }) {
  const [state, action] = useActionState(addAdmin, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-xl bg-white p-6">
      <h2 className="font-bold">Staff accounts</h2>
      <ul className="text-sm text-ink-soft">
        {admins.map((a) => (
          <li key={a.id}>
            {a.name} · {a.email}
          </li>
        ))}
      </ul>
      <label className="block">
        <span className="label">Name</span>
        <input name="name" className="field" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required className="field" />
      </label>
      <label className="block">
        <span className="label">Temporary password</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Add staff account</SubmitButton>
    </form>
  );
}
