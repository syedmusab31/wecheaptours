/** Distinct values in first-seen order, e.g. the countries of a destination list */
export function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Groups items by key, keeping the order in which keys first appear */
export function groupBy<T, K>(items: T[], key: (item: T) => K): [K, T[]][] {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return [...map.entries()];
}
