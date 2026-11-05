import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-6xl space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-12" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}
