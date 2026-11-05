import "server-only";
import { count, desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { subscribers } from "@/server/db/schema";

export async function addSubscriber(email: string) {
  await db.insert(subscribers).values({ email }).onConflictDoNothing();
}

export async function listSubscribers() {
  return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
}

export async function countSubscribers() {
  const [row] = await db.select({ n: count() }).from(subscribers);
  return row?.n ?? 0;
}
