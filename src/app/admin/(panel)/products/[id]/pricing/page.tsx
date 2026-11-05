import Link from "next/link";
import { notFound } from "next/navigation";
import { AddonsEditor, OptionsEditor, RulesEditor } from "@/features/catalog/components/admin/PricingEditor";
import { getPricingExtras, getProductById } from "@/features/catalog/server/catalog.service";
import { requirePermission } from "@/features/identity/server/auth";

export default async function ProductPricingPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("catalog:edit");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [product, extras] = await Promise.all([
    getProductById(id),
    getPricingExtras(id, { includeInactive: true }),
  ]);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href={`/admin/products/${id}`} className="text-lapis text-sm font-semibold hover:underline">
          Back to {product.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Pricing</h1>
      </div>
      <OptionsEditor productId={id} options={extras.options} />
      <AddonsEditor productId={id} addons={extras.addons} />
      <RulesEditor productId={id} rules={extras.rules} options={extras.options} />
    </div>
  );
}
