import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Signs a direct browser → Cloudinary upload, so the API secret never leaves the server.
 * https://cloudinary.com/documentation/authentication_signatures
 */
export async function POST() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Add the CLOUDINARY_* environment variables, or paste image URLs instead." },
      { status: 503 },
    );
  }
  const folder = process.env.CLOUDINARY_FOLDER || "wecheaptours";
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}
