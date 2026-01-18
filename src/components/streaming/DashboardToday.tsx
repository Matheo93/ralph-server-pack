import { getTodayTasks, getAllPendingTasksCount } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import { DashboardToday } from "@/components/custom/DashboardToday"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays today's tasks.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function DashboardTodayStream() {
  const [todayTasks, taskCounts, children] = await Promise.all([
    getTodayTasks(),
    getAllPendingTasksCount(),
    getChildren(),
  ])

  const hasAnyPendingTasks = taskCounts.total > 0

  return (
    <DashboardToday
      tasks={todayTasks}
      hasAnyPendingTasks={hasAnyPendingTasks}
      hasChildren={children.length > 0}
    />
  )
}

/**
 * Skeleton fallback for DashboardTodayStream
 */
export function DashboardTodaySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" shimmer />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" shimmer />
          <Skeleton className="h-6 w-24 rounded-full" shimmer />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-3/4" shimmer />
              <Skeleton className="h-5 w-16 rounded-full" shimmer />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" shimmer />
              <Skeleton className="h-4 w-24" shimmer />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-6 w-6 rounded-full" shimmer />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded" shimmer />
                <Skeleton className="h-8 w-8 rounded" shimmer />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
