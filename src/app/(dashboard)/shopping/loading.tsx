import { Skeleton } from "@/components/ui/skeleton"

function ShoppingPageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-44 mb-2" shimmer />
        <Skeleton className="h-4 w-56" shimmer />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-16" shimmer />
              <Skeleton className="h-4 w-4 rounded" shimmer />
            </div>
            <Skeleton className="h-8 w-12 mb-1" shimmer />
            <Skeleton className="h-3 w-14" shimmer />
          </div>
        ))}
      </div>

      {/* Shopping list card skeleton */}
      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-6">
          {/* Quick add skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" shimmer />
            <Skeleton className="h-10 w-10 rounded-md" shimmer />
          </div>

          {/* Progress skeleton */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" shimmer />
              <Skeleton className="h-4 w-16" shimmer />
            </div>
            <Skeleton className="h-2 w-full rounded-full" shimmer />
          </div>

          {/* Categories filter skeleton */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" shimmer />
            ))}
          </div>

          {/* Items skeleton */}
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-5 w-5 rounded" shimmer />
                <Skeleton className="h-5 flex-1" shimmer />
                <Skeleton className="h-5 w-16" shimmer />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShoppingLoading() {
  return <ShoppingPageSkeleton />
}
