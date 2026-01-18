import Link from "next/link"
import {
  getHouseholdBalance,
  getWeeklyChartData,
  getChargeHistory,
  getChargeByCategory,
} from "@/lib/services/charge"
import { canUseFeature } from "@/lib/services/subscription"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LazyChargeBalance,
  LazyChargeHistoryCard,
  LazyChargeCategoryBreakdown
} from "@/components/custom/LazyChargeComponents"
import { LazyChargeWeekChart } from "@/components/custom/LazyChargeWeekChart"
import { ExportButtons } from "@/components/custom/ExportButtons"
import { Scale, TrendingUp, Layers, ArrowRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ChargeDataStreamProps {
  householdId: string
  householdName: string
}

/**
 * Async component that fetches and displays full charge/mental load data.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function ChargeDataStream({ householdId, householdName }: ChargeDataStreamProps) {
  const [balance, weekChartData, chargeHistory, categoryData, isPremium] = await Promise.all([
    getHouseholdBalance(),
    getWeeklyChartData(),
    getChargeHistory(),
    getChargeByCategory(),
    canUseFeature(householdId, "pdf_export"),
  ])

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-medium text-foreground/70">
                Charge totale (7j)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{balance?.totalLoad ?? 0}</div>
            <p className="text-sm text-muted-foreground">points de charge</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${balance?.isBalanced ? 'border-l-green-500 bg-gradient-to-br from-green-50/50' : 'border-l-red-500 bg-gradient-to-br from-red-50/50'} to-transparent hover:shadow-md transition-shadow`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${balance?.isBalanced ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                <Scale className={`w-4 h-4 ${balance?.isBalanced ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <CardTitle className="text-sm font-medium text-foreground/70">
                Répartition
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {balance?.members.map((m, i) => (
                <span key={m.userId} className={`text-2xl font-bold ${balance?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(m.percentage)}%{i < balance.members.length - 1 ? " / " : ""}
                </span>
              ))}
            </div>
            {balance && (
              <Badge
                variant={balance.isBalanced ? "secondary" : "destructive"}
                className={balance.isBalanced ? "bg-green-100 text-green-700 border-green-300" : balance.alertLevel === "warning" ? "bg-orange-500" : ""}
              >
                {balance.isBalanced ? "Équilibré" : "Déséquilibré"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-medium text-foreground/70">
                Catégories actives
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{categoryData.categories.length}</div>
            <p className="text-sm text-muted-foreground">types de tâches</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {balance && <LazyChargeBalance balance={balance} />}
        {weekChartData.length > 0 && <LazyChargeWeekChart data={weekChartData} />}
      </div>

      {/* Category breakdown */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Répartition par catégorie</h2>
        <LazyChargeCategoryBreakdown
          categories={categoryData.categories}
          totalLoad={categoryData.totalLoad}
        />
      </div>

      {/* History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {chargeHistory.length >= 2 && <LazyChargeHistoryCard history={chargeHistory} />}

        {/* Tips card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conseils pour mieux répartir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Identifiez les déséquilibres</p>
                <p className="text-sm text-muted-foreground">
                  Repérez les catégories où un parent gère plus de 60% des tâches
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Redistribuez progressivement</p>
                <p className="text-sm text-muted-foreground">
                  Commencez par les tâches les plus simples à déléguer
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Utilisez l&apos;assignation automatique</p>
                <p className="text-sm text-muted-foreground">
                  L&apos;app peut assigner les nouvelles tâches au parent le moins chargé
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

/**
 * Skeleton fallback for ChargeDataStream
 */
export function ChargeDataSkeleton() {
  return (
    <div className="space-y-8">
      {/* Summary Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" shimmer />
                <Skeleton className="h-4 w-28" shimmer />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-16 mb-1" shimmer />
              <Skeleton className="h-4 w-24" shimmer />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balance skeleton */}
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
        <div className="rounded-lg border p-6 space-y-4 bg-card">
          <Skeleton className="h-6 w-40" shimmer />
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

      {/* Category breakdown skeleton */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" shimmer />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" shimmer />
                <Skeleton className="h-5 w-12" shimmer />
              </div>
              <Skeleton className="h-2 w-full rounded-full" shimmer />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
