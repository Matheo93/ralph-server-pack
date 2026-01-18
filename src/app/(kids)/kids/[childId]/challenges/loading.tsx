import { Skeleton } from "@/components/ui/skeleton"

function KidsChallengesSkeleton() {
  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-orange-50 via-pink-50 to-purple-50">
      {/* Header skeleton - Fun colorful style */}
      <header className="mb-6 bg-gradient-to-r from-orange-100 via-pink-100 to-purple-100 rounded-3xl p-4 shadow-lg border-2 border-orange-200/50">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full bg-orange-200/50" />
          <div>
            <Skeleton className="h-7 w-32 mb-1 bg-orange-200/50" />
            <Skeleton className="h-4 w-48 bg-orange-200/50" />
          </div>
        </div>
      </header>

      {/* Stats skeleton - Gaming style */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Active */}
        <div className="bg-gradient-to-br from-blue-200 via-cyan-100 to-teal-100 rounded-3xl p-4 text-center shadow-xl border-2 border-blue-300/50">
          <Skeleton className="h-8 w-8 mx-auto mb-1 rounded-full bg-white/40" />
          <Skeleton className="h-7 w-8 mx-auto mb-1 bg-white/40" />
          <Skeleton className="h-3 w-14 mx-auto bg-white/40" />
        </div>
        {/* Completed */}
        <div className="bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 rounded-3xl p-4 text-center shadow-xl border-2 border-green-300/50">
          <Skeleton className="h-8 w-8 mx-auto mb-1 rounded-full bg-white/40" />
          <Skeleton className="h-7 w-8 mx-auto mb-1 bg-white/40" />
          <Skeleton className="h-3 w-14 mx-auto bg-white/40" />
        </div>
        {/* XP earned */}
        <div className="bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 rounded-3xl p-4 text-center shadow-xl border-2 border-amber-300/50">
          <Skeleton className="h-8 w-8 mx-auto mb-1 rounded-full bg-white/40" />
          <Skeleton className="h-7 w-10 mx-auto mb-1 bg-white/40" />
          <Skeleton className="h-3 w-16 mx-auto bg-white/40" />
        </div>
      </div>

      {/* Section title */}
      <Skeleton className="h-6 w-36 mb-4 rounded-lg" shimmer />

      {/* Challenge cards skeleton */}
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-4 shadow-lg border-2 border-gray-100"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-14 w-14 rounded-2xl flex-shrink-0" shimmer />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-3/4 mb-2" shimmer />
                <Skeleton className="h-4 w-full mb-2" shimmer />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" shimmer />
                  <Skeleton className="h-6 w-20 rounded-full" shimmer />
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <Skeleton className="h-2 w-full rounded-full" shimmer />
            </div>
          </div>
        ))}
      </div>

      {/* Completed section */}
      <Skeleton className="h-6 w-32 mt-8 mb-4 rounded-lg" shimmer />

      <div className="grid gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-50 rounded-2xl p-3 border border-gray-200 opacity-70"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" shimmer />
              <div className="flex-1">
                <Skeleton className="h-4 w-2/3 mb-1" shimmer />
                <Skeleton className="h-3 w-20" shimmer />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" shimmer />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KidsChallengesLoading() {
  return <KidsChallengesSkeleton />
}
