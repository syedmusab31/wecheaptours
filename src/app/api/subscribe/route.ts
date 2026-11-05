import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { firstError, subscribeSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = subscribeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
  await db.insert(subscribers).values({ email: parsed.data.email }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
