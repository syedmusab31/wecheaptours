"use client";

import { useActionState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";
import { clearSlots, generateSlots, setDayStatus } from "@/features/availability/server/availability.actions";
import { groupBy } from "@/lib/collections";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/server/db/schema";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function GenerateSlotsForm({ productId, from, to }: { productId: number; from: string; to: string }) {
  const [state, action] = useActionState(generateSlots, null);
  return (
    <form action={action} className="grid gap-3 rounded-xl bg-white p-6 sm:grid-cols-4">
      <h2 className="font-bold sm:col-span-4">Open dates</h2>
      <p className="text-ink-mute -mt-2 text-sm sm:col-span-4">
        Creates (or updates) one departure on each chosen weekday. Run it again with a new capacity to change
        existing dates.
      </p>
      <input type="hidden" name="productId" value={productId} />
      <label className="block">
        <span className="label">From</span>
        <input name="from" type="date" defaultValue={from} required className="field" />
      </label>
      <label className="block">
        <span className="label">To</span>
        <input name="to" type="date" defaultValue={to} required className="field" />
      </label>
      <label className="block">
        <span className="label">Capacity</span>
        <input name="capacity" type="number" min="1" defaultValue={12} required className="field tabular" />
      </label>
      <label className="block">
        <span className="label">Start time (optional)</span>
        <input name="startTime" type="time" className="field" />
      </label>
      <fieldset className="sm:col-span-4">
        <legend className="label">Weekdays</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-1.5">
              <input type="checkbox" name="weekdays" value={i} defaultChecked className="h-4 w-4" /> {d}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2 sm:col-span-4">
        <FormMessage state={state} />
        <SubmitButton>Save dates</SubmitButton>
      </div>
    </form>
  );
}

export function ClearSlotsForm({ productId, from, to }: { productId: number; from: string; to: string }) {
  const [state, action] = useActionState(clearSlots, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-6">
      <input type="hidden" name="productId" value={productId} />
      <div className="w-full">
        <h2 className="font-bold">Remove dates</h2>
        <p className="text-ink-mute text-sm">
          Deletes empty dates in the range. Removing every date makes the product &quot;on request&quot;
          again.
        </p>
      </div>
      <label className="block">
        <span className="label">From</span>
        <input name="from" type="date" defaultValue={from} required className="field" />
      </label>
      <label className="block">
        <span className="label">To</span>
        <input name="to" type="date" defaultValue={to} required className="field" />
      </label>
      <SubmitButton className="bg-danger hover:bg-danger/90">Remove empty dates</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Month-by-month list of dates. Click a date to close or reopen it. */
export function SlotCalendar({ productId, slots }: { productId: number; slots: AvailabilitySlot[] }) {
  const [pending, start] = useTransition();
  if (!slots.length) {
    return (
      <p className="text-ink-soft rounded-xl bg-white p-6">
        No dates yet: this product is sold <b>on request</b> (guests can ask for any date). Open dates above
        to sell from a calendar with live capacity.
      </p>
    );
  }
  const byMonth = groupBy(slots, (s) => s.startsOn.slice(0, 7));
  return (
    <div className="space-y-6">
      {byMonth.map(([month, list]) => (
        <section key={month} className="rounded-xl bg-white p-5">
          <h3 className="font-bold">
            {new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </h3>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {list.map((s) => {
              const full = s.reserved >= s.capacity;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={pending}
                    title={s.status === "open" ? "Click to close this date" : "Click to reopen this date"}
                    onClick={() =>
                      start(() =>
                        setDayStatus(productId, s.startsOn, s.status === "open" ? "closed" : "open"),
                      )
                    }
                    className={cn(
                      "w-full rounded-lg border px-2 py-1.5 text-left text-xs disabled:opacity-60",
                      s.status === "closed"
                        ? "border-line bg-mist text-ink-mute line-through"
                        : full
                          ? "border-danger/40 bg-danger-tint"
                          : "border-faience/40 bg-faience-tint",
                    )}
                  >
                    <b className="block text-sm">
                      {WEEKDAYS[new Date(`${s.startsOn}T12:00:00`).getDay()]} {Number(s.startsOn.slice(8))}
                      {s.startTime !== "00:00:00" ? ` · ${s.startTime.slice(0, 5)}` : ""}
                    </b>
                    <span className="tabular">
                      {s.reserved}/{s.capacity} booked
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
