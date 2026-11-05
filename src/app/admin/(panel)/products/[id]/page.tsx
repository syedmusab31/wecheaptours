import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/db";
import { destinations, products } from "@/db/schema";
import { CATEGORY_META } from "@/lib/rules";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [[product], dests] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)),
    db.select().from(destinations).orderBy(asc(destinations.sortOrder)),
  ]);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/products" className="text-sm font-semibold text-lapis hover:underline">
          All products
        </Link>
        <Link href={`/${CATEGORY_META[product.category].path}/${product.slug}`} target="_blank" className="text-sm font-semibold text-lapis hover:underline">
          View on site
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{product.title}</h1>
      <div className="mt-6">
        <ProductForm product={product} destinations={dests} />
      </div>
    </div>
  );
}
