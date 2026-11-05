import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdmin } from "@/features/identity/server/auth";
import { can } from "@/features/identity/server/permissions";
import { env } from "@/config/env";

export const runtime = "nodejs";

/**
 * Signs a direct browser → Cloudinary upload, so the API secret never leaves the server.
 * https://cloudinary.com/documentation/authentication_signatures
 */
export async function POST() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(admin.role, "catalog:edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured. Add the CLOUDINARY_* environment variables, or paste image URLs instead.",
      },
      { status: 503 },
    );
  }
  const folder = env.CLOUDINARY_FOLDER;
  const timestamp = Math.floor(Date.now() / 1000);
  // Signed upload parameters, in alphabetical order. Cloudinary rejects files outside these formats;
  // the upload preset (set up in Cloudinary) adds the 10 MB limit and resizing, and the browser can't drop it.
  const allowedFormats = "avif,jpg,jpeg,png,webp";
  const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;
  const params: Record<string, string> = {
    allowed_formats: allowedFormats,
    folder,
    timestamp: String(timestamp),
  };
  if (uploadPreset) params.upload_preset = uploadPreset;
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    allowedFormats,
    uploadPreset: uploadPreset ?? null,
    signature,
  });
}
