import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

export type DashboardStats = {
  pending: number;
  upcoming: number;
  month_value_cents: string;
  month_count: number;
  new_enquiries: number;
  subscribers: number;
};

/** Headline numbers for the admin dashboard, in one round trip */
export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await db.execute<DashboardStats>(sql`
    select
      (select count(*)::int from bookings where status = 'pending') as pending,
      (select count(*)::int from bookings where status = 'confirmed' and travel_date between current_date and current_date + 7) as upcoming,
      (select coalesce(sum(total_cents), 0) from bookings where status in ('confirmed','completed') and date_trunc('month', created_at) = date_trunc('month', now())) as month_value_cents,
      (select count(*)::int from bookings where date_trunc('month', created_at) = date_trunc('month', now())) as month_count,
      (select count(*)::int from enquiries where status = 'new') as new_enquiries,
      (select count(*)::int from subscribers) as subscribers`);
  return result.rows[0];
}

/** Badge counts in the admin sidebar */
export async function getSidebarCounts() {
  const result = await db.execute<{ pending: number; fresh: number }>(sql`
    select (select count(*)::int from bookings where status = 'pending') as pending,
           (select count(*)::int from enquiries where status = 'new') as fresh`);
  return result.rows[0] ?? { pending: 0, fresh: 0 };
}
