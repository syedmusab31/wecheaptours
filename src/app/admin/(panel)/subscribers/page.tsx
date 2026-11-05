import { requirePermission } from "@/features/identity/server/auth";
import { Download } from "lucide-react";
import { listSubscribers } from "@/features/newsletter/server/newsletter.service";
import { formatDate } from "@/lib/utils";

export default async function SubscribersPage() {
  await requirePermission("data:export");
  const rows = await listSubscribers();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Deal subscribers</h1>
          <p className="text-ink-soft mt-1">{rows.length} people signed up for the deals email.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page */}
        <a href="/api/admin/export/subscribers" className="btn btn-ghost text-sm">
          <Download size={16} aria-hidden /> Export CSV
        </a>
      </div>
      <ul className="divide-line mt-6 divide-y rounded-xl bg-white">
        {rows.map((s) => (
          <li key={s.id} className="flex justify-between gap-3 px-5 py-3 text-sm">
            <span className="truncate font-medium">{s.email}</span>
            <span className="text-ink-mute shrink-0">{formatDate(s.createdAt)}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-ink-soft p-8 text-center">No subscribers yet.</li>}
      </ul>
    </div>
  );
}
