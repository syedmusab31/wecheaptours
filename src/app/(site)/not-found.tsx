import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="display text-lapis text-7xl">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-ink-soft mt-2">{t("notFoundTripText")}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          {t("goHome")}
        </Link>
        <Link href="/search" className="btn btn-ghost">
          {t("browseTrips")}
        </Link>
      </div>
    </div>
  );
}
