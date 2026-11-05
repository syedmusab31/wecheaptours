"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Last resort when the root layout itself fails: renders its own document, with no styles we depend on */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "4rem 1rem",
          textAlign: "center",
          color: "#13213c",
        }}
      >
        <h1 style={{ fontSize: "1.6rem" }}>Something went wrong on our side</h1>
        <p style={{ color: "#5b6884" }}>
          Please try again. If it keeps happening, email hello@wecheaptours.com.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.7rem 1.4rem",
            borderRadius: 8,
            border: 0,
            background: "#2340b0",
            color: "#fff",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ marginTop: "1rem", fontSize: 12, color: "#8a94a8" }}>Error reference {error.digest}</p>
        )}
      </body>
    </html>
  );
}
