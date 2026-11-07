"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="display-md text-3xl">{t("serverTitle")}</h1>
      <p className="text-ink-soft mt-3">{t("serverText")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn btn-primary">
          {t("tryAgain")}
        </button>
        <Link href="/enquire" className="btn btn-ghost">
          {t("contactUs")}
        </Link>
      </div>
      {error.digest && (
        <p className="text-ink-mute mt-6 text-xs">{t("reference", { digest: error.digest })}</p>
      )}
    </main>
  );
}
