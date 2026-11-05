import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="display text-lapis text-7xl">403</p>
      <h1 className="mt-4 text-2xl font-bold">Your role can't open this page</h1>
      <p className="text-ink-soft mt-2">Ask the account owner if you need access.</p>
      <Link href="/admin" className="btn btn-primary mt-6">
        Back to the dashboard
      </Link>
    </main>
  );
}
