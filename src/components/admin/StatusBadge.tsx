import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  pending: "bg-sun-tint text-[#8a5a00]",
  new: "bg-sun-tint text-[#8a5a00]",
  confirmed: "bg-faience-tint text-faience",
  quoted: "bg-lapis-tint text-lapis",
  completed: "bg-mist text-ink-soft",
  closed: "bg-mist text-ink-soft",
  cancelled: "bg-danger-tint text-danger",
  active: "bg-faience-tint text-faience",
  hidden: "bg-mist text-ink-mute",
  declined: "bg-danger-tint text-danger",
  expired: "bg-mist text-ink-mute",
  no_show: "bg-mist text-ink-soft",
  unpaid: "bg-mist text-ink-mute",
  deposit_paid: "bg-lapis-tint text-lapis",
  paid: "bg-faience-tint text-faience",
  refunded: "bg-mist text-ink-soft",
  partially_refunded: "bg-mist text-ink-soft",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        TONES[status] ?? "bg-mist",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
