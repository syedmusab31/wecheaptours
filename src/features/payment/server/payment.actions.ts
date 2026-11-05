"use server";

import { revalidatePath } from "next/cache";
import { manualPaymentSchema } from "@/features/booking/booking.schema";
import { adminFormAction } from "@/features/identity/server/admin-action";
import { formatCentsExact } from "@/lib/money";
import * as paymentService from "./payment.service";

export const recordManualPayment = adminFormAction(
  "booking:update",
  manualPaymentSchema,
  async (input, { admin }) => {
    const amountCents = Math.round(input.amount * 100);
    if (input.kind === "refund") {
      await paymentService.refund({
        bookingId: input.bookingId,
        amountCents,
        adminId: admin.id,
        note: input.note,
      });
    } else {
      await paymentService.recordManualPayment({ ...input, amountCents, adminId: admin.id });
    }
    revalidatePath(`/admin/bookings/${input.bookingId}`);
    return {
      ok: true,
      message: `${input.kind === "refund" ? "Refund" : "Payment"} of ${formatCentsExact(amountCents)} recorded.`,
    };
  },
);
