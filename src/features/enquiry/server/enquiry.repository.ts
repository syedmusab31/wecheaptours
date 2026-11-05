import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { ADMIN_PAGE_SIZE, toPage, type Cursor } from "@/lib/pagination";
import { db, type Executor } from "@/server/db/client";
import { enquiries, products, type EnquiryStatus } from "@/server/db/schema";

export type NewEnquiry = typeof enquiries.$inferInsert;

export async function insertEnquiry(values: NewEnquiry, exec: Executor = db) {
  const [row] = await exec.insert(enquiries).values(values).returning();
  return row;
}

export async function getEnquiryWithProduct(id: number) {
  const [row] = await db
    .select({ enquiry: enquiries, productTitle: products.title })
    .from(enquiries)
    .leftJoin(products, eq(enquiries.productId, products.id))
    .where(eq(enquiries.id, id));
  return row ?? null;
}

/** Admin list, newest first, one page at a time (`after` = cursor from the previous page) */
export async function listForAdmin(
  filters: { status?: EnquiryStatus; after?: Cursor | null },
  limit = ADMIN_PAGE_SIZE,
) {
  const rows = await db
    .select({ enquiry: enquiries, productTitle: products.title })
    .from(enquiries)
    .leftJoin(products, eq(enquiries.productId, products.id))
    .where(
      and(
        filters.status ? eq(enquiries.status, filters.status) : undefined,
        filters.after
          ? sql`(${enquiries.createdAt}, ${enquiries.id}) < (${filters.after.createdAt.toISOString()}::timestamptz, ${filters.after.id})`
          : undefined,
      ),
    )
    .orderBy(desc(enquiries.createdAt), desc(enquiries.id))
    .limit(limit + 1);
  return toPage(rows, limit, (r) => r.enquiry);
}

export async function listLatest(limit = 5) {
  return db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(limit);
}

export async function setStatus(id: number, status: EnquiryStatus) {
  await db.update(enquiries).set({ status }).where(eq(enquiries.id, id));
}

export async function countNew() {
  const [row] = await db.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "new"));
  return row?.n ?? 0;
}
