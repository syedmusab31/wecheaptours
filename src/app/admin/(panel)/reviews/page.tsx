import { asc, desc, eq } from "drizzle-orm";
import { ReviewActions, ReviewForm } from "@/components/admin/ReviewControls";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export default async function ReviewsAdmin() {
  const [rows, productList] = await Promise.all([
    db
      .select({ r: reviews, productTitle: products.title })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt)),
    db.select({ id: products.id, title: products.title }).from(products).orderBy(asc(products.title)),
  ]);
  const demo = rows.filter(({ r }) => r.authorName.startsWith("Sample guest")).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="mt-1 text-ink-soft">Ratings on the site are the average of published reviews.</p>
      {demo > 0 && (
        <p className="mt-4 rounded-lg bg-sun-tint px-4 py-3 text-sm">
          <b>{demo} demo reviews</b> are installed so the design can be judged. Delete them and add reviews from real guests before launch.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {rows.map(({ r, productTitle }) => (
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
              <p className="mt-1 text-ink-soft">{r.body}</p>
              <p className="mt-2 text-sm text-ink-mute">
                {r.authorName}
                {r.authorCountry && `, ${r.authorCountry}`} · {productTitle ?? "—"} · added {formatDate(r.createdAt)}
              </p>
            </li>
          ))}
          {rows.length === 0 && <li className="rounded-xl bg-white p-8 text-center text-ink-soft">No reviews yet.</li>}
        </ul>
        <aside>
          <ReviewForm products={productList} />
        </aside>
      </div>
    </div>
  );
}
