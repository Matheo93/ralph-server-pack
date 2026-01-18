"use client"

import dynamic from "next/dynamic"
import { ChargeSkeleton, ChargeWeekChartSkeleton } from "@/components/ui/skeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton for ChargeCategoryBreakdown component
 */
function ChargeCategoryBreakdownSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" shimmer />
              <Skeleton className="h-5 w-24" shimmer />
            </div>
            <Skeleton className="h-4 w-10" shimmer />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-2 w-full rounded-full" shimmer />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" shimmer />
              <Skeleton className="h-3 w-12" shimmer />
            </div>
          </div>
          <div className="pt-2 border-t space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" shimmer />
                <Skeleton className="h-3 w-16" shimmer />
                <Skeleton className="h-3 w-8 ml-auto" shimmer />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for ChargeHistoryCard component
 */
function ChargeHistoryCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" shimmer />
        <Skeleton className="h-5 w-12 rounded-full" shimmer />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" shimmer />
              {i === 0 && <Skeleton className="h-5 w-16 rounded-full" shimmer />}
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-12" shimmer />
              <Skeleton className="h-4 w-16" shimmer />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" shimmer />
          <Skeleton className="h-4 w-16" shimmer />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" shimmer />
          <Skeleton className="h-4 w-8" shimmer />
        </div>
      </div>
    </div>
  )
}

/**
 * Lazy load ChargeCategoryBreakdown - used only on /charge page
 */
export const LazyChargeCategoryBreakdown = dynamic(
  () => import("./ChargeCategoryBreakdown").then((mod) => ({ default: mod.ChargeCategoryBreakdown })),
  {
    loading: () => <ChargeCategoryBreakdownSkeleton />,
    ssr: true,
  }
)

/**
 * Lazy load ChargeHistoryCard - used on /charge and /dashboard pages
 */
export const LazyChargeHistoryCard = dynamic(
  () => import("./ChargeHistoryCard").then((mod) => ({ default: mod.ChargeHistoryCard })),
  {
    loading: () => <ChargeHistoryCardSkeleton />,
    ssr: true,
  }
)

/**
 * Lazy load ChargeBalance - used on /charge and /dashboard pages
 */
export const LazyChargeBalance = dynamic(
  () => import("./ChargeBalance").then((mod) => ({ default: mod.ChargeBalance })),
  {
    loading: () => <ChargeSkeleton shimmer />,
    ssr: true,
  }
)

export { ChargeCategoryBreakdownSkeleton, ChargeHistoryCardSkeleton }
