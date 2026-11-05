import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { env } from "@/config/env";

/**
 * Weekly job: removes guests' personal data some years after their trip (default 3; set
 * RETENTION_YEARS). Bookings stay for accounting with the person's details blanked.
 * Confirm the period with a lawyer for EU guests.
 */
export async function applyRetentionPolicy(years = env.RETENTION_YEARS) {
  const cutoff = sql`current_date - make_interval(years => ${years})`;
  const bookings = await db.execute(sql`
    update bookings set customer_name = 'Removed', customer_email = 'removed+' || id || '@invalid',
      customer_phone = '', customer_country = '', pickup_location = '', notes = '', customer_id = null
    where travel_date < ${cutoff} and customer_email not like 'removed+%'`);
  const enquiries = await db.execute(sql`delete from enquiries where created_at < ${cutoff}`);
  const customers = await db.execute(sql`
    delete from customers c where c.created_at < ${cutoff}
      and not exists (select 1 from bookings b where b.customer_id = c.id)
      and not exists (select 1 from enquiries e where e.customer_id = c.id)`);
  const result = {
    bookings: bookings.rowCount ?? 0,
    enquiries: enquiries.rowCount ?? 0,
    customers: customers.rowCount ?? 0,
  };
  logger.info({ event: "retention.applied", years, ...result }, "retention policy applied");
  return result;
}
