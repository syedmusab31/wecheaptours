import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/features/availability/server/availability.service";
import { addDays, toISODate } from "@/lib/dates";
import { isoDate } from "@/lib/validation";

export const runtime = "nodejs";

const query = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  seats: z.coerce.number().int().min(1).max(100).default(1),
});

/** Day-by-day availability for the booking calendar. `onRequest: true` = any date can be requested. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Use from/to as YYYY-MM-DD" }, { status: 422 });
  const from = parsed.data.from ?? toISODate(new Date());
  const to = parsed.data.to && parsed.data.to <= addDays(from, 400) ? parsed.data.to : addDays(from, 120);
  return NextResponse.json(await getAvailability(id, from, to, parsed.data.seats), {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
