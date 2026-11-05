import { describe, expect, it } from "vitest";
import { scrubEvent, scrubText, scrubUrl } from "./scrub";

describe("error report scrubbing", () => {
  it("hides booking tokens in URLs", () => {
    expect(scrubUrl("https://x.com/booking/WCT-ABC234?t=secret123&paid=1")).toBe(
      "https://x.com/booking/WCT-ABC234?t=[redacted]&paid=1",
    );
  });
  it("hides emails and phone numbers in text", () => {
    expect(scrubText("Failed for jane.doe+trip@mail.com, +20 100 123 4567")).toBe(
      "Failed for [email], [phone]",
    );
  });
  it("drops cookies, bodies and the user", () => {
    const e = scrubEvent({
      type: undefined,
      request: { url: "/booking/X?t=abc", cookies: { a: "b" }, data: "{}" },
      user: { email: "a@b.co" },
    });
    expect(e).toEqual({ type: undefined, request: { url: "/booking/X?t=[redacted]" } });
  });
});
