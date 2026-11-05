import { after, NextResponse } from "next/server";
import { jobHandlers } from "@/jobs/handlers";
import { runJobs } from "@/server/jobs/worker";
import { createEnquirySchema } from "@/features/enquiry/enquiry.schema";
import { createEnquiry } from "@/features/enquiry/server/enquiry.service";
import { firstError } from "@/lib/validation";
import { readJson, toErrorResponse } from "@/server/http";
import { clientIp, enforceRateLimit } from "@/server/security/rate-limit";
import { verifyTurnstile } from "@/server/security/turnstile";

export const runtime = "nodejs";

/** Quote requests: concierge, events, custom packages, questions about a trip */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req.headers);
    await enforceRateLimit("enquiry", ip);
    const parsed = createEnquirySchema.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 422 });
    if (parsed.data.website) return NextResponse.json({ ok: true });
    await verifyTurnstile(parsed.data.turnstileToken, ip);

    await createEnquiry(parsed.data);
    // Send the confirmation emails right after responding; the cron worker retries failures
    after(() => runJobs(jobHandlers, { limit: 5, budgetMs: 15_000 }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
