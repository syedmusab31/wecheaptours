import "server-only";
import { getProductTitle } from "@/features/catalog/server/product.repository";
import type { CreateEnquiryInput } from "../enquiry.schema";
import { upsertCustomer } from "@/features/customer/server/customer.repository";
import { withTransaction } from "@/server/db/transaction";
import { enqueue } from "@/server/jobs/queue";
import type { JobHandlers } from "@/server/jobs/worker";
import { sendEnquiryReceived } from "./enquiry.emails";
import * as enquiryRepository from "./enquiry.repository";

/** Quote requests: concierge, events, custom packages, questions about a trip */
export async function createEnquiry(input: CreateEnquiryInput) {
  const product = input.productId ? await getProductTitle(input.productId) : null;
  return withTransaction(async (tx) => {
    const customerId = await upsertCustomer({ email: input.email, name: input.name, phone: input.phone }, tx);
    const enquiry = await enquiryRepository.insertEnquiry(
      {
        topic: input.topic,
        customerId,
        productId: product?.id ?? null,
        name: input.name,
        email: input.email,
        phone: input.phone,
        travelDate: input.travelDate || null,
        guests: input.guests ?? null,
        budget: input.budget,
        message: input.message,
      },
      tx,
    );
    await enqueue(tx, "enquiry.received", { enquiryId: enquiry.id });
    return enquiry;
  });
}

export const enquiryJobHandlers: JobHandlers = {
  "enquiry.received": async (p) => {
    const enquiry = await enquiryRepository.getEnquiryWithProduct(Number(p.enquiryId));
    if (!enquiry) throw new Error(`Enquiry ${String(p.enquiryId)} not found`);
    await sendEnquiryReceived(enquiry.enquiry, enquiry.productTitle ?? undefined);
  },
};

export { listForAdmin, setStatus, countNew, listLatest } from "./enquiry.repository";
