import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@wecheaptours.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

type Mail = { at: string; to: string[]; subject: string; body: string };

/** Emails caught by the dev mail sink (`npm run mail:dev`), newest first */
export function inbox(): Mail[] {
  try {
    return JSON.parse(readFileSync(".mail-sink/inbox.json", "utf8")) as Mail[];
  } catch {
    return [];
  }
}

/** Waits for an email to `to` sent after `since` whose subject matches */
export async function waitForEmail(to: string, subject: RegExp, since: Date): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      () => {
        found = inbox().find(
          (m) =>
            new Date(m.at) >= since &&
            m.to.some((t) => t.toLowerCase().includes(to.toLowerCase())) &&
            subject.test(m.subject),
        );
        return Boolean(found);
      },
      { message: `email to ${to} matching ${subject}`, timeout: 20_000 },
    )
    .toBe(true);
  return found!;
}

/** Signs in to the admin with the password and the one-time code from the mail sink */
export async function signInAsAdmin(page: Page) {
  const since = new Date(Date.now() - 1000);
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.locator("form button[type=submit], form button").first().click();
  // A trusted device skips the code step
  const codeField = page.locator('input[name="code"]');
  await Promise.race([codeField.waitFor(), page.waitForURL(/\/admin$/)]);
  if (await codeField.isVisible()) {
    const mail = await waitForEmail(ADMIN_EMAIL, /is your/, since);
    const code = /(\d{6})/.exec(mail.subject)?.[1];
    expect(code, "one-time code in the subject").toBeTruthy();
    await codeField.fill(code!);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await page.waitForURL(/\/admin$/);
}

/** A travel date `days` ahead (ISO), moved off Fridays, which the demo tours don't run on */
export function travelDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  if (d.getDay() === 5) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Demo photos come from Unsplash; block them so tests don't depend on the network */
export async function blockRemoteImages(page: Page) {
  await page.route(/images\.unsplash\.com|res\.cloudinary\.com/, (r) => r.abort());
}
