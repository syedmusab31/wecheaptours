"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [eventId, setEventId] = useState<string>();
  useEffect(() => {
    setEventId(Sentry.captureException(error));
  }, [error]);
  return (
    <div className="mx-auto max-w-xl rounded-xl bg-white p-8">
      <h1 className="text-xl font-bold">This page failed to load</h1>
      <p className="text-ink-soft mt-2">
        Try again. If it keeps failing, send these references to whoever runs the site.
      </p>
      <dl className="mt-4 space-y-1 text-sm">
        {error.digest && (
          <div>
            <dt className="text-ink-mute inline">Server reference: </dt>
            <dd className="inline font-mono">{error.digest}</dd>
          </div>
        )}
        {eventId && (
          <div>
            <dt className="text-ink-mute inline">Sentry event: </dt>
            <dd className="inline font-mono">{eventId}</dd>
          </div>
        )}
      </dl>
      <button onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
