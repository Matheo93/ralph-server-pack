import Link from "next/link"
import { getOverdueTasks } from "@/lib/actions/tasks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays overdue tasks.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function DashboardOverdueStream() {
  const overdueTasks = await getOverdueTasks()

  if (overdueTasks.length === 0) {
    return null
  }

  return (
    <Card className="mb-8 border-red-300 bg-red-50/50 dark:bg-red-950/20">
      <CardHeader>
        <CardTitle className="text-red-600 flex items-center gap-2">
          <span>En retard</span>
          <Badge variant="destructive">{overdueTasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueTasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-white/50 rounded-lg"
            >
              <div>
                <p className="font-medium">{task.title}</p>
                {task.child_name && (
                  <p className="text-sm text-muted-foreground">
                    {task.child_name}
                  </p>
                )}
              </div>
              <Badge variant="destructive">
                {task.deadline
                  ? new Date(task.deadline).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })
                  : "Pas de date"}
              </Badge>
            </div>
          ))}
          {overdueTasks.length > 3 && (
            <Link href="/tasks?status=pending">
              <Button variant="ghost" className="w-full">
                Voir {overdueTasks.length - 3} autres...
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton fallback for DashboardOverdueStream
 */
export function DashboardOverdueSkeleton() {
  return (
    <Card className="mb-8 border-muted">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24" shimmer />
          <Skeleton className="h-5 w-8 rounded-full" shimmer />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <Skeleton className="h-5 w-40" shimmer />
                <Skeleton className="h-4 w-24" shimmer />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" shimmer />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
