import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, subscribers } from "@/db/schema";
import { getAdmin } from "@/lib/auth";

export const runtime = "nodejs";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const head = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [head.join(","), ...rows.map((r) => head.map((h) => cell(r[h])).join(","))].join("\n");
}

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { kind } = await params;
  let body = "";
  if (kind === "bookings") {
    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    body = csv(rows.map(({ accessToken: _t, ...r }) => r));
  } else if (kind === "subscribers") {
    body = csv(await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)));
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
