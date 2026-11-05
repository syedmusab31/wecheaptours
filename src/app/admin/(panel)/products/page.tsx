import { requirePermission } from "@/features/identity/server/auth";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductToggles } from "@/features/catalog/components/admin/ProductToggles";
import { listProductsForAdmin } from "@/features/catalog/server/catalog.service";
import { categoryEnum, type Category } from "@/server/db/schema";
import { CATEGORY_META, PRICE_UNIT_LABEL } from "@/features/catalog/catalog.constants";
import { cn } from "@/lib/utils";
import { formatCentsExact } from "@/lib/money";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; saved?: string }>;
}) {
  await requirePermission("catalog:edit");
  const sp = await searchParams;
  const category = categoryEnum.enumValues.includes(sp.category as Category)
    ? (sp.category as Category)
    : undefined;
  const rows = await listProductsForAdmin(category);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-ink-soft mt-1">{rows.length} items. Prices are in US dollars.</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">
          <Plus size={18} aria-hidden /> New product
        </Link>
      </div>
      {sp.saved && (
        <p className="bg-faience-tint text-faience mt-4 rounded-lg px-4 py-3 text-sm font-medium">
          Product saved.
        </p>
      )}

      <nav className="mt-5 flex flex-wrap gap-1 rounded-xl bg-white p-1">
        {[undefined, ...categoryEnum.enumValues].map((c) => (
          <Link
            key={c ?? "all"}
            href={c ? `/admin/products?category=${c}` : "/admin/products"}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold",
              category === c ? "bg-ink text-white" : "text-ink-soft hover:bg-mist",
            )}
          >
            {c ? CATEGORY_META[c].label : "All"}
          </Link>
        ))}
      </nav>

      <div className="mt-5 overflow-x-auto rounded-xl bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-line text-ink-mute border-b">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 text-right font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">On site</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map(({ product: p, destinationName: dest }) => (
              <tr key={p.id} className={cn("hover:bg-mist/60", !p.isActive && "opacity-60")}>
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="bg-mist relative h-12 w-16 shrink-0 overflow-hidden rounded-md">
                      {p.images[0] && (
                        <Image src={p.images[0]} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink hover:text-lapis line-clamp-1 font-semibold">{p.title}</span>
                      <span className="text-ink-mute block text-xs">
                        {CATEGORY_META[p.category].singular} · {p.durationLabel}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">{dest ?? "—"}</td>
                <td className="tabular px-4 py-3 text-right">
                  <b>{formatCentsExact(p.priceCents, p.currency)}</b>
                  <span className="text-ink-mute block text-xs">{PRICE_UNIT_LABEL[p.priceUnit]}</span>
                </td>
                <td className="tabular px-4 py-3">
                  {p.reviewCount ? `${Number(p.rating).toFixed(1)} (${p.reviewCount})` : "—"}
                </td>
                <td className="px-4 py-3">
                  <ProductToggles id={p.id} isActive={p.isActive} isFeatured={p.isFeatured} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
