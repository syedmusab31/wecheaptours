import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DestinationForm } from "@/components/admin/DestinationForm";
import { db } from "@/db";
import { destinations } from "@/db/schema";

export default async function EditDestination({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let dest = undefined;
  if (id !== "new") {
    if (!/^\d+$/.test(id)) notFound();
    [dest] = await db.select().from(destinations).where(eq(destinations.id, Number(id)));
    if (!dest) notFound();
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/destinations" className="text-sm font-semibold text-lapis hover:underline">
        All destinations
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{dest ? dest.name : "New destination"}</h1>
      <div className="mt-6">
        <DestinationForm destination={dest} />
      </div>
    </div>
  );
}
