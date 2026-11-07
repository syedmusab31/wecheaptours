import { expect, test } from "@playwright/test";
import { blockRemoteImages, signInAsAdmin, travelDate, waitForEmail } from "./helpers";

/**
 * The main journey: a guest requests a tour, the team confirms it in the admin,
 * and the guest sees the confirmation on their booking page and by email.
 */
test("guest books a tour, admin confirms it, guest sees it confirmed", async ({ page, browser }) => {
  await blockRemoteImages(page);
  const guestEmail = `e2e-${Date.now()}@example.com`;
  const start = new Date(Date.now() - 1000);

  // 1. Guest picks a tour, option, date and extra
  await page.goto("/tours/giza-pyramids-sphinx-day-tour");
  await page.getByLabel(/Private car and guide/).check();
  await page.locator('input[type="date"]').first().fill(travelDate(10));
  await page.getByLabel("Lunch with a pyramid view").check();
  await page.getByRole("button", { name: "Request to book" }).click();
  await page.waitForURL(/\/book\//);

  // 2. Checkout with a promo code
  await page.locator('input[name="name"]').fill("E2E Guest");
  await page.locator('input[name="email"]').fill(guestEmail);
  await page.locator('input[name="phone"]').fill("+201000000002");
  await page.getByLabel("Promo code").fill("WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("status").filter({ hasText: "WELCOME10 applied" })).toBeVisible();
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Send booking request" }).click();

  // 3. The guest's booking page
  await page.waitForURL(/\/booking\/WCT-/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Request received");
  const bookingUrl = page.url();
  const reference = /\/booking\/(WCT-[A-Z0-9-]+)/.exec(bookingUrl)?.[1];
  expect(reference).toBeTruthy();
  await waitForEmail(guestEmail, /Booking request received/, start);

  // 4. The team confirms it in the admin (a separate browser session)
  const admin = await browser.newContext();
  const adminPage = await admin.newPage();
  await blockRemoteImages(adminPage);
  await signInAsAdmin(adminPage);
  await adminPage.goto(`/admin/bookings?q=${reference}`);
  await adminPage.locator(`a[href^="/admin/bookings/"]`, { hasText: reference! }).first().click();
  // Server-action forms work before hydration too, but then the "Saved" message isn't shown
  await adminPage.waitForLoadState("networkidle");
  const statusForm = adminPage.locator('form:has(select[name="status"])');
  await statusForm.locator('select[name="status"]').selectOption("confirmed");
  await statusForm.getByRole("button", { name: "Save", exact: true }).click();
  await expect(statusForm.getByRole("status")).toContainText("Saved");
  await admin.close();

  // 5. The guest sees it confirmed, and got the email
  await page.goto(bookingUrl);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirmed");
  await waitForEmail(guestEmail, /Your booking is confirmed/, start);
});

test("guest can withdraw a pending request", async ({ page }) => {
  await blockRemoteImages(page);
  await page.goto("/tours/giza-pyramids-sphinx-day-tour");
  await page.locator('input[type="date"]').first().fill(travelDate(12));
  await page.getByRole("button", { name: "Request to book" }).click();
  await page.waitForURL(/\/book\//);
  await page.locator('input[name="name"]').fill("E2E Withdraw");
  await page.locator('input[name="email"]').fill(`e2e-w-${Date.now()}@example.com`);
  await page.locator('input[name="phone"]').fill("+201000000003");
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await page.waitForURL(/\/booking\/WCT-/);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Withdraw request" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cancelled");
});
