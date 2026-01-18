import Link from "next/link"
import { getChildren } from "@/lib/actions/children"
import { getTodayTasks, getOverdueTasks, getAllPendingTasksCount } from "@/lib/actions/tasks"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays dashboard stats cards.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function DashboardStatsStream() {
  const [children, todayTasks, overdueTasks, taskCounts] = await Promise.all([
    getChildren(),
    getTodayTasks(),
    getOverdueTasks(),
    getAllPendingTasksCount(),
  ])

  const criticalCount = todayTasks.filter((t) => t.is_critical).length

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* Total tasks */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <CardDescription className="text-foreground/70 font-medium">Total actif</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{taskCounts.total}</span>
            <span className="text-muted-foreground">tâche{taskCounts.total > 1 ? "s" : ""} en cours</span>
          </div>
          {taskCounts.unscheduled > 0 && (
            <Link href="/tasks?filter=unscheduled" className="text-xs text-orange-600 hover:text-orange-700 mt-1 inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {taskCounts.unscheduled === taskCounts.total
                ? `${taskCounts.unscheduled === 1 ? "À planifier" : "Toutes à planifier"}`
                : taskCounts.unscheduled === 1
                  ? "1 à planifier"
                  : `${taskCounts.unscheduled} à planifier`}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card className={`border-l-4 ${overdueTasks.length > 0 ? 'border-l-red-500 bg-gradient-to-br from-red-50 to-transparent' : 'border-l-green-500 bg-gradient-to-br from-green-50 to-transparent'} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${overdueTasks.length > 0 ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center`}>
              <svg className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardDescription className="text-foreground/70 font-medium">En retard</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {overdueTasks.length}
            </span>
            {overdueTasks.length > 0 ? (
              <Badge variant="destructive" className="animate-pulse">Urgent</Badge>
            ) : (
              <span className="text-green-600 text-sm font-medium">Parfait !</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Critical */}
      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-transparent hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardDescription className="text-foreground/70 font-medium">Critiques</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">
              {criticalCount}
            </span>
            <span className="text-muted-foreground text-sm">
              casse{criticalCount > 1 ? "nt" : ""} le streak
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Children */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-transparent hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <CardDescription className="text-foreground/70 font-medium">Enfants</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">{children.length}</span>
            {children.length === 0 && (
              <Link href="/children/new">
                <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  + Ajouter
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Skeleton fallback for DashboardStatsStream
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" shimmer />
              <Skeleton className="h-4 w-20" shimmer />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-9 w-12" shimmer />
              <Skeleton className="h-4 w-24" shimmer />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
