import { asc } from "drizzle-orm";
import { AddAdminForm, PasswordForm, SettingsForm } from "@/components/admin/SettingsForms";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { getSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const [settings, admins] = await Promise.all([
    getSettings(),
    db.select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name }).from(adminUsers).orderBy(asc(adminUsers.id)),
  ]);
  const integrations = [
    { name: "Database", ok: Boolean(process.env.DATABASE_URL) },
    { name: "Email (SMTP)", ok: Boolean(process.env.SMTP_HOST), hint: "Without it, emails are only printed in the server log." },
    { name: "Cloudinary uploads", ok: Boolean(process.env.CLOUDINARY_API_SECRET && process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), hint: "Without it, add photos by pasting links." },
    { name: "Booking alerts to", ok: Boolean(process.env.NOTIFY_EMAIL), value: process.env.NOTIFY_EMAIL },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm settings={settings} />

      <section className="rounded-xl bg-white p-6">
        <h2 className="font-bold">Connections</h2>
        <p className="mt-0.5 text-sm text-ink-mute">Set in your hosting environment variables (see README).</p>
        <ul className="mt-4 divide-y divide-line text-sm">
          {integrations.map((i) => (
            <li key={i.name} className="flex items-start justify-between gap-4 py-2.5">
              <span>
                <b>{i.name}</b>
                {!i.ok && i.hint && <span className="block text-ink-mute">{i.hint}</span>}
              </span>
              <span className={i.ok ? "font-semibold text-faience" : "font-semibold text-[#8a5a00]"}>{i.ok ? i.value ?? "Connected" : "Not set"}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <PasswordForm />
        <AddAdminForm admins={admins} />
      </div>
    </div>
  );
}
