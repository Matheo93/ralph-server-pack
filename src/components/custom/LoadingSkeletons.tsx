"use client"

import { cn } from "@/lib/utils"

// =============================================================================
// BASE SKELETON
// =============================================================================

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  )
}

// =============================================================================
// TASK CARD SKELETON
// =============================================================================

export function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  )
}

export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// CHILD CARD SKELETON
// =============================================================================

export function ChildCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function ChildrenGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ChildCardSkeleton key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// DASHBOARD SKELETON
// =============================================================================

export function DashboardStatSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardStatSkeleton key={i} />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <DashboardStatsSkeleton />

      {/* Charts area */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>

      {/* Task list */}
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-5 w-48 mb-4" />
        <TaskListSkeleton count={3} />
      </div>
    </div>
  )
}

// =============================================================================
// CHARGE BALANCE SKELETON
// =============================================================================

export function ChargeMemberSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full max-w-xs" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function ChargeBalanceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <ChargeMemberSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// SETTINGS SKELETON
// =============================================================================

export function SettingsRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  )
}

export function SettingsCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <SettingsRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// NOTIFICATION SKELETON
// =============================================================================

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg border">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// FULL PAGE LOADING
// =============================================================================

export function PageLoadingSkeleton({
  title,
  subtitle,
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        {title ? (
          <h1 className="text-2xl font-bold">{title}</h1>
        ) : (
          <Skeleton className="h-8 w-48" />
        )}
        {subtitle ? (
          <p className="text-muted-foreground">{subtitle}</p>
        ) : (
          <Skeleton className="h-4 w-64" />
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[150px] w-full rounded-lg" />
          <Skeleton className="h-[150px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// INLINE LOADING SPINNER
// =============================================================================

export function LoadingSpinner({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Chargement..."
    >
      <span className="sr-only">Chargement...</span>
    </div>
  )
}

// =============================================================================
// BUTTON LOADING STATE
// =============================================================================

export function ButtonLoading({
  children,
  isLoading,
  loadingText = "Chargement...",
  className,
}: {
  children: React.ReactNode
  isLoading: boolean
  loadingText?: string
  className?: string
}) {
  if (isLoading) {
    return (
      <span className={cn("flex items-center gap-2", className)}>
        <LoadingSpinner size="sm" />
        <span>{loadingText}</span>
      </span>
    )
  }

  return <>{children}</>
}
