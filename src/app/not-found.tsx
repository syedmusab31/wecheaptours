import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="display text-7xl text-lapis">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page isn't on the map</h1>
      <p className="mt-2 text-ink-soft">The link may be old, or the page has moved.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Go to the homepage
      </Link>
    </main>
  );
}
