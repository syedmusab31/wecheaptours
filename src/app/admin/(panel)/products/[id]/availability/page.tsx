import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClearSlotsForm,
  GenerateSlotsForm,
  SlotCalendar,
} from "@/features/availability/components/admin/AvailabilityCalendar";
import { listSlots } from "@/features/availability/server/availability.service";
import { getProductById } from "@/features/catalog/server/catalog.service";
import { requirePermission } from "@/features/identity/server/auth";
import { addDays, toISODate } from "@/lib/dates";

export default async function ProductAvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("catalog:edit");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const product = await getProductById(id);
  if (!product) notFound();
  const today = toISODate(new Date());
  const slots = await listSlots(id, today, addDays(today, 365));
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={`/admin/products/${id}`} className="text-lapis text-sm font-semibold hover:underline">
          Back to {product.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Availability</h1>
        <p className="text-ink-soft mt-1">
          Capacity counts{" "}
          {product.priceUnit === "person"
            ? "seats (adults and children)"
            : "units (one per booking: a car, a group or the whole property)"}
          . Two guests can never take the last seat at the same time.
        </p>
      </div>
      <GenerateSlotsForm productId={id} from={today} to={addDays(today, 90)} />
      <SlotCalendar productId={id} slots={slots} />
      <ClearSlotsForm productId={id} from={today} to={addDays(today, 365)} />
    </div>
  );
}
