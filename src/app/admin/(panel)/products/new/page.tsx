import { requirePermission } from "@/features/identity/server/auth";
import Link from "next/link";
import { ProductForm } from "@/features/catalog/components/admin/ProductForm";
import { listAllDestinations } from "@/features/destination/server/destination.service";

export default async function NewProductPage() {
  await requirePermission("catalog:edit");
  const dests = await listAllDestinations();
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/products" className="text-lapis text-sm font-semibold hover:underline">
        All products
      </Link>
      <h1 className="mt-2 text-2xl font-bold">New product</h1>
      <div className="mt-6">
        <ProductForm destinations={dests} />
      </div>
    </div>
  );
}
