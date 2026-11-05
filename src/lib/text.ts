/** Joins words as people write them: "Egypt", "Egypt and Jordan", "Egypt, Jordan and Morocco" */
export function joinList(items: string[], conjunction: "and" | "or" | "&" = "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items.at(-1)}`;
}
