import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div
      role="status"
      aria-label="Loading results"
      className="mx-auto max-w-[1260px] px-4 pt-8 pb-10 sm:px-8"
    >
      <Skeleton className="h-16" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <Skeleton className="hidden h-96 lg:block" />
        <CardGridSkeleton />
      </div>
    </div>
  );
}
