import { Skeleton } from "@/components/ui/skeleton"

function CalendarPageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-4rem)]">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" shimmer />
        <Skeleton className="h-4 w-72" shimmer />
      </div>

      {/* Calendar view skeleton */}
      <div className="space-y-4">
        {/* Month/year header + navigation */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" shimmer />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded" shimmer />
            <Skeleton className="h-10 w-10 rounded" shimmer />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" shimmer />
          <Skeleton className="h-9 w-20 rounded-md" shimmer />
        </div>

        {/* Days header skeleton */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" shimmer />
          ))}
        </div>

        {/* Calendar grid skeleton */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" shimmer />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CalendarLoading() {
  return <CalendarPageSkeleton />
}
