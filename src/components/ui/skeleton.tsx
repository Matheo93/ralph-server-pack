import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * Skeleton for a single task card in TaskList
 */
function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for the TaskList component - shows multiple task cards
 */
function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for dashboard summary cards
 */
function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

/**
 * Skeleton for the dashboard grid
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>

      {/* Task section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <TaskListSkeleton count={3} />
      </div>
    </div>
  )
}

/**
 * Skeleton for charge/balance chart
 */
function ChartSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 flex-1 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for a full page while loading
 */
function PageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <TaskListSkeleton count={5} />
    </div>
  )
}

export {
  Skeleton,
  TaskCardSkeleton,
  TaskListSkeleton,
  DashboardCardSkeleton,
  DashboardSkeleton,
  ChartSkeleton,
  PageSkeleton,
}
