import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 422 });

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, parsed.data.email));
  const ok = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const token = await signSession({ sub: String(user.id), email: user.email, name: user.name });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
