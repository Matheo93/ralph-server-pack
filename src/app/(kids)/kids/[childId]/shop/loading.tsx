import { Skeleton } from "@/components/ui/skeleton"

function KidsShopSkeleton() {
  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-green-50 via-emerald-50 to-teal-50">
      {/* Header skeleton - Shop style */}
      <header className="bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 rounded-3xl p-5 mb-6 shadow-xl border-2 border-green-200/50 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-8 w-8 rounded-full bg-green-200/50" />
              <Skeleton className="h-7 w-28 bg-green-200/50" />
            </div>
            <Skeleton className="h-4 w-52 bg-green-200/50" />
          </div>
          {/* XP counter */}
          <div className="bg-gradient-to-br from-amber-200 to-orange-200 rounded-2xl px-5 py-3">
            <Skeleton className="h-3 w-14 mb-1 bg-white/40" />
            <Skeleton className="h-8 w-12 bg-white/40" />
          </div>
        </div>
      </header>

      {/* Rewards grid skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-4 shadow-lg border-2 border-gray-100 relative overflow-hidden"
          >
            {/* Reward icon */}
            <div className="flex justify-center mb-3">
              <Skeleton className="h-16 w-16 rounded-2xl" shimmer />
            </div>

            {/* Reward name */}
            <Skeleton className="h-5 w-3/4 mx-auto mb-2" shimmer />

            {/* Reward description */}
            <Skeleton className="h-3 w-full mb-1" shimmer />
            <Skeleton className="h-3 w-2/3 mx-auto mb-3" shimmer />

            {/* Price tag */}
            <div className="flex justify-center">
              <Skeleton className="h-8 w-20 rounded-full" shimmer />
            </div>

            {/* Action button */}
            <Skeleton className="h-10 w-full mt-3 rounded-xl" shimmer />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KidsShopLoading() {
  return <KidsShopSkeleton />
}
