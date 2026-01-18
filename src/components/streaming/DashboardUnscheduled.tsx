import { getUnscheduledTasks } from "@/lib/actions/tasks"
import { DashboardUnscheduled } from "@/components/custom/DashboardUnscheduled"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays unscheduled tasks.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function DashboardUnscheduledStream() {
  const unscheduledTasks = await getUnscheduledTasks()

  if (unscheduledTasks.length === 0) {
    return null
  }

  return <DashboardUnscheduled tasks={unscheduledTasks} />
}

/**
 * Skeleton fallback for DashboardUnscheduledStream
 */
export function DashboardUnscheduledSkeleton() {
  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-36" shimmer />
            <Skeleton className="h-5 w-8 rounded-full" shimmer />
          </div>
          <Skeleton className="h-8 w-24" shimmer />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <Skeleton className="h-5 w-48" shimmer />
              <Skeleton className="h-8 w-20" shimmer />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
