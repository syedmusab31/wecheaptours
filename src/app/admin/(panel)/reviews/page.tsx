import { requirePermission } from "@/features/identity/server/auth";
import { ReviewActions, ReviewForm } from "@/features/review/components/admin/ReviewControls";
import { listProductTitles } from "@/features/catalog/server/catalog.service";
import { listReviewsForAdmin } from "@/features/review/server/review.service";
import { formatDate } from "@/lib/utils";

export default async function ReviewsAdmin() {
  await requirePermission("review:edit");
  const [rows, productList] = await Promise.all([listReviewsForAdmin(), listProductTitles()]);
  const demo = rows.filter(({ review: r }) => r.authorName.startsWith("Sample guest")).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="text-ink-soft mt-1">Ratings on the site are the average of published reviews.</p>
      {demo > 0 && (
        <p className="bg-sun-tint mt-4 rounded-lg px-4 py-3 text-sm">
          <b>{demo} demo reviews</b> are installed so the design can be judged. Delete them and add reviews
          from real guests before launch.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {rows.map(({ review: r, productTitle }) => (
            <li key={r.id} className={`rounded-xl bg-white p-5 ${r.isPublished ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sun">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  <p className="font-semibold">{r.title || "(no title)"}</p>
                </div>
                <ReviewActions id={r.id} published={r.isPublished} />
              </div>
              <p className="text-ink-soft mt-1">{r.body}</p>
              <p className="text-ink-mute mt-2 text-sm">
                {r.authorName}
                {r.authorCountry && `, ${r.authorCountry}`} · {productTitle ?? "—"} · added{" "}
                {formatDate(r.createdAt)}
              </p>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-ink-soft rounded-xl bg-white p-8 text-center">No reviews yet.</li>
          )}
        </ul>
        <aside>
          <ReviewForm products={productList} />
        </aside>
      </div>
    </div>
  );
}
