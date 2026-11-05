"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { distinct } from "@/lib/collections";

type Opt = { value: string; label: string };

const TAGS: Opt[] = [
  { value: "history", label: "History & temples" },
  { value: "sea", label: "Sea & snorkelling" },
  { value: "desert", label: "Desert" },
  { value: "nile", label: "On the Nile" },
  { value: "culture", label: "Culture" },
  { value: "food", label: "Food" },
  { value: "family", label: "Good for families" },
  { value: "adventure", label: "Adventure" },
];

export function FilterPanel({
  destinations,
  durations,
  showDuration,
}: {
  destinations: { slug: string; name: string; country: string }[];
  durations: Opt[];
  showDuration: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  useEffect(() => {
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
  }, [sp]);

  function update(mut: (q: URLSearchParams) => void) {
    const q = new URLSearchParams(sp.toString());
    mut(q);
    start(() => router.replace(`${pathname}?${q.toString()}`, { scroll: false }));
  }
  const list = (key: string) => (sp.get(key) ?? "").split(",").filter(Boolean);
  const toggleList = (key: string, value: string) =>
    update((q) => {
      const cur = new Set(list(key));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      if (cur.size) q.set(key, [...cur].join(","));
      else q.delete(key);
    });
  const toggleFlag = (key: string) => update((q) => (q.get(key) === "1" ? q.delete(key) : q.set(key, "1")));

  const active = ["where", "country", "min", "max", "duration", "tags", "private", "pickup"].some((k) =>
    sp.get(k),
  );
  const group = "border-b border-line py-5 first:pt-0";
  const legend = "mb-3 text-sm font-bold";
  const check = "flex cursor-pointer items-center gap-2.5 py-1 text-[0.95rem] text-ink-soft hover:text-ink";

  const body = (
    <div className={pending ? "opacity-60 transition-opacity" : undefined}>
      <div role="group" aria-label="Destination" className={group}>
        <p className={legend}>Destination</p>
        <select
          className="field"
          value={sp.get("where") ?? ""}
          onChange={(e) =>
            update((q) => (e.target.value ? q.set("where", e.target.value) : q.delete("where")))
          }
        >
          <option value="">All destinations</option>
          {distinct(destinations.map((d) => d.country)).map((c) => (
            <optgroup key={c} label={c}>
              {destinations
                .filter((d) => d.country === c)
                .map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <div className="mt-3 flex gap-2">
          {distinct(destinations.map((d) => d.country)).map((c) => {
            const on = sp.get("country") === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => update((q) => (on ? q.delete("country") : q.set("country", c)))}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${on ? "border-lapis bg-lapis-tint text-lapis" : "border-line text-ink-soft hover:border-ink-mute"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="Price in USD" className={group}>
        <p className={legend}>Price in USD</p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update((q) => {
              if (min) q.set("min", min);
              else q.delete("min");
              if (max) q.set("max", max);
              else q.delete("max");
            });
          }}
        >
          <input
            aria-label="Minimum price"
            inputMode="numeric"
            className="field tabular"
            placeholder="Min"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          />
          <span className="text-ink-mute">–</span>
          <input
            aria-label="Maximum price"
            inputMode="numeric"
            className="field tabular"
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn btn-ghost px-3">Go</button>
        </form>
      </div>

      {showDuration && (
        <div role="group" aria-label="Duration" className={group}>
          <p className={legend}>Duration</p>
          {durations.map((d) => (
            <label key={d.value} className={check}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-lapis)]"
                checked={list("duration").includes(d.value)}
                onChange={() => toggleList("duration", d.value)}
              />
              {d.label}
            </label>
          ))}
        </div>
      )}

      <div role="group" aria-label="Good to know" className={group}>
        <p className={legend}>Good to know</p>
        <label className={check}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-lapis)]"
            checked={sp.get("pickup") === "1"}
            onChange={() => toggleFlag("pickup")}
          />
          Hotel pickup included
        </label>
        <label className={check}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-lapis)]"
            checked={sp.get("private") === "1"}
            onChange={() => toggleFlag("private")}
          />
          Private, just your group
        </label>
      </div>

      <div role="group" aria-label="Interests" className={group}>
        <p className={legend}>Interests</p>
        {TAGS.map((t) => (
          <label key={t.value} className={check}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-lapis)]"
              checked={list("tags").includes(t.value)}
              onChange={() => toggleList("tags", t.value)}
            />
            {t.label}
          </label>
        ))}
      </div>

      {active && (
        <button
          type="button"
          className="text-lapis mt-4 text-sm font-semibold hover:underline"
          onClick={() =>
            update((q) =>
              ["where", "country", "min", "max", "duration", "tags", "private", "pickup"].forEach((k) =>
                q.delete(k),
              ),
            )
          }
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <details className="border-line rounded-xl border lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal size={18} aria-hidden /> Filters
          {active && <span className="bg-lapis ml-1 h-2 w-2 rounded-full" />}
        </summary>
        <div className="border-line border-t p-4">{body}</div>
      </details>
      <div className="hidden lg:block">{body}</div>
    </>
  );
}
