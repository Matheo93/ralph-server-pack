import Link from "next/link"
import { getHouseholdBalance, getWeeklyChartData, getChargeHistory } from "@/lib/services/charge"
import { LazyChargeWeekChart } from "@/components/custom/LazyChargeWeekChart"
import { LazyChargeHistoryCard, LazyChargeBalance } from "@/components/custom/LazyChargeComponents"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays charge/mental load section.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function DashboardChargeStream() {
  const [balance, weekChartData, chargeHistory] = await Promise.all([
    getHouseholdBalance(),
    getWeeklyChartData(),
    getChargeHistory(),
  ])

  // Don't render if less than 2 members
  if (!balance || balance.members.length < 2) {
    // For single parent households, show balance in sidebar
    if (balance) {
      return (
        <div className="space-y-6">
          <LazyChargeBalance balance={balance} />
        </div>
      )
    }
    return null
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Charge mentale</h2>
        <Link href="/charge">
          <Button variant="ghost" size="sm">
            Voir les détails
          </Button>
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <LazyChargeBalance balance={balance} />
        {weekChartData.length > 0 && (
          <LazyChargeWeekChart data={weekChartData} className="lg:col-span-2" />
        )}
      </div>
      {chargeHistory.length >= 2 && (
        <div className="mt-6">
          <LazyChargeHistoryCard history={chargeHistory} />
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton fallback for DashboardChargeStream
 */
export function DashboardChargeSkeleton() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-36" shimmer />
        <Skeleton className="h-9 w-28" shimmer />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Balance card skeleton */}
        <div className="rounded-lg border p-6 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" shimmer />
            <Skeleton className="h-5 w-20 rounded-full" shimmer />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" shimmer />
                  <Skeleton className="h-4 w-10" shimmer />
                </div>
                <Skeleton className="h-3 w-full rounded-full" shimmer />
              </div>
            ))}
          </div>
        </div>
        {/* Chart skeleton */}
        <div className="lg:col-span-2 rounded-lg border p-6 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" shimmer />
          </div>
          <div className="h-48 flex items-end gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2">
                <Skeleton
                  className="w-full rounded-t"
                  shimmer
                  style={{ height: `${30 + Math.random() * 70}%` }}
                />
                <Skeleton className="h-3 w-6" shimmer />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
