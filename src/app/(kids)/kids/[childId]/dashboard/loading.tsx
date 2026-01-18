import { Skeleton } from "@/components/ui/skeleton"

function KidsDashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      {/* Header skeleton - XP bar style */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Skeleton className="h-14 w-14 rounded-full bg-white/30" />
          <div className="flex-1">
            {/* Name */}
            <Skeleton className="h-5 w-24 mb-2 bg-white/30" />
            {/* XP bar */}
            <Skeleton className="h-3 w-full rounded-full bg-white/30" />
          </div>
          {/* Level badge */}
          <Skeleton className="h-12 w-12 rounded-xl bg-white/30" />
        </div>
        {/* Streak */}
        <div className="flex justify-center mt-3">
          <Skeleton className="h-6 w-32 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Stats cards skeleton - Gaming style */}
      <div className="px-4 py-3">
        <div className="flex gap-3">
          {/* Victories */}
          <div className="flex-1 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-2xl p-3 border-2 border-white/30">
            <div className="text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-1 rounded-full bg-white/40" />
              <Skeleton className="h-8 w-10 mx-auto mb-1 bg-white/40" />
              <Skeleton className="h-3 w-16 mx-auto bg-white/40" />
            </div>
          </div>
          {/* In progress */}
          <div className="flex-1 bg-gradient-to-br from-amber-200 to-orange-200 rounded-2xl p-3 border-2 border-white/30">
            <div className="text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-1 rounded-full bg-white/40" />
              <Skeleton className="h-8 w-10 mx-auto mb-1 bg-white/40" />
              <Skeleton className="h-3 w-16 mx-auto bg-white/40" />
            </div>
          </div>
          {/* Streak */}
          <div className="flex-1 bg-gradient-to-br from-purple-200 to-pink-200 rounded-2xl p-3 border-2 border-white/30">
            <div className="text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-1 rounded-full bg-white/40" />
              <Skeleton className="h-8 w-10 mx-auto mb-1 bg-white/40" />
              <Skeleton className="h-3 w-16 mx-auto bg-white/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap skeleton */}
      <div className="flex-1 px-4 py-2 space-y-4">
        <Skeleton className="h-6 w-40 rounded-lg" shimmer />

        {/* Task cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" shimmer />
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" shimmer />
                <Skeleton className="h-4 w-20 rounded-full" shimmer />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" shimmer />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KidsDashboardLoading() {
  return <KidsDashboardSkeleton />
}
