"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Records `event` once when this renders on the client, e.g. a product view */
export function TrackOnView({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: Record<string, string | number | boolean | null>;
}) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(event, JSON.parse(key));
  }, [event, key]);
  return null;
}
