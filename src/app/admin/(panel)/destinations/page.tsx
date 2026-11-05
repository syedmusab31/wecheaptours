import Image from "next/image";
import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { destinations, products } from "@/db/schema";

export default async function DestinationsAdmin() {
  const rows = await db
    .select({ d: destinations, count: sql<number>`count(${products.id})::int` })
    .from(destinations)
    .leftJoin(products, eq(products.destinationId, destinations.id))
    .groupBy(destinations.id)
    .orderBy(asc(destinations.sortOrder));
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Destinations</h1>
        <Link href="/admin/destinations/new" className="btn btn-primary">
          <Plus size={18} aria-hidden /> New destination
        </Link>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ d, count }) => (
          <li key={d.id}>
            <Link href={`/admin/destinations/${d.id}`} className={`block overflow-hidden rounded-xl bg-white hover:ring-2 hover:ring-lapis/20 ${d.isActive ? "" : "opacity-60"}`}>
              <span className="relative block aspect-[16/9] bg-mist">{d.image && <Image src={d.image} alt="" fill sizes="300px" className="object-cover" />}</span>
              <span className="block p-4">
                <b>{d.name}</b> <span className="text-sm text-ink-mute">· {d.country}</span>
                <span className="block text-sm text-ink-mute">
                  {count} products{d.isActive ? "" : " · hidden"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
