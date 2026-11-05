import { requirePermission } from "@/features/identity/server/auth";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CountryForm } from "@/features/destination/components/admin/DestinationForm";
import { listCountries, listDestinationsWithCounts } from "@/features/destination/server/destination.service";

export default async function DestinationsAdmin() {
  await requirePermission("catalog:edit");
  const [rows, countries] = await Promise.all([listDestinationsWithCounts(), listCountries()]);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Destinations</h1>
        <Link href="/admin/destinations/new" className="btn btn-primary">
          <Plus size={18} aria-hidden /> New destination
        </Link>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ destination: d, productCount: count }) => (
          <li key={d.id}>
            <Link
              href={`/admin/destinations/${d.id}`}
              className={`hover:ring-lapis/20 block overflow-hidden rounded-xl bg-white hover:ring-2 ${d.isActive ? "" : "opacity-60"}`}
            >
              <span className="bg-mist relative block aspect-[16/9]">
                {d.image && <Image src={d.image} alt="" fill sizes="300px" className="object-cover" />}
              </span>
              <span className="block p-4">
                <b>{d.name}</b> <span className="text-ink-mute text-sm">· {d.country}</span>
                <span className="text-ink-mute block text-sm">
                  {count} products{d.isActive ? "" : " · hidden"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <CountryForm countries={countries} />
      </div>
    </div>
  );
}
