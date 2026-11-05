import { requirePermission } from "@/features/identity/server/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DestinationForm } from "@/features/destination/components/admin/DestinationForm";
import { getDestinationById, listCountries } from "@/features/destination/server/destination.service";

export default async function EditDestination({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("catalog:edit");
  const { id } = await params;
  let dest = undefined;
  if (id !== "new") {
    if (!/^\d+$/.test(id)) notFound();
    dest = (await getDestinationById(Number(id))) ?? undefined;
    if (!dest) notFound();
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/destinations" className="text-lapis text-sm font-semibold hover:underline">
        All destinations
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{dest ? dest.name : "New destination"}</h1>
      <div className="mt-6">
        <DestinationForm destination={dest} countries={await listCountries()} />
      </div>
    </div>
  );
}
