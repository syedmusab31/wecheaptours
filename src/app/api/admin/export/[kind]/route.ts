import { NextResponse } from "next/server";
import { listForExport } from "@/features/booking/server/booking.service";
import { getAdmin } from "@/features/identity/server/auth";
import { can } from "@/features/identity/server/permissions";
import { listSubscribers } from "@/features/newsletter/server/newsletter.service";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(admin.role, "data:export")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { kind } = await params;
  let body: string;
  if (kind === "bookings") {
    const rows = await listForExport();
    body = toCsv(rows);
  } else if (kind === "subscribers") {
    body = toCsv(await listSubscribers());
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="wecheaptours-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
