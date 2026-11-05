import { requirePermission } from "@/features/identity/server/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/catalog/components/admin/ProductForm";
import { getProductById } from "@/features/catalog/server/catalog.service";
import { listAllDestinations } from "@/features/destination/server/destination.service";
import { CATEGORY_META } from "@/features/catalog/catalog.constants";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("catalog:edit");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [product, dests] = await Promise.all([getProductById(id), listAllDestinations()]);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/products" className="text-lapis text-sm font-semibold hover:underline">
          All products
        </Link>
        <span className="flex gap-4">
          <Link
            href={`/admin/products/${product.id}/pricing`}
            className="text-lapis text-sm font-semibold hover:underline"
          >
            Options, extras and rules
          </Link>
          <Link
            href={`/admin/products/${product.id}/availability`}
            className="text-lapis text-sm font-semibold hover:underline"
          >
            Availability
          </Link>
          <Link
            href={`/${CATEGORY_META[product.category].path}/${product.slug}`}
            target="_blank"
            className="text-lapis text-sm font-semibold hover:underline"
          >
            View on site
          </Link>
        </span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{product.title}</h1>
      <div className="mt-6">
        <ProductForm product={product} destinations={dests} />
      </div>
    </div>
  );
}
