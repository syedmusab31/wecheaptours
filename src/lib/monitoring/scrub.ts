/**
 * Removes guest personal data before an error report leaves the server or browser:
 * booking tokens in URLs, email addresses and phone numbers in messages and request data.
 */
import type { ErrorEvent } from "@sentry/nextjs";

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

export function scrubText(text: string): string {
  return text.replace(EMAIL, "[email]").replace(PHONE, "[phone]");
}

export function scrubUrl(url: string): string {
  return url.replace(/([?&](?:t|token)=)[^&#]+/gi, "$1[redacted]");
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.url) event.request.url = scrubUrl(event.request.url);
  if (event.request?.query_string && typeof event.request.query_string === "string") {
    event.request.query_string = scrubUrl(`?${event.request.query_string}`).slice(1);
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubText(ex.value);
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubText(crumb.message);
    if (typeof crumb.data?.url === "string") crumb.data.url = scrubUrl(crumb.data.url);
  }
  delete event.user;
  return event;
}
