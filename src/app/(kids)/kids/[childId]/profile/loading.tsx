import { Skeleton } from "@/components/ui/skeleton"

function KidsProfileSkeleton() {
  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-purple-50 via-violet-50 to-indigo-50">
      {/* Profile card skeleton */}
      <div className="bg-gradient-to-br from-purple-100 via-violet-100 to-indigo-100 rounded-3xl p-6 mb-6 shadow-xl border-2 border-purple-200/50 relative overflow-hidden">
        {/* Avatar and name */}
        <div className="flex flex-col items-center mb-4">
          <Skeleton className="h-24 w-24 rounded-full mb-3 bg-white/40" />
          <Skeleton className="h-7 w-32 mb-1 bg-white/40" />
          <Skeleton className="h-5 w-24 rounded-full bg-white/40" />
        </div>

        {/* Level and XP */}
        <div className="bg-white/50 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-20 bg-purple-200/50" />
            <Skeleton className="h-5 w-16 bg-purple-200/50" />
          </div>
          <Skeleton className="h-3 w-full rounded-full bg-purple-200/50" />
        </div>

        {/* Badges and rank */}
        <div className="flex gap-4">
          <div className="flex-1 bg-white/50 rounded-2xl p-3 text-center">
            <Skeleton className="h-6 w-6 mx-auto mb-1 rounded-full bg-purple-200/50" />
            <Skeleton className="h-6 w-8 mx-auto mb-1 bg-purple-200/50" />
            <Skeleton className="h-3 w-12 mx-auto bg-purple-200/50" />
          </div>
          <div className="flex-1 bg-white/50 rounded-2xl p-3 text-center">
            <Skeleton className="h-6 w-6 mx-auto mb-1 rounded-full bg-purple-200/50" />
            <Skeleton className="h-6 w-8 mx-auto mb-1 bg-purple-200/50" />
            <Skeleton className="h-3 w-12 mx-auto bg-purple-200/50" />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Missions completed */}
        <div className="bg-gradient-to-br from-blue-200 via-cyan-100 to-sky-100 rounded-3xl p-5 text-center shadow-xl border-2 border-blue-200/50">
          <Skeleton className="h-10 w-10 mx-auto mb-2 rounded-full bg-white/40" />
          <Skeleton className="h-8 w-12 mx-auto mb-1 bg-white/40" />
          <Skeleton className="h-4 w-24 mx-auto bg-white/40" />
        </div>
        {/* Best streak */}
        <div className="bg-gradient-to-br from-orange-200 via-red-100 to-pink-100 rounded-3xl p-5 text-center shadow-xl border-2 border-orange-200/50">
          <Skeleton className="h-10 w-10 mx-auto mb-2 rounded-full bg-white/40" />
          <Skeleton className="h-8 w-12 mx-auto mb-1 bg-white/40" />
          <Skeleton className="h-4 w-24 mx-auto bg-white/40" />
        </div>
      </div>

      {/* XP History section skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-6 rounded-full" shimmer />
          <Skeleton className="h-6 w-36" shimmer />
        </div>

        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" shimmer />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" shimmer />
                    <Skeleton className="h-3 w-20" shimmer />
                  </div>
                </div>
                <Skeleton className="h-6 w-14 rounded-full" shimmer />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings section skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-6 rounded-full" shimmer />
          <Skeleton className="h-6 w-28" shimmer />
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" shimmer />
              <Skeleton className="h-5 w-24" shimmer />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" shimmer />
          </div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-14 w-full rounded-3xl" shimmer />
        <Skeleton className="h-14 w-full rounded-3xl" shimmer />
      </div>
    </div>
  )
}

export default function KidsProfileLoading() {
  return <KidsProfileSkeleton />
}
