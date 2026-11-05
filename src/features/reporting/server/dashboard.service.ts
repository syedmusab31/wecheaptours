import "server-only";
import { listRecent, listUpcomingConfirmed } from "@/features/booking/server/booking.repository";
import { listLatest } from "@/features/enquiry/server/enquiry.repository";
import { getDashboardStats } from "./dashboard.repository";

export async function getDashboard() {
  const [stats, recent, upcoming, latestEnquiries] = await Promise.all([
    getDashboardStats(),
    listRecent(8),
    listUpcomingConfirmed(6),
    listLatest(5),
  ]);
  return { stats, recent, upcoming, latestEnquiries };
}

export { getSidebarCounts } from "./dashboard.repository";
