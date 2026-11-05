"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminCommand } from "@/features/identity/server/admin-action";
import { enquiryStatusEnum, type EnquiryStatus } from "@/server/db/schema";
import * as enquiryRepository from "./enquiry.repository";

const update = adminCommand(
  "enquiry:update",
  z.object({ id: z.number().int().positive(), status: z.enum(enquiryStatusEnum.enumValues) }),
  async ({ id, status }) => {
    await enquiryRepository.setStatus(id, status);
    revalidatePath("/admin", "layout");
  },
);

export async function setEnquiryStatus(id: number, status: EnquiryStatus) {
  await update({ id, status });
}
