import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { enquiries, products } from "@/db/schema";
import { sendEnquiryReceived } from "@/lib/email";
import { enquirySchema, firstError } from "@/lib/validation";

export const runtime = "nodejs";

/** Quote requests: concierge, events, custom packages, questions about a trip */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true });

  let productTitle: string | undefined;
  if (input.productId) {
    const [p] = await db.select({ title: products.title }).from(products).where(eq(products.id, input.productId));
    productTitle = p?.title;
  }

  const [enquiry] = await db
    .insert(enquiries)
    .values({
      topic: input.topic,
      productId: productTitle ? input.productId : null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      travelDate: input.travelDate || null,
      guests: input.guests ?? null,
      budget: input.budget,
      message: input.message,
    })
    .returning();

  await sendEnquiryReceived(enquiry, productTitle);
  return NextResponse.json({ ok: true });
}
