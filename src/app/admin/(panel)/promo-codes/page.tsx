import { PromoCodeForm, PromoCodeList } from "@/features/promotion/components/admin/PromoCodes";
import { requirePermission } from "@/features/identity/server/auth";
import { listPromoCodes } from "@/features/promotion/server/promo.service";

export default async function PromoCodesPage() {
  await requirePermission("catalog:edit");
  const codes = await listPromoCodes();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promo codes</h1>
        <p className="text-ink-soft mt-1">
          Guests enter a code at checkout. Each booking uses one redemption.
        </p>
      </div>
      <PromoCodeForm />
      <PromoCodeList codes={codes} />
    </div>
  );
}
