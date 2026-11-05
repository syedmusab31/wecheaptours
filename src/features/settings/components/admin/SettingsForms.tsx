"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addAdmin,
  changePassword,
  signOutEverywhere,
  updateStaff,
} from "@/features/identity/server/identity.actions";
import { ROLE_LABELS } from "@/features/identity/server/permissions";
import type { AdminRole } from "@/server/db/schema";
import { saveSettings } from "@/features/settings/server/settings.actions";
import { CURRENCIES } from "@/lib/money";
import type { SiteSettings } from "@/features/settings/server/settings.service";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";

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
            <input
              name="whatsapp"
              defaultValue={c.whatsapp}
              placeholder="201001234567"
              className="field tabular"
            />
            <span className="text-ink-mute mt-1 block text-xs">Country code and number, digits only.</span>
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
            <input
              name="licence"
              defaultValue={c.licence}
              placeholder="Egyptian Tourism Authority licence no. 1234"
              className="field"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="font-bold">Exchange rates</h2>
        <p className="text-ink-mute mt-0.5 text-sm">
          How much 1 US dollar is worth. Used only to show prices; bookings are stored in USD.
        </p>
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
          <input
            type="checkbox"
            name="demoMode"
            defaultChecked={settings.demoMode}
            className="mt-0.5 h-4 w-4 accent-[var(--color-lapis)]"
          />
          <span>
            <b>Demo mode</b>: show a banner saying photos, prices and reviews are samples. Turn off when real
            content is in.
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
        <input
          name="next"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="field"
        />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}

type StaffRow = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: Date | null;
};

function StaffRowForm({ staff, isSelf }: { staff: StaffRow; isSelf: boolean }) {
  const [state, action] = useActionState(updateStaff, null);
  return (
    <li className="py-3">
      <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
        <input type="hidden" name="id" value={staff.id} />
        <span className="min-w-0 flex-1">
          <b className="block truncate">{staff.name}</b>
          <span className="text-ink-mute block truncate">
            {staff.email} ·{" "}
            {staff.lastLoginAt
              ? `last sign-in ${new Date(staff.lastLoginAt).toLocaleDateString("en-GB")}`
              : "never signed in"}
          </span>
        </span>
        <select
          name="role"
          defaultValue={staff.role}
          disabled={isSelf}
          className="border-line rounded-lg border bg-white px-2 py-1.5"
        >
          {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r].label}
            </option>
          ))}
        </select>
        {isSelf && <input type="hidden" name="role" value={staff.role} />}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={staff.isActive}
            disabled={isSelf}
            className="h-4 w-4"
          />
          Active
        </label>
        {isSelf ? (
          <input type="hidden" name="isActive" value="on" />
        ) : (
          <SubmitButton className="px-3 py-1.5 text-sm">Save</SubmitButton>
        )}
      </form>
      <div className="mt-2">
        <FormMessage state={state} />
      </div>
    </li>
  );
}

export function StaffManager({ admins, currentAdminId }: { admins: StaffRow[]; currentAdminId: number }) {
  const [state, action] = useActionState(addAdmin, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <section className="space-y-4 rounded-xl bg-white p-6 md:col-span-2">
      <div>
        <h2 className="font-bold">Staff accounts</h2>
        <p className="text-ink-mute text-sm">
          {(Object.keys(ROLE_LABELS) as AdminRole[])
            .map((r) => `${ROLE_LABELS[r].label}: ${ROLE_LABELS[r].summary}`)
            .join(" · ")}
        </p>
      </div>
      <ul className="divide-line divide-y">
        {admins.map((a) => (
          <StaffRowForm key={a.id} staff={a} isSelf={a.id === currentAdminId} />
        ))}
      </ul>
      <form ref={ref} action={action} className="border-line grid gap-3 border-t pt-4 sm:grid-cols-2">
        <h3 className="font-semibold sm:col-span-2">Add a staff member</h3>
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
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Role</span>
          <select name="role" defaultValue="agent" className="field">
            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r].label}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-3 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton>Add staff account</SubmitButton>
        </div>
      </form>
    </section>
  );
}

export function SignOutEverywhere() {
  return (
    <form action={signOutEverywhere} className="rounded-xl bg-white p-6">
      <h2 className="font-bold">Sessions</h2>
      <p className="text-ink-mute mt-1 text-sm">
        Signs you out on every device, including this one, and forgets remembered devices. Use it if a device
        was lost. Two-step sign-in is on for every account: each sign-in needs a code emailed to that account.
      </p>
      <SubmitButton className="mt-3" pendingText="Signing out…">
        Sign out everywhere
      </SubmitButton>
    </form>
  );
}
