"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Car,
  ChevronDown,
  Compass,
  MapPin,
  Package,
  Search,
  Ship,
  Users,
} from "lucide-react";
import type { Category } from "@/server/db/schema";
import { addDays, toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { distinct } from "@/lib/collections";
import { joinList } from "@/lib/text";

type Dest = { slug: string; name: string; country: string };

const TABS: {
  id: Category;
  label: string;
  icon: typeof Compass;
  where: string;
  whereAll: string;
  date: string;
}[] = [
  { id: "tour", label: "Day trips", icon: Compass, where: "Where", whereAll: "Anywhere", date: "Date" },
  {
    id: "cruise",
    label: "Nile cruises",
    icon: Ship,
    where: "Sail from",
    whereAll: "Luxor or Aswan",
    date: "Departure",
  },
  {
    id: "transfer",
    label: "Transfers",
    icon: Car,
    where: "Pickup city",
    whereAll: "Any city",
    date: "Pickup date",
  },
  { id: "stay", label: "Stays", icon: BedDouble, where: "Where", whereAll: "Anywhere", date: "Check in" },
  {
    id: "package",
    label: "Packages",
    icon: Package,
    where: "Trip covers",
    whereAll: "", // filled from the destinations' countries below
    date: "Start",
  },
];

export type SearchInitial = { type?: Category; where?: string; date?: string; end?: string; guests?: number };

/**
 * The site's one search control.
 * `hero`: glass tabs over the photo and a floating pill bar.
 * `compact`: the same bar on the results page, with tabs as a dropdown.
 */
export function HeroSearch({
  destinations,
  available,
  initial,
  variant = "hero",
  className,
}: {
  destinations: Dest[];
  available: Partial<Record<Category, string[]>>;
  initial?: SearchInitial;
  variant?: "hero" | "compact";
  className?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<Category>(initial?.type ?? "tour");
  const [where, setWhere] = useState(initial?.where ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const tab = TABS.find((t) => t.id === type)!;
  const today = toISODate(new Date());
  const hero = variant === "hero";

  const options = useMemo(() => {
    const allowed = new Set(available[type] ?? []);
    return destinations.filter((d) => allowed.has(d.slug));
  }, [available, destinations, type]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ type });
    if (where) q.set("where", where);
    if (date) q.set("date", date);
    if (type === "stay" && end) q.set("end", end);
    if (guests) q.set("guests", String(guests));
    router.push(`/search?${q.toString()}`);
  }

  const seg = cn(
    "group relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-mist focus-within:bg-mist",
    "lg:rounded-full lg:px-6",
  );
  const lab = "block text-[0.72rem] font-semibold text-ink-mute";

  return (
    <form onSubmit={submit} className={className}>
      {hero && (
        <div
          role="tablist"
          aria-label="What are you booking?"
          className="scroll-row -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1"
        >
          {TABS.map((t) => {
            const on = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setType(t.id);
                  setWhere("");
                }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                  on ? "text-ink bg-white shadow-sm" : "glass text-white hover:bg-white/25",
                )}
              >
                <t.icon size={16} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1 bg-white p-2 lg:flex-row lg:items-center lg:gap-0",
          hero
            ? "rounded-[24px] shadow-[var(--shadow-float)] lg:rounded-full"
            : "border-line rounded-[22px] border lg:rounded-full",
        )}
      >
        {!hero && (
          <label className={cn(seg, "lg:max-w-[200px]")}>
            <Compass size={18} className="text-ink-mute shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className={lab}>Looking for</span>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as Category);
                  setWhere("");
                }}
                className="bare-input truncate"
              >
                {TABS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
        )}
        {!hero && <Divider />}
        <label className={cn(seg, "lg:flex-[1.4]")}>
          <MapPin size={18} className="text-ink-mute shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={lab}>{tab.where}</span>
            <select value={where} onChange={(e) => setWhere(e.target.value)} className="bare-input truncate">
              <option value="">
                {tab.whereAll || joinList(distinct(destinations.map((d) => d.country)), "or") || "Anywhere"}
              </option>
              {distinct(options.map((d) => d.country)).map((c) => {
                const list = options.filter((d) => d.country === c);
                if (!list.length) return null;
                return (
                  <optgroup key={c} label={c}>
                    {list.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </span>
          <ChevronDown size={16} className="text-ink-mute shrink-0" aria-hidden />
        </label>
        <Divider />
        <label className={seg}>
          <CalendarDays size={18} className="text-ink-mute shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={lab}>{tab.date}</span>
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (type === "stay" && e.target.value && (!end || end <= e.target.value))
                  setEnd(addDays(e.target.value, 2));
              }}
              className={cn("bare-input", !date && "text-ink-mute")}
            />
          </span>
        </label>
        {type === "stay" && (
          <>
            <Divider />
            <label className={seg}>
              <CalendarDays size={18} className="text-ink-mute shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={lab}>Check out</span>
                <input
                  type="date"
                  min={date || today}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={cn("bare-input", !end && "text-ink-mute")}
                />
              </span>
            </label>
          </>
        )}
        <Divider />
        <label className={cn(seg, "lg:max-w-[190px]")}>
          <Users size={18} className="text-ink-mute shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={lab}>Travellers</span>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="bare-input tabular"
            >
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "traveller" : "travellers"}
                </option>
              ))}
            </select>
          </span>
        </label>
        <button
          type="submit"
          className={cn(
            "btn btn-primary mt-1 h-14 shrink-0 text-base lg:mt-0 lg:ml-2",
            hero ? "lg:h-[60px] lg:px-8" : "lg:h-[52px] lg:w-[52px] lg:px-0",
          )}
          aria-label="Search"
        >
          <Search size={20} aria-hidden />
          <span className={hero ? "" : "lg:sr-only"}>Search</span>
        </button>
      </div>
    </form>
  );
}

function Divider() {
  return <span aria-hidden className="bg-line mx-4 h-px lg:mx-0 lg:h-8 lg:w-px" />;
}
