import "server-only";
import { count, desc, eq } from "drizzle-orm";
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

export async function listForAdmin(status?: EnquiryStatus, limit = 200) {
  return db
    .select({ enquiry: enquiries, productTitle: products.title })
    .from(enquiries)
    .leftJoin(products, eq(enquiries.productId, products.id))
    .where(status ? eq(enquiries.status, status) : undefined)
    .orderBy(desc(enquiries.createdAt))
    .limit(limit);
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
