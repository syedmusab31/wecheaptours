import "server-only";
import { bookingJobHandlers } from "@/features/booking/server/booking.jobs";
import { enquiryJobHandlers } from "@/features/enquiry/server/enquiry.service";
import type { JobHandlers } from "@/server/jobs/worker";

/** Every job type the worker knows. Each feature exports its own handlers. */
export const jobHandlers: JobHandlers = {
  ...bookingJobHandlers,
  ...enquiryJobHandlers,
};
