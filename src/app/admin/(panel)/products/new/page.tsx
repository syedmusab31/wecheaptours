import Link from "next/link";
import { asc } from "drizzle-orm";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/db";
import { destinations } from "@/db/schema";

export default async function NewProductPage() {
  const dests = await db.select().from(destinations).orderBy(asc(destinations.sortOrder));
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/products" className="text-sm font-semibold text-lapis hover:underline">
        All products
      </Link>
      <h1 className="mt-2 text-2xl font-bold">New product</h1>
      <div className="mt-6">
        <ProductForm destinations={dests} />
      </div>
    </div>
  );
}
