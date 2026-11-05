"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({
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
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="display-md text-3xl">Something went wrong on our side</h1>
      <p className="text-ink-soft mt-3">
        Sorry about that. Try again, or tell us what you were looking for and we&apos;ll help by email or
        WhatsApp.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/enquire" className="btn btn-ghost">
          Contact us
        </Link>
      </div>
      {error.digest && <p className="text-ink-mute mt-6 text-xs">Error reference {error.digest}</p>}
    </main>
  );
}
