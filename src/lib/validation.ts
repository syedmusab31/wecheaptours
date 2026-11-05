import { z } from "zod";

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Please check the form";
}

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

// ── FormData helpers: form fields arrive as strings (or are missing) ─────

const asText = (v: unknown) => (v == null ? "" : String(v).trim());

/** Trimmed text; missing → "" */
export const formText = <S extends z.ZodTypeAny = z.ZodString>(schema?: S) =>
  z.preprocess(asText, (schema ?? z.string()) as S);

function toInt(fallback: number | null) {
  return (v: unknown) => {
    const t = asText(v);
    if (t === "") return fallback;
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) ? n : fallback;
  };
}

/** Integer; missing or blank → `fallback` */
export function formInt(fallback: number, schema?: z.ZodNumber): z.ZodEffects<z.ZodNumber, number, unknown>;
export function formInt(
  fallback: null,
  schema?: z.ZodNumber,
): z.ZodEffects<z.ZodNullable<z.ZodNumber>, number | null, unknown>;
export function formInt(fallback: number | null = 0, schema: z.ZodNumber = z.number().int()) {
  return fallback === null
    ? z.preprocess(toInt(null), schema.nullable())
    : z.preprocess(toInt(fallback), schema);
}

/** HTML checkbox: "on" or "true" → true; missing → false */
export const formCheckbox = () => z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Textarea with one item per line */
export const formLines = () =>
  z.preprocess(
    (v) =>
      asText(v)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    z.array(z.string()),
  );

/** Comma-separated list */
export const formList = () =>
  z.preprocess(
    (v) =>
      asText(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    z.array(z.string()),
  );

/** Converts FormData to a plain object for Zod. A key sent several times (checkbox groups) becomes a list. */
export function formToObject(formData: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

/** Checkbox group: all checked values as integers */
export const formIntList = () =>
  z.preprocess(
    (v) =>
      v == null
        ? []
        : (Array.isArray(v) ? v : [v]).map((x) => Number.parseInt(String(x), 10)).filter(Number.isFinite),
    z.array(z.number().int()),
  );
