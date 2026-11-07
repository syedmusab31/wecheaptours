/** "2 adults, 1 Senior (65+), 1 child, 1 infant": the guest line used on pages and in emails */
export function describeGuests(g: {
  adults: number;
  children: number;
  infants: number;
  tierGuests?: { label: string; count: number }[];
}): string {
  const part = (n: number, one: string, many: string) => (n > 0 ? `${n} ${n === 1 ? one : many}` : "");
  return [
    part(g.adults, "adult", "adults"),
    ...(g.tierGuests ?? []).map((t) => (t.count > 0 ? `${t.count} ${t.label}` : "")),
    part(g.children, "child", "children"),
    part(g.infants, "infant", "infants"),
  ]
    .filter(Boolean)
    .join(", ");
}
