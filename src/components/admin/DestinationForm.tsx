"use client";

import { useActionState } from "react";
import { saveDestination } from "@/app/admin/actions";
import type { Destination } from "@/db/schema";
import { ImageUploader } from "./ImageUploader";
import { FormMessage, SubmitButton } from "./ui";

export function DestinationForm({ destination: d }: { destination?: Destination }) {
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
          <select name="country" defaultValue={d?.country ?? "Egypt"} className="field">
            <option>Egypt</option>
            <option>Jordan</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Web address</span>
          <input name="slug" defaultValue={d?.slug} placeholder="Made from the name if empty" className="field" />
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
        <input type="checkbox" name="isActive" defaultChecked={d?.isActive ?? true} className="h-4 w-4 accent-[var(--color-lapis)]" />
        Visible on the website
      </label>
      <FormMessage state={state} />
      <SubmitButton>{d ? "Save changes" : "Create destination"}</SubmitButton>
    </form>
  );
}
