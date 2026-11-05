import { cn } from "@/lib/utils";

/** Grey placeholder block shown while a page loads */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-mist animate-pulse rounded-xl", className)} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
