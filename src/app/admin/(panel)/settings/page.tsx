import {
  PasswordForm,
  SettingsForm,
  SignOutEverywhere,
  StaffManager,
} from "@/features/settings/components/admin/SettingsForms";
import { requireAdmin } from "@/features/identity/server/auth";
import { can } from "@/features/identity/server/permissions";
import { listAdmins } from "@/features/identity/server/auth.service";
import { getSettings } from "@/features/settings/server/settings.service";
import { env } from "@/config/env";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  if (!can(admin.role, "settings:edit")) {
    // Everyone can manage their own password and sessions; the rest is for owners.
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">Your account</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <PasswordForm />
          <SignOutEverywhere />
        </div>
      </div>
    );
  }
  const [settings, admins] = await Promise.all([getSettings(), listAdmins()]);
  const integrations = [
    { name: "Database", ok: Boolean(env.DATABASE_URL) },
    {
      name: "Email (SMTP)",
      ok: Boolean(env.SMTP_HOST),
      hint: "Without it, emails are only printed in the server log.",
    },
    {
      name: "Cloudinary uploads",
      ok: Boolean(env.CLOUDINARY_API_SECRET && env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
      hint: "Without it, add photos by pasting links.",
    },
    { name: "Booking alerts to", ok: Boolean(env.NOTIFY_EMAIL), value: env.NOTIFY_EMAIL },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm settings={settings} />

      <section className="rounded-xl bg-white p-6">
        <h2 className="font-bold">Connections</h2>
        <p className="text-ink-mute mt-0.5 text-sm">
          Set in your hosting environment variables (see README).
        </p>
        <ul className="divide-line mt-4 divide-y text-sm">
          {integrations.map((i) => (
            <li key={i.name} className="flex items-start justify-between gap-4 py-2.5">
              <span>
                <b>{i.name}</b>
                {!i.ok && i.hint && <span className="text-ink-mute block">{i.hint}</span>}
              </span>
              <span className={i.ok ? "text-faience font-semibold" : "font-semibold text-[#8a5a00]"}>
                {i.ok ? (i.value ?? "Connected") : "Not set"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <PasswordForm />
        <SignOutEverywhere />
        {can(admin.role, "staff:manage") && <StaffManager admins={admins} currentAdminId={admin.id} />}
      </div>
    </div>
  );
}
