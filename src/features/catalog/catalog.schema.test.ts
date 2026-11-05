import { describe, expect, it } from "vitest";
import { isAllowedImageUrl } from "./catalog.schema";

describe("isAllowedImageUrl", () => {
  it("allows only our own Cloudinary account when it is configured", () => {
    expect(isAllowedImageUrl("https://res.cloudinary.com/wct/image/upload/v1/a.jpg", "wct")).toBe(true);
    expect(isAllowedImageUrl("https://res.cloudinary.com/someone-else/image/upload/a.jpg", "wct")).toBe(
      false,
    );
  });
  it("allows Unsplash demo photos and refuses other hosts and plain http", () => {
    expect(isAllowedImageUrl("https://images.unsplash.com/photo-1", "wct")).toBe(true);
    expect(isAllowedImageUrl("https://evil.example.com/a.jpg", "wct")).toBe(false);
    expect(isAllowedImageUrl("http://res.cloudinary.com/wct/a.jpg", "wct")).toBe(false);
  });
});
