import { cn } from "@/lib/utils";

/** Ticket-stub mark + wordmark */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true">
        <path
          d="M3 1h24a2 2 0 0 1 2 2v4.2a3.8 3.8 0 0 0 0 7.6V19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4.2a3.8 3.8 0 0 0 0-7.6V3a2 2 0 0 1 2-2Z"
          fill={light ? "#fff" : "#2340b0"}
        />
        <path d="M20 4v14" stroke={light ? "#2340b0" : "#fff"} strokeWidth="1.6" strokeDasharray="2 2.2" />
        <path d="M7.5 15 12 7l4.5 8" fill="none" stroke="#ffb627" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span
        className={cn("text-[1.3rem] leading-none", light ? "text-white" : "text-ink")}
        style={{ fontVariationSettings: '"wdth" 125', fontWeight: 800, letterSpacing: "-0.02em" }}
      >
        wecheaptours
      </span>
    </span>
  );
}
