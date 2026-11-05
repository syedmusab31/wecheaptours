import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/money";

export async function POST(req: Request) {
  const { currency } = (await req.json().catch(() => ({}))) as { currency?: string };
  if (!isCurrency(currency)) return NextResponse.json({ error: "Unknown currency" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("currency", currency, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
