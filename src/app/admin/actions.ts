"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  adminUsers,
  bookings,
  categoryEnum,
  destinations,
  enquiries,
  enquiryStatusEnum,
  bookingStatusEnum,
  priceUnitEnum,
  products,
  reviews,
  settings,
  type ItineraryStep,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CURRENCIES } from "@/lib/currency";
import { sendBookingStatus } from "@/lib/email";
import { lines, slugify } from "@/lib/utils";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, d = 0) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

// ── Products ────────────────────────────────────────────────────────────

/** Itinerary textarea: one step per line → "09:00 | Title | Detail" or "Title | Detail" */
function parseItinerary(v: string): ItineraryStep[] {
  return lines(v).map((l) => {
    const parts = l.split("|").map((s) => s.trim());
    if (parts.length >= 3) return { time: parts[0] || undefined, title: parts[1], detail: parts.slice(2).join(" | ") || undefined };
    if (parts.length === 2) {
      return /^\d{1,2}:\d{2}$/.test(parts[0]) ? { time: parts[0], title: parts[1] } : { title: parts[0], detail: parts[1] };
    }
    return { title: parts[0] };
  });
}

const productSchema = z.object({
  title: z.string().min(3, "Title is too short").max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug can only have lowercase letters, numbers and dashes").max(140),
  category: z.enum(categoryEnum.enumValues),
  priceUnit: z.enum(priceUnitEnum.enumValues),
  price: z.number().positive("Price must be more than 0"),
  destinationId: z.number().int().positive().nullable(),
  minGuests: z.number().int().min(1),
  maxGuests: z.number().int().min(1),
});

export async function saveProduct(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(f, "id");
  const title = str(f, "title");
  const raw = {
    title,
    slug: str(f, "slug") || slugify(title),
    category: str(f, "category"),
    priceUnit: str(f, "priceUnit"),
    price: Number(str(f, "price")),
    destinationId: int(f, "destinationId") || null,
    minGuests: int(f, "minGuests", 1),
    maxGuests: int(f, "maxGuests", 12),
  };
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (raw.minGuests > raw.maxGuests) return { error: "Minimum guests can't be more than maximum guests." };

  let images: string[] = [];
  try {
    images = (JSON.parse(str(f, "images") || "[]") as string[]).filter((u) => /^https:\/\//.test(u));
  } catch {
    return { error: "Images could not be read. Remove and add them again." };
  }

  const values = {
    ...parsed.data,
    price: parsed.data.price.toFixed(2),
    summary: str(f, "summary"),
    description: str(f, "description"),
    images,
    durationLabel: str(f, "durationLabel"),
    durationHours: int(f, "durationHours", 8),
    highlights: lines(f.get("highlights")),
    included: lines(f.get("included")),
    excluded: lines(f.get("excluded")),
    itinerary: parseItinerary(str(f, "itinerary")),
    tags: str(f, "tags").split(",").map((t) => slugify(t)).filter(Boolean),
    languages: str(f, "languages").split(",").map((t) => t.trim()).filter(Boolean),
    meetingPoint: str(f, "meetingPoint"),
    isPrivate: bool(f, "isPrivate"),
    pickupIncluded: bool(f, "pickupIncluded"),
    bedrooms: int(f, "bedrooms") || null,
    minNights: int(f, "minNights", 1) || 1,
    isFeatured: bool(f, "isFeatured"),
    isActive: bool(f, "isActive"),
    updatedAt: new Date(),
  };

  try {
    if (id) await db.update(products).set(values).where(eq(products.id, id));
    else await db.insert(products).values(values);
  } catch (err) {
    if (String(err).includes("products_slug_unique")) return { error: "Another product already uses this slug. Change it." };
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/admin/products?saved=1");
}

export async function toggleProduct(id: number, field: "isActive" | "isFeatured", value: boolean) {
  await requireAdmin();
  const patch = field === "isActive" ? { isActive: value } : { isFeatured: value };
  await db.update(products).set({ ...patch, updatedAt: new Date() }).where(eq(products.id, id));
  revalidatePath("/", "layout");
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.productId, id));
  if (n > 0) {
    // Keep booking history intact: hide instead of deleting
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  } else {
    await db.delete(products).where(eq(products.id, id));
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

// ── Bookings ────────────────────────────────────────────────────────────

export async function updateBooking(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(f, "id");
  const status = str(f, "status") as (typeof bookingStatusEnum.enumValues)[number];
  if (!bookingStatusEnum.enumValues.includes(status)) return { error: "Unknown status" };
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!before) return { error: "Booking not found" };
  const [after] = await db
    .update(bookings)
    .set({ status, adminNotes: str(f, "adminNotes"), updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();
  const notify = bool(f, "notify") && before.status !== status;
  if (notify) await sendBookingStatus(after);
  revalidatePath("/admin", "layout");
  return { ok: true, message: notify ? `Saved. ${after.customerName} has been emailed.` : "Saved." };
}

// ── Enquiries ───────────────────────────────────────────────────────────

export async function setEnquiryStatus(id: number, status: (typeof enquiryStatusEnum.enumValues)[number]) {
  await requireAdmin();
  await db.update(enquiries).set({ status }).where(eq(enquiries.id, id));
  revalidatePath("/admin", "layout");
}

// ── Destinations ────────────────────────────────────────────────────────

export async function saveDestination(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(f, "id");
  const name = str(f, "name");
  if (name.length < 2) return { error: "Enter a name" };
  const country = str(f, "country");
  if (country !== "Egypt" && country !== "Jordan") return { error: "Choose a country" };
  let image = "";
  try {
    image = (JSON.parse(str(f, "images") || "[]") as string[])[0] ?? "";
  } catch {}
  const values = {
    name,
    slug: str(f, "slug") || slugify(name),
    country: country as "Egypt" | "Jordan",
    tagline: str(f, "tagline"),
    description: str(f, "description"),
    image,
    sortOrder: int(f, "sortOrder"),
    isActive: bool(f, "isActive"),
  };
  try {
    if (id) await db.update(destinations).set(values).where(eq(destinations.id, id));
    else await db.insert(destinations).values(values);
  } catch (err) {
    if (String(err).includes("destinations_slug_unique")) return { error: "Another destination already uses this slug." };
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/admin/destinations");
}

// ── Reviews ─────────────────────────────────────────────────────────────

async function recomputeRating(productId: number | null) {
  if (!productId) return;
  await db.execute(sql`
    update products set
      rating = coalesce((select round(avg(rating)::numeric, 1) from reviews where product_id = ${productId} and is_published), 0),
      review_count = (select count(*) from reviews where product_id = ${productId} and is_published)
    where id = ${productId}`);
}

export async function saveReview(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const productId = int(f, "productId") || null;
  const rating = int(f, "rating", 5);
  const body = str(f, "body");
  if (!productId) return { error: "Choose the trip this review is for" };
  if (rating < 1 || rating > 5) return { error: "Rating must be 1 to 5" };
  if (body.length < 5) return { error: "Add the review text" };
  await db.insert(reviews).values({
    productId,
    rating,
    body,
    title: str(f, "title"),
    authorName: str(f, "authorName") || "Guest",
    authorCountry: str(f, "authorCountry"),
    travelMonth: str(f, "travelMonth"),
    isPublished: true,
  });
  await recomputeRating(productId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Review added." };
}

export async function setReviewPublished(id: number, published: boolean) {
  await requireAdmin();
  const [r] = await db.update(reviews).set({ isPublished: published }).where(eq(reviews.id, id)).returning();
  await recomputeRating(r?.productId ?? null);
  revalidatePath("/", "layout");
}

export async function deleteReview(id: number) {
  await requireAdmin();
  const [r] = await db.delete(reviews).where(eq(reviews.id, id)).returning();
  await recomputeRating(r?.productId ?? null);
  revalidatePath("/", "layout");
}

// ── Settings ────────────────────────────────────────────────────────────

export async function saveSettings(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const rates: Record<string, number> = {};
  for (const c of CURRENCIES) {
    const v = Number(str(f, `rate_${c}`));
    if (!(v > 0)) return { error: `Enter a rate above 0 for ${c}` };
    rates[c] = c === "USD" ? 1 : v;
  }
  const contact = {
    phone: str(f, "phone"),
    whatsapp: str(f, "whatsapp").replace(/\D/g, ""),
    email: str(f, "email"),
    address: str(f, "address"),
    licence: str(f, "licence"),
  };
  const entries: [string, unknown][] = [
    ["rates", rates],
    ["contact", contact],
    ["demoMode", bool(f, "demoMode")],
  ];
  for (const [key, value] of entries) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function changePassword(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const current = str(f, "current");
  const next = str(f, "next");
  if (next.length < 10) return { error: "New password needs at least 10 characters." };
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, Number(admin.sub)));
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is wrong." };
  await db.update(adminUsers).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(adminUsers.id, user.id));
  return { ok: true, message: "Password changed." };
}

export async function addAdmin(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };
  if (password.length < 10) return { error: "Password needs at least 10 characters." };
  await db
    .insert(adminUsers)
    .values({ email, name: str(f, "name") || "Staff", passwordHash: await bcrypt.hash(password, 10) })
    .onConflictDoNothing();
  revalidatePath("/admin/settings");
  return { ok: true, message: `${email} can now sign in.` };
}
