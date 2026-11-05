import Link from "next/link";

/** "Newest" / "Next page" links under an admin list (keyset pagination: no page numbers) */
export function Pager({
  basePath,
  params,
  nextCursor,
  isFirstPage,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  nextCursor: string | null;
  isFirstPage: boolean;
}) {
  if (!nextCursor && isFirstPage) return null;
  const href = (after?: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (after) q.set("after", after);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label="Pages" className="mt-5 flex justify-between text-sm font-semibold">
      {isFirstPage ? (
        <span />
      ) : (
        <Link href={href()} className="text-lapis hover:underline">
          ← Newest
        </Link>
      )}
      {nextCursor && (
        <Link href={href(nextCursor)} className="text-lapis hover:underline">
          Next page →
        </Link>
      )}
    </nav>
  );
}
