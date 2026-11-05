"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal scroll-snap row with previous/next buttons; swipe on touch. */
export function Carousel({
  children,
  label,
  heading,
  className,
}: {
  children: React.ReactNode;
  label: string;
  heading?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const go = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className={className}>
      <div className="mb-7 flex items-end justify-between gap-6">
        <div className="min-w-0">{heading}</div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button
            type="button"
            className={btn}
            onClick={() => go(-1)}
            disabled={edge.start}
            aria-label={`Previous ${label}`}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => go(1)}
            disabled={edge.end}
            aria-label={`Next ${label}`}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        className={cn("scroll-row flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2")}
      >
        {children}
      </div>
    </div>
  );
}
