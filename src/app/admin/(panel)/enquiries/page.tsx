import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { EnquiryStatusSelect } from "@/components/admin/EnquiryStatusSelect";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { db } from "@/db";
import { enquiries, enquiryStatusEnum, products } from "@/db/schema";
import { cn, formatDate } from "@/lib/utils";

const TOPIC: Record<string, string> = {
  general: "General",
  package: "Custom package",
  concierge: "Concierge",
  event: "Event",
  product: "About a trip",
};

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = enquiryStatusEnum.enumValues.find((s) => s === sp.status);
  const rows = await db
    .select({ e: enquiries, productTitle: products.title })
    .from(enquiries)
    .leftJoin(products, eq(enquiries.productId, products.id))
    .where(status ? eq(enquiries.status, status) : undefined)
    .orderBy(desc(enquiries.createdAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Enquiries</h1>
      <p className="mt-1 text-ink-soft">Quote requests for concierge, events, custom packages and questions.</p>
      <nav className="mt-5 inline-flex flex-wrap gap-1 rounded-xl bg-white p-1">
        {[undefined, ...enquiryStatusEnum.enumValues].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/enquiries?status=${s}` : "/admin/enquiries"}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold capitalize", status === s ? "bg-ink text-white" : "text-ink-soft hover:bg-mist")}
          >
            {s ?? "All"}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-8 text-center text-ink-soft">No enquiries here yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map(({ e, productTitle }) => {
            const wa = e.phone.replace(/\D/g, "");
            return (
              <li key={e.id} className="rounded-xl bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <b>{e.name}</b>
                      <StatusBadge status={e.status} />
                      <span className="rounded-full bg-lapis-tint px-2.5 py-0.5 text-xs font-semibold text-lapis">{TOPIC[e.topic] ?? e.topic}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-mute">
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
                  <a href={`mailto:${e.email}?subject=${encodeURIComponent("Your request to WeCheapTours")}`} className="btn btn-ghost py-2">
                    Reply to {e.email}
                  </a>
                  {wa && (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="btn bg-faience py-2 text-white hover:bg-[#086a63]">
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
