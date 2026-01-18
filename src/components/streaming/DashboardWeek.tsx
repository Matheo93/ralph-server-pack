import { getWeekTasks } from "@/lib/actions/tasks"
import { DashboardWeek } from "@/components/custom/DashboardWeek"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays week tasks overview.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function DashboardWeekStream() {
  const weekTasks = await getWeekTasks()

  return <DashboardWeek tasks={weekTasks} />
}

/**
 * Skeleton fallback for DashboardWeekStream
 */
export function DashboardWeekSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" shimmer />
          <Skeleton className="h-5 w-20 rounded-full" shimmer />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-2 rounded-lg">
              <Skeleton className="h-3 w-6 mb-1" shimmer />
              <Skeleton className="h-6 w-6 rounded-full mb-1" shimmer />
              <Skeleton className="h-4 w-4" shimmer />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
