/**
 * Product analytics for the booking funnel (search → product → checkout → booked) and other key actions.
 *
 * Events go to PostHog's capture API (free plan: 1M events/month) when NEXT_PUBLIC_POSTHOG_KEY is set;
 * otherwise nothing is sent. No SDK and no cookies: an anonymous random id is kept in localStorage.
 * Events carry no personal data: ids, categories and flags only.
 * (Page views and Core Web Vitals come from Vercel Web Analytics / Speed Insights, free on Hobby.)
 */
export type AnalyticsEvent =
  | "search"
  | "product_view"
  | "checkout_started"
  | "booking_requested"
  | "enquiry_sent"
  | "newsletter_subscribed";

type Props = Record<string, string | number | boolean | null>;

const ID_KEY = "wct_anon_id";

function anonymousId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous"; // private mode or storage blocked
  }
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");
  const body = JSON.stringify({
    api_key: key,
    event,
    distinct_id: anonymousId(),
    properties: {
      ...props,
      $current_url: location.origin + location.pathname,
      $process_person_profile: false,
    },
    timestamp: new Date().toISOString(),
  });
  // sendBeacon survives a page change right after the event (e.g. redirect to the booking page)
  const url = `${host}/i/v0/e/`;
  if (!navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain" }))) {
    fetch(url, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(
      () => undefined,
    );
  }
}
