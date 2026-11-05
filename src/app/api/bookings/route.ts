import { after, NextResponse } from "next/server";
import { jobHandlers } from "@/jobs/handlers";
import { runJobs } from "@/server/jobs/worker";
import { createBookingSchema } from "@/features/booking/booking.schema";
import { createBooking } from "@/features/booking/server/booking.service";
import { bookingPath } from "@/features/booking/server/booking-access";
import { firstError } from "@/lib/validation";
import { readJson, toErrorResponse } from "@/server/http";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";
import { verifyTurnstile } from "@/server/security/turnstile";

export const runtime = "nodejs";

/** Create a booking request. No payment is taken: status starts as "pending". */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req.headers);
    await enforceRateLimit("booking", ip);
    const parsed = createBookingSchema.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
    if (parsed.data.website) return NextResponse.json({ ok: true }); // honeypot: a bot filled the hidden field
    await verifyTurnstile(parsed.data.turnstileToken, ip);

    const booking = await createBooking(parsed.data);
    // Send the confirmation emails right after responding; the cron worker retries failures
    after(() => runJobs(jobHandlers, { limit: 5, budgetMs: 15_000 }));
    return NextResponse.json({ ok: true, reference: booking.reference, url: bookingPath(booking) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
