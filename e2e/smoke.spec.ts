import { expect, test } from "@playwright/test";
import { blockRemoteImages } from "./helpers";

const PAGES = [
  "/",
  "/tours",
  "/cruises",
  "/transfers",
  "/destinations",
  "/search?q=giza",
  "/my-booking",
  "/enquire",
  "/booking-terms",
];

test.beforeEach(async ({ page }) => blockRemoteImages(page));

for (const path of PAGES) {
  test(`${path} renders without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("unknown pages return 404", async ({ page }) => {
  const res = await page.goto("/tours/no-such-trip");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page isn't on the map" })).toBeVisible();
});

test("security headers and a nonce-based CSP", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src[^;]*'nonce-/);
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
});

test("the page language comes from the locale", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("admin pages need a sign-in", async ({ page }) => {
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/login/);
});
