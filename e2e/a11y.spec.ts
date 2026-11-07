import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { blockRemoteImages, travelDate } from "./helpers";

/** WCAG 2.1 A/AA checks with axe. Serious and critical problems fail the build. */
const PAGES = [
  "/",
  "/tours",
  "/tours/giza-pyramids-sphinx-day-tour",
  `/book/giza-pyramids-sphinx-day-tour?date=${travelDate(14)}&a=2`,
  "/my-booking",
  "/enquire",
  "/admin/login",
];

for (const path of PAGES) {
  test(`accessibility: ${path.split("?")[0]}`, async ({ page }) => {
    await blockRemoteImages(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    // Let entrance animations and client-side hydration settle before measuring contrast
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const report = blocking.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 5)
          .join("\n  ")}`,
    );
    expect(report, report.join("\n")).toEqual([]);
  });
}
