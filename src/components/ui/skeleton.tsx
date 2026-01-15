import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
}

function Skeleton({
  className,
  shimmer = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer
          ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
          : "animate-pulse",
        className
      )}
      {...props}
    />
  )
}

/**
 * Skeleton for a single task card in TaskList
 */
function TaskCardSkeleton({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div className="rounded-lg border p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-3/4" shimmer={shimmer} />
        <Skeleton className="h-5 w-16 rounded-full" shimmer={shimmer} />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20" shimmer={shimmer} />
        <Skeleton className="h-4 w-24" shimmer={shimmer} />
        <Skeleton className="h-4 w-16" shimmer={shimmer} />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-6 rounded-full" shimmer={shimmer} />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded" shimmer={shimmer} />
          <Skeleton className="h-8 w-8 rounded" shimmer={shimmer} />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for the TaskList component - shows multiple task cards
 */
function TaskListSkeleton({ count = 3, shimmer = false }: { count?: number; shimmer?: boolean }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} shimmer={shimmer} />
      ))}
    </div>
  )
}

/**
 * Skeleton for dashboard summary cards
 */
function DashboardCardSkeleton({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <Skeleton className="h-4 w-24" shimmer={shimmer} />
      <Skeleton className="h-8 w-16" shimmer={shimmer} />
      <Skeleton className="h-3 w-32" shimmer={shimmer} />
    </div>
  )
}

/**
 * Skeleton for the dashboard grid
 */
function DashboardSkeleton({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" shimmer={shimmer} />
        <Skeleton className="h-4 w-64" shimmer={shimmer} />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCardSkeleton key={i} shimmer={shimmer} />
        ))}
      </div>

      {/* Task section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" shimmer={shimmer} />
        <TaskListSkeleton count={3} shimmer={shimmer} />
      </div>
    </div>
  )
}

/**
 * Skeleton for charge/balance chart
 */
function ChartSkeleton({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div className="rounded-lg border p-6 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" shimmer={shimmer} />
        <Skeleton className="h-4 w-20" shimmer={shimmer} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" shimmer={shimmer} />
            <Skeleton className="h-6 flex-1 rounded-full" shimmer={shimmer} />
            <Skeleton className="h-4 w-12" shimmer={shimmer} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for the ChargeBalance component - mental load distribution
 */
function ChargeSkeleton({ shimmer = false, membersCount = 2 }: { shimmer?: boolean; membersCount?: number }) {
  return (
    <div className="rounded-lg border p-6 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" shimmer={shimmer} />
        <Skeleton className="h-5 w-20 rounded-full" shimmer={shimmer} />
      </div>
      <div className="space-y-4">
        {Array.from({ length: membersCount }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" shimmer={shimmer} />
              <Skeleton className="h-4 w-10" shimmer={shimmer} />
            </div>
            <Skeleton className="h-3 w-full rounded-full" shimmer={shimmer} />
            <Skeleton className="h-3 w-32" shimmer={shimmer} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for the ChargeWeekChart component - weekly chart
 */
function ChargeWeekChartSkeleton({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div className="rounded-lg border p-6 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" shimmer={shimmer} />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" shimmer={shimmer} />
          <Skeleton className="h-8 w-8 rounded" shimmer={shimmer} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-end gap-2">
            <Skeleton
              className="w-full rounded-t"
              shimmer={shimmer}
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
            <Skeleton className="h-3 w-6" shimmer={shimmer} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for a full page while loading
 */
function PageSkeleton({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" shimmer={shimmer} />
        <Skeleton className="h-4 w-96" shimmer={shimmer} />
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton shimmer={shimmer} />
        <ChartSkeleton shimmer={shimmer} />
      </div>

      <TaskListSkeleton count={5} shimmer={shimmer} />
    </div>
  )
}

/**
 * Skeleton for the charge page
 */
function ChargePageSkeleton({ shimmer = true }: { shimmer?: boolean }) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" shimmer={shimmer} />
        <Skeleton className="h-4 w-72" shimmer={shimmer} />
      </div>

      {/* Charge balance and chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChargeSkeleton shimmer={shimmer} />
        <ChargeWeekChartSkeleton shimmer={shimmer} />
      </div>
    </div>
  )
}

/**
 * Skeleton for the children page
 */
function ChildrenPageSkeleton({ shimmer = true }: { shimmer?: boolean }) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-10 w-36" shimmer={shimmer} />
          <Skeleton className="h-4 w-64" shimmer={shimmer} />
        </div>
        <Skeleton className="h-10 w-32" shimmer={shimmer} />
      </div>

      {/* Children cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4 bg-card">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" shimmer={shimmer} />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-24" shimmer={shimmer} />
                <Skeleton className="h-4 w-16" shimmer={shimmer} />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" shimmer={shimmer} />
              <Skeleton className="h-4 w-3/4" shimmer={shimmer} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for the tasks page
 */
function TasksPageSkeleton({ shimmer = true }: { shimmer?: boolean }) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-10 w-32" shimmer={shimmer} />
          <Skeleton className="h-4 w-48" shimmer={shimmer} />
        </div>
        <Skeleton className="h-10 w-36" shimmer={shimmer} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-full" shimmer={shimmer} />
        ))}
      </div>

      {/* Task list */}
      <TaskListSkeleton count={5} shimmer={shimmer} />
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
  ChargeSkeleton,
  ChargeWeekChartSkeleton,
  ChargePageSkeleton,
  ChildrenPageSkeleton,
  TasksPageSkeleton,
  PageSkeleton,
}
