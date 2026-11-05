import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <div role="status" aria-label="Loading trip" className="mx-auto max-w-[1260px] px-4 pt-6 pb-10 sm:px-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/9]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-[480px]" />
      </div>
    </div>
  );
}
