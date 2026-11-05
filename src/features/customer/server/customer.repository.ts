import "server-only";
import { db, type Executor } from "@/server/db/client";
import { customers } from "@/server/db/schema";

/** Finds or creates the customer for this email and refreshes their details. Returns the id. */
export async function upsertCustomer(
  values: { email: string; name: string; phone?: string; country?: string },
  exec: Executor = db,
): Promise<number> {
  const set = {
    name: values.name,
    ...(values.phone ? { phone: values.phone } : {}),
    ...(values.country ? { country: values.country } : {}),
  };
  const [row] = await exec
    .insert(customers)
    .values({
      email: values.email.toLowerCase(),
      name: values.name,
      phone: values.phone ?? "",
      country: values.country ?? "",
    })
    .onConflictDoUpdate({ target: customers.email, set })
    .returning({ id: customers.id });
  return row.id;
}
