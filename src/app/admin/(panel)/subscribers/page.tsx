import { desc } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export default async function SubscribersPage() {
  const rows = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Deal subscribers</h1>
          <p className="mt-1 text-ink-soft">{rows.length} people signed up for the deals email.</p>
        </div>
        <a href="/api/admin/export/subscribers" className="btn btn-ghost text-sm">
          <Download size={16} aria-hidden /> Export CSV
        </a>
      </div>
      <ul className="mt-6 divide-y divide-line rounded-xl bg-white">
        {rows.map((s) => (
          <li key={s.id} className="flex justify-between gap-3 px-5 py-3 text-sm">
            <span className="truncate font-medium">{s.email}</span>
            <span className="shrink-0 text-ink-mute">{formatDate(s.createdAt)}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="p-8 text-center text-ink-soft">No subscribers yet.</li>}
      </ul>
    </div>
  );
}
