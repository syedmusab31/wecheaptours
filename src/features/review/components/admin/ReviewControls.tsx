"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { deleteReview, saveReview, setReviewPublished } from "@/features/review/server/review.actions";
import { FormMessage, SubmitButton } from "@/components/admin/FormControls";

export function ReviewActions({ id, published }: { id: number; published: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-3 text-sm font-semibold">
      <button
        disabled={pending}
        onClick={() => start(() => setReviewPublished(id, !published))}
        className="text-lapis hover:underline disabled:opacity-50"
      >
        {published ? "Hide" : "Publish"}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this review?")) start(() => deleteReview(id));
        }}
        className="text-danger hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

export function ReviewForm({ products }: { products: { id: number; title: string }[] }) {
  const [state, action] = useActionState(saveReview, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-xl bg-white p-5">
      <h2 className="font-bold">Add a guest review</h2>
      <p className="text-ink-mute text-sm">
        Copy in reviews guests sent you by email, WhatsApp or other sites, with their permission.
      </p>
      <label className="block">
        <span className="label">Trip</span>
        <select name="productId" required className="field">
          <option value="">Choose…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Rating</span>
        <select name="rating" defaultValue="5" className="field">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Title</span>
        <input name="title" className="field" />
      </label>
      <label className="block">
        <span className="label">Review</span>
        <textarea name="body" rows={4} required className="field" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Guest name</span>
          <input name="authorName" placeholder="e.g. Sarah K." className="field" />
        </label>
        <label className="block">
          <span className="label">Country</span>
          <input name="authorCountry" className="field" />
        </label>
      </div>
      <label className="block">
        <span className="label">Travelled</span>
        <input name="travelMonth" placeholder="e.g. March 2026" className="field" />
      </label>
      <FormMessage state={state} />
      <SubmitButton>Add review</SubmitButton>
    </form>
  );
}
