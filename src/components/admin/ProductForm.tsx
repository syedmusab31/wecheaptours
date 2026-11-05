"use client";

import { useActionState, useState } from "react";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import type { Category, Destination, PriceUnit, Product } from "@/db/schema";
import { CATEGORY_META, CATEGORIES, PRICE_UNIT_LABEL, RULES } from "@/lib/rules";
import { slugify } from "@/lib/utils";
import { ImageUploader } from "./ImageUploader";
import { FormMessage, SubmitButton } from "./ui";

const DEFAULT_UNIT: Record<Category, PriceUnit> = { tour: "person", cruise: "person", transfer: "vehicle", stay: "night", package: "person" };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 sm:p-6">
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-mute">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ProductForm({ product, destinations }: { product?: Product; destinations: Destination[] }) {
  const [state, action] = useActionState(saveProduct, null);
  const [category, setCategory] = useState<Category>(product?.category ?? "tour");
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const p = product;
  const itineraryText = (p?.itinerary ?? []).map((s) => [s.time, s.title, s.detail].filter(Boolean).join(" | ")).join("\n");
  const r = RULES[category];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={p?.id ?? ""} />

      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Title</span>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="field"
            />
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="field">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].singular}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Destination</span>
            <select name="destinationId" defaultValue={p?.destinationId ?? ""} className="field">
              <option value="">None</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}, {d.country}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Web address</span>
            <div className="flex items-center rounded-[10px] border border-line focus-within:border-lapis">
              <span className="pl-3 text-sm text-ink-mute">/{CATEGORY_META[category].path}/</span>
              <input
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                className="w-full rounded-[10px] bg-transparent px-1 py-2.5 outline-none"
              />
            </div>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Short summary</span>
            <input name="summary" maxLength={300} defaultValue={p?.summary} className="field" placeholder="One sentence shown on cards and search results" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Description</span>
            <textarea name="description" rows={5} defaultValue={p?.description} className="field" />
          </label>
        </div>
      </Section>

      <Section title="Photos" hint="Upload to Cloudinary or paste links. The first photo is the cover; use the arrow to reorder.">
        <ImageUploader initial={p?.images ?? []} />
      </Section>

      <Section title="Price and capacity" hint="All prices in US dollars. Visitors can switch currency on the site.">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Price (USD)</span>
            <input name="price" type="number" min="1" step="0.01" required defaultValue={p ? Number(p.price) : ""} className="field tabular" />
          </label>
          <label className="block">
            <span className="label">Charged</span>
            <select name="priceUnit" key={category} defaultValue={p && p.category === category ? p.priceUnit : DEFAULT_UNIT[category]} className="field">
              {(Object.keys(PRICE_UNIT_LABEL) as PriceUnit[]).map((u) => (
                <option key={u} value={u}>
                  {PRICE_UNIT_LABEL[u]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Duration label</span>
            <input name="durationLabel" defaultValue={p?.durationLabel} placeholder="Full day · 8 hours" className="field" />
          </label>
          <label className="block">
            <span className="label">Duration in hours</span>
            <input name="durationHours" type="number" min="1" defaultValue={p?.durationHours ?? 8} className="field tabular" />
            <span className="mt-1 block text-xs text-ink-mute">For filters. Multi-day: days × 24.</span>
          </label>
          <label className="block">
            <span className="label">Minimum guests</span>
            <input name="minGuests" type="number" min="1" defaultValue={p?.minGuests ?? 1} className="field tabular" />
          </label>
          <label className="block">
            <span className="label">Maximum guests</span>
            <input name="maxGuests" type="number" min="1" defaultValue={p?.maxGuests ?? 12} className="field tabular" />
          </label>
          {category === "stay" && (
            <>
              <label className="block">
                <span className="label">Bedrooms</span>
                <input name="bedrooms" type="number" min="0" defaultValue={p?.bedrooms ?? 1} className="field tabular" />
              </label>
              <label className="block">
                <span className="label">Minimum nights</span>
                <input name="minNights" type="number" min="1" defaultValue={p?.minNights ?? 2} className="field tabular" />
              </label>
            </>
          )}
        </div>
        <p className="rounded-lg bg-mist px-4 py-3 text-sm text-ink-soft">
          Standard rules for {CATEGORY_META[category].plural.toLowerCase()}: book at least{" "}
          {r.leadHours >= 48 ? `${r.leadHours / 24} days` : `${r.leadHours} hours`} ahead · free cancellation up to{" "}
          {r.freeCancelHours >= 48 ? `${r.freeCancelHours / 24} days` : `${r.freeCancelHours} hours`} before ·{" "}
          {r.depositShare ? `${r.depositShare * 100}% deposit at confirmation` : "pay on the day"}. Children 4–11 pay half on per-person prices.
        </p>
      </Section>

      <Section title="What's in it" hint="One item per line.">
        <label className="block">
          <span className="label">Highlights</span>
          <textarea name="highlights" rows={4} defaultValue={p?.highlights.join("\n")} className="field" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Included</span>
            <textarea name="included" rows={5} defaultValue={p?.included.join("\n")} className="field" />
          </label>
          <label className="block">
            <span className="label">Not included</span>
            <textarea name="excluded" rows={5} defaultValue={p?.excluded.join("\n")} className="field" />
          </label>
        </div>
        <label className="block">
          <span className="label">Itinerary</span>
          <textarea name="itinerary" rows={6} defaultValue={itineraryText} className="field font-mono text-sm" placeholder={"08:00 | Hotel pickup\n09:00 | Giza pyramids | Guided walk and free time\nDay 2 · Edfu | Temple of Horus"} />
          <span className="mt-1 block text-xs text-ink-mute">One step per line: time | title | details. Time and details are optional.</span>
        </label>
      </Section>

      <Section title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">{category === "stay" ? "Check-in information" : "Meeting point"}</span>
            <input name="meetingPoint" defaultValue={p?.meetingPoint} className="field" />
          </label>
          <label className="block">
            <span className="label">Languages</span>
            <input name="languages" defaultValue={(p?.languages ?? ["English", "Arabic"]).join(", ")} className="field" />
          </label>
          <label className="block">
            <span className="label">Interests (for filters)</span>
            <input name="tags" defaultValue={p?.tags.join(", ")} placeholder="history, sea, desert, nile, culture, food, family, adventure" className="field" />
          </label>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
          {[
            ["pickupIncluded", "Hotel pickup included", p?.pickupIncluded ?? true],
            ["isPrivate", "Private (just the guest's group)", p?.isPrivate ?? false],
            ["isFeatured", "Feature on the homepage", p?.isFeatured ?? false],
            ["isActive", "Visible on the website", p?.isActive ?? true],
          ].map(([name, label, checked]) => (
            <label key={name as string} className="flex items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" name={name as string} defaultChecked={checked as boolean} className="h-4 w-4 accent-[var(--color-lapis)]" />
              {label as string}
            </label>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-mist/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <SubmitButton>{p ? "Save changes" : "Create product"}</SubmitButton>
        <div className="min-w-0 flex-1">
          <FormMessage state={state} />
        </div>
        {p && (
          <button
            type="button"
            className="text-sm font-semibold text-danger hover:underline"
            onClick={async () => {
              if (confirm("Delete this product? If it has bookings it will be hidden instead.")) await deleteProduct(p.id);
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
