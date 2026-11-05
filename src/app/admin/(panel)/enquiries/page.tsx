import { requirePermission } from "@/features/identity/server/auth";
import Link from "next/link";
import { EnquiryStatusSelect } from "@/features/enquiry/components/admin/EnquiryStatusSelect";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { listForAdmin } from "@/features/enquiry/server/enquiry.service";
import { enquiryStatusEnum } from "@/server/db/schema";
import { cn, formatDate } from "@/lib/utils";

const TOPIC: Record<string, string> = {
  general: "General",
  package: "Custom package",
  concierge: "Concierge",
  event: "Event",
  product: "About a trip",
};

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("booking:view");
  const sp = await searchParams;
  const status = enquiryStatusEnum.enumValues.find((s) => s === sp.status);
  const rows = await listForAdmin(status);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Enquiries</h1>
      <p className="text-ink-soft mt-1">
        Quote requests for concierge, events, custom packages and questions.
      </p>
      <nav className="mt-5 inline-flex flex-wrap gap-1 rounded-xl bg-white p-1">
        {[undefined, ...enquiryStatusEnum.enumValues].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/enquiries?status=${s}` : "/admin/enquiries"}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold capitalize",
              status === s ? "bg-ink text-white" : "text-ink-soft hover:bg-mist",
            )}
          >
            {s ?? "All"}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-ink-soft mt-6 rounded-xl bg-white p-8 text-center">No enquiries here yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map(({ enquiry: e, productTitle }) => {
            const wa = e.phone.replace(/\D/g, "");
            return (
              <li key={e.id} className="rounded-xl bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <b>{e.name}</b>
                      <StatusBadge status={e.status} />
                      <span className="bg-lapis-tint text-lapis rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {TOPIC[e.topic] ?? e.topic}
                      </span>
                    </p>
                    <p className="text-ink-mute mt-1 text-sm">
                      {formatDate(e.createdAt)}
                      {e.travelDate && ` · for ${formatDate(e.travelDate)}`}
                      {e.guests && ` · ${e.guests} people`}
                      {e.budget && ` · budget ${e.budget}`}
                      {productTitle && ` · ${productTitle}`}
                    </p>
                  </div>
                  <EnquiryStatusSelect id={e.id} status={e.status} />
                </div>
                <p className="mt-3 whitespace-pre-line">{e.message}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <a
                    href={`mailto:${e.email}?subject=${encodeURIComponent("Your request to WeCheapTours")}`}
                    className="btn btn-ghost py-2"
                  >
                    Reply to {e.email}
                  </a>
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}`}
                      target="_blank"
                      rel="noopener"
                      className="btn bg-faience py-2 text-white hover:bg-[#086a63]"
                    >
                      WhatsApp {e.phone}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
