"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";
import { PRICE_UNIT_LABEL } from "@/features/catalog/catalog.constants";
import { addAddon, addOption, addRule, removePricingItem } from "@/features/catalog/server/pricing.actions";
import { formatCentsExact } from "@/lib/money";
import type { PriceRule, PriceUnit, ProductAddon, ProductOption } from "@/server/db/schema";
import type { ActionState } from "@/lib/action-state";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Resets a form after a successful save */
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

function RemoveButton({
  kind,
  productId,
  id,
}: {
  kind: "option" | "addon" | "rule";
  productId: number;
  id: number;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this?")) start(() => removePricingItem(kind, productId, id));
      }}
      className="text-danger text-sm font-semibold hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}

export function OptionsEditor({ productId, options }: { productId: number; options: ProductOption[] }) {
  const [state, action] = useActionState(addOption, null);
  const ref = useResetOnSuccess(state);
  return (
    <section className="rounded-xl bg-white p-6">
      <h2 className="font-bold">Options</h2>
      <p className="text-ink-mute mt-0.5 text-sm">
        Variants with their own price, e.g. shared group vs private car. With options, guests must pick one
        and the product&apos;s base price is only shown as &quot;from&quot;.
      </p>
      <ul className="divide-line mt-3 divide-y text-sm">
        {options.map((o) => (
          <li
            key={o.id}
            className={`flex items-center justify-between gap-3 py-2 ${o.isActive ? "" : "opacity-50"}`}
          >
            <span>
              <b>{o.name}</b> · {formatCentsExact(o.priceCents)} {PRICE_UNIT_LABEL[o.priceUnit]} ·{" "}
              {o.minGuests}–{o.maxGuests} guests
              {!o.isActive && " · removed"}
            </span>
            {o.isActive && <RemoveButton kind="option" productId={productId} id={o.id} />}
          </li>
        ))}
        {options.length === 0 && (
          <li className="text-ink-mute py-2">No options: the product&apos;s own price applies.</li>
        )}
      </ul>
      <form ref={ref} action={action} className="border-line mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
        <input type="hidden" name="productId" value={productId} />
        <label className="block sm:col-span-2">
          <span className="label">Name</span>
          <input name="name" required className="field" placeholder="Private car" />
        </label>
        <label className="block">
          <span className="label">Price (USD)</span>
          <input name="price" type="number" step="0.01" min="0.01" required className="field tabular" />
        </label>
        <label className="block">
          <span className="label">Priced</span>
          <select name="priceUnit" className="field" defaultValue="person">
            {(Object.keys(PRICE_UNIT_LABEL) as PriceUnit[]).map((u) => (
              <option key={u} value={u}>
                {PRICE_UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Min guests</span>
          <input name="minGuests" type="number" min="1" defaultValue={1} className="field tabular" />
        </label>
        <label className="block">
          <span className="label">Max guests</span>
          <input name="maxGuests" type="number" min="1" defaultValue={12} className="field tabular" />
        </label>
        <label className="block sm:col-span-3">
          <span className="label">Short description</span>
          <input
            name="description"
            className="field"
            placeholder="Air-conditioned car and driver, no guide"
          />
        </label>
        <div className="space-y-2 sm:col-span-3">
          <FormMessage state={state} />
          <SubmitButton>Add option</SubmitButton>
        </div>
      </form>
    </section>
  );
}

export function AddonsEditor({ productId, addons }: { productId: number; addons: ProductAddon[] }) {
  const [state, action] = useActionState(addAddon, null);
  const ref = useResetOnSuccess(state);
  return (
    <section className="rounded-xl bg-white p-6">
      <h2 className="font-bold">Extras</h2>
      <p className="text-ink-mute mt-0.5 text-sm">
        Optional add-ons guests can tick, e.g. lunch or entry tickets.
      </p>
      <ul className="divide-line mt-3 divide-y text-sm">
        {addons.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2">
            <span>
              <b>{a.name}</b> · {formatCentsExact(a.priceCents)}{" "}
              {a.unit === "person" ? "per person" : "per booking"}
            </span>
            <RemoveButton kind="addon" productId={productId} id={a.id} />
          </li>
        ))}
        {addons.length === 0 && <li className="text-ink-mute py-2">No extras yet.</li>}
      </ul>
      <form
        ref={ref}
        action={action}
        className="border-line mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_120px_150px]"
      >
        <input type="hidden" name="productId" value={productId} />
        <label className="block">
          <span className="label">Name</span>
          <input name="name" required className="field" placeholder="Lunch on the felucca" />
        </label>
        <label className="block">
          <span className="label">Price (USD)</span>
          <input name="price" type="number" step="0.01" min="0.01" required className="field tabular" />
        </label>
        <label className="block">
          <span className="label">Charged</span>
          <select name="unit" className="field" defaultValue="person">
            <option value="person">per person</option>
            <option value="booking">per booking</option>
          </select>
        </label>
        <div className="space-y-2 sm:col-span-3">
          <FormMessage state={state} />
          <SubmitButton>Add extra</SubmitButton>
        </div>
      </form>
    </section>
  );
}

export function RulesEditor({
  productId,
  rules,
  options,
}: {
  productId: number;
  rules: PriceRule[];
  options: ProductOption[];
}) {
  const [state, action] = useActionState(addRule, null);
  const ref = useResetOnSuccess(state);
  const describe = (r: PriceRule) =>
    [
      r.startsOn || r.endsOn ? `${r.startsOn ?? "…"} to ${r.endsOn ?? "…"}` : "",
      r.weekdays?.length ? r.weekdays.map((d) => WEEKDAYS[d]).join(", ") : "",
      r.minGuests ? `${r.minGuests}+ guests` : "",
      r.optionId ? `option: ${options.find((o) => o.id === r.optionId)?.name ?? r.optionId}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "always";
  return (
    <section className="rounded-xl bg-white p-6">
      <h2 className="font-bold">Price rules</h2>
      <p className="text-ink-mute mt-0.5 text-sm">
        Seasonal or group adjustments. A rule applies when all its conditions match; percentages of matching
        rules add up. Stays apply date rules night by night.
      </p>
      <ul className="divide-line mt-3 divide-y text-sm">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2">
            <span>
              <b>{r.name}</b> · {Number(r.percentChange) > 0 ? "+" : ""}
              {Number(r.percentChange)}% · {describe(r)}
            </span>
            <RemoveButton kind="rule" productId={productId} id={r.id} />
          </li>
        ))}
        {rules.length === 0 && <li className="text-ink-mute py-2">No rules: the same price every day.</li>}
      </ul>
      <form ref={ref} action={action} className="border-line mt-4 grid gap-3 border-t pt-4 sm:grid-cols-4">
        <input type="hidden" name="productId" value={productId} />
        <label className="block sm:col-span-2">
          <span className="label">Name (shown to guests)</span>
          <input name="name" required className="field" placeholder="Christmas week" />
        </label>
        <label className="block">
          <span className="label">Change (%)</span>
          <input
            name="percentChange"
            type="number"
            step="0.5"
            required
            className="field tabular"
            placeholder="25 or -10"
          />
        </label>
        <label className="block">
          <span className="label">From guests</span>
          <input name="minGuests" type="number" min="1" className="field tabular" placeholder="any" />
        </label>
        <label className="block">
          <span className="label">From date</span>
          <input name="startsOn" type="date" className="field" />
        </label>
        <label className="block">
          <span className="label">To date</span>
          <input name="endsOn" type="date" className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Only for option</span>
          <select name="optionId" className="field" defaultValue="">
            <option value="">All options</option>
            {options
              .filter((o) => o.isActive)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </label>
        <fieldset className="sm:col-span-4">
          <legend className="label">Only on (none ticked = every day)</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5">
                <input type="checkbox" name="weekdays" value={i} className="h-4 w-4" /> {d}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2 sm:col-span-4">
          <FormMessage state={state} />
          <SubmitButton>Add rule</SubmitButton>
        </div>
      </form>
    </section>
  );
}
