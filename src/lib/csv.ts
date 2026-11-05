/** CSV export helpers */

/**
 * Cells starting with these characters are run as formulas by Excel, Sheets and Numbers
 * ("CSV injection"). Guests control names and notes, so such cells are prefixed with `'`.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const head = Object.keys(rows[0]);
  return [head.join(","), ...rows.map((r) => head.map((h) => csvCell(r[h])).join(","))].join("\r\n");
}
