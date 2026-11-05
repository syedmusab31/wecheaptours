import "server-only";
import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

/** Share-image size every platform accepts (Facebook, WhatsApp, X, LinkedIn) */
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#13213c";
const LAPIS = "#2340b0";
const SUN = "#f5b82e";

/**
 * Fetches a photo for the background as a data URL. Only JPEG and PNG (what the renderer reads);
 * anything else, a slow host or a failure gives a plain background instead of a broken image.
 */
export async function photoDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 4_000_000) return null;
    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function shareCard(input: {
  eyebrow: string;
  title: string;
  footer: string;
  badge?: string;
  photo?: string | null;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: INK,
        color: "white",
      }}
    >
      {input.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page
        <img
          src={input.photo}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", inset: 0, objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(19,33,60,0.25) 0%, rgba(19,33,60,0.55) 45%, rgba(19,33,60,0.95) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 800 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: LAPIS, display: "flex" }} />
          {SITE.name.toLowerCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 30, color: SUN, fontWeight: 700 }}>{input.eyebrow}</div>
          <div
            style={{
              fontSize: input.title.length > 60 ? 56 : 68,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 1050,
            }}
          >
            {input.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 32 }}>
            {input.badge && (
              <div
                style={{
                  background: SUN,
                  color: INK,
                  borderRadius: 999,
                  padding: "8px 22px",
                  fontWeight: 800,
                }}
              >
                {input.badge}
              </div>
            )}
            <div style={{ color: "rgba(255,255,255,0.85)" }}>{input.footer}</div>
          </div>
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
