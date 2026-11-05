import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="display text-lapis text-7xl">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page isn't on the map</h1>
      <p className="text-ink-soft mt-2">The link may be old, or the trip is no longer offered.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Go to the homepage
        </Link>
        <Link href="/search" className="btn btn-ghost">
          Browse all trips
        </Link>
      </div>
    </div>
  );
}
