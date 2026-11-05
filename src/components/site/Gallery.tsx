"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, images.length]);

  if (!images.length) return null;
  const [first, ...rest] = images;
  return (
    <>
      <div className="relative grid h-[300px] gap-2 overflow-hidden rounded-[var(--radius-panel)] sm:h-[460px] sm:grid-cols-4 sm:grid-rows-2">
        <button type="button" onClick={() => setOpen(0)} className="relative sm:col-span-2 sm:row-span-2" aria-label="Open photo 1">
          <Image src={first} alt={title} fill priority sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
        </button>
        {rest.slice(0, 4).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i + 1)}
            className={`relative hidden sm:block ${rest.length < 3 || (rest.length === 3 && i === 2) ? "sm:col-span-2" : ""} ${rest.length === 1 ? "sm:row-span-2" : ""}`}
            aria-label={`Open photo ${i + 2}`}
          >
            <Image src={src} alt="" fill sizes="25vw" className="object-cover" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold shadow-[var(--shadow-lift)]"
        >
          <Images size={16} aria-hidden /> {images.length} photos
        </button>
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4">
          <button type="button" onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X />
          </button>
          <button type="button" onClick={() => setOpen((open - 1 + images.length) % images.length)} className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Previous photo">
            <ChevronLeft />
          </button>
          <div className="relative h-[75vh] w-full max-w-5xl">
            <Image src={images[open]} alt="" fill sizes="100vw" className="object-contain" />
          </div>
          <button type="button" onClick={() => setOpen((open + 1) % images.length)} className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Next photo">
            <ChevronRight />
          </button>
          <p className="absolute bottom-4 text-sm text-white/70 tabular">
            {open + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
