"use client";

import { useActionState } from "react";
import { saveCountry, saveDestination } from "@/features/destination/server/destination.actions";
import type { Country, Destination } from "@/server/db/schema";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";

export function DestinationForm({
  destination: d,
  countries,
}: {
  destination?: Destination;
  countries: Country[];
}) {
  const [state, action] = useActionState(saveDestination, null);
  return (
    <form action={action} className="space-y-5 rounded-xl bg-white p-6">
      <input type="hidden" name="id" value={d?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name</span>
          <input name="name" required defaultValue={d?.name} className="field" />
        </label>
        <label className="block">
          <span className="label">Country</span>
          <select name="countryCode" defaultValue={d?.countryCode ?? countries[0]?.code} className="field">
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Web address</span>
          <input
            name="slug"
            defaultValue={d?.slug}
            placeholder="Made from the name if empty"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Order on the site</span>
          <input name="sortOrder" type="number" defaultValue={d?.sortOrder ?? 0} className="field tabular" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Tagline</span>
          <input name="tagline" defaultValue={d?.tagline} className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Description</span>
          <textarea name="description" rows={4} defaultValue={d?.description} className="field" />
        </label>
      </div>
      <div>
        <span className="label">Photo</span>
        <ImageUploader initial={d?.image ? [d.image] : []} max={1} />
      </div>
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={d?.isActive ?? true}
          className="h-4 w-4 accent-[var(--color-lapis)]"
        />
        Visible on the website
      </label>
      <FormMessage state={state} />
      <SubmitButton>{d ? "Save changes" : "Create destination"}</SubmitButton>
    </form>
  );
}

export function CountryForm({ countries }: { countries: Country[] }) {
  const [state, action] = useActionState(saveCountry, null);
  return (
    <section className="rounded-xl bg-white p-6">
      <h2 className="font-bold">Countries</h2>
      <p className="text-ink-mute mt-0.5 text-sm">
        Add a country here, then create its destinations. Saving an existing code updates it.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {countries.map((c) => (
          <li key={c.code} className={`bg-mist rounded-full px-3 py-1 ${c.isActive ? "" : "opacity-60"}`}>
            <b>{c.code}</b> {c.name} · {c.currency}
          </li>
        ))}
      </ul>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[90px_1fr_100px_90px_auto] sm:items-end">
        <label className="block">
          <span className="label">Code</span>
          <input name="code" required maxLength={2} placeholder="MA" className="field uppercase" />
        </label>
        <label className="block">
          <span className="label">Name</span>
          <input name="name" required placeholder="Morocco" className="field" />
        </label>
        <label className="block">
          <span className="label">Currency</span>
          <input name="currency" required maxLength={3} placeholder="MAD" className="field uppercase" />
        </label>
        <label className="block">
          <span className="label">Order</span>
          <input name="sortOrder" type="number" defaultValue={countries.length} className="field tabular" />
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" /> Active
        </label>
        <div className="sm:col-span-5">
          <FormMessage state={state} />
          <SubmitButton className="mt-2">Save country</SubmitButton>
        </div>
      </form>
    </section>
  );
}
