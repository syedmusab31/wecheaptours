import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatDate(iso: string | Date | null | undefined, withWeekday = false): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso) : iso;
  return d.toLocaleDateString("en-GB", {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}

/** Splits a textarea value into trimmed non-empty lines */
export function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
