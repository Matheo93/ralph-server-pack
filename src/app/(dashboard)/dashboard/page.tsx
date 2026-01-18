import { Suspense } from "react"
import { getHousehold } from "@/lib/actions/household"
import { getKidsPendingCounts } from "@/lib/actions/kids-notifications"
import { StreakCounter } from "@/components/custom/StreakCounter"
import { KidsPendingBanner } from "@/components/custom/KidsPendingBanner"
import {
  DashboardStatsStream,
  DashboardStatsSkeleton,
  DashboardTodayStream,
  DashboardTodaySkeleton,
  DashboardWeekStream,
  DashboardWeekSkeleton,
  DashboardChargeStream,
  DashboardChargeSkeleton,
  DashboardOverdueStream,
  DashboardOverdueSkeleton,
  DashboardUnscheduledStream,
  DashboardUnscheduledSkeleton,
  StreamingErrorBoundary,
} from "@/components/streaming"

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic"
export const revalidate = 0

// Async component for streak counter (needs household data)
async function StreakCounterStream() {
  const membership = await getHousehold()
  const household = membership?.households as {
    name: string
    streak_current: number
    streak_best: number
    subscription_status: string
  } | null

  return (
    <StreakCounter
      current={household?.streak_current ?? 0}
      best={household?.streak_best ?? 0}
    />
  )
}

// Async component for kids pending banner
async function KidsPendingStream() {
  const kidsPending = await getKidsPendingCounts()

  if (kidsPending.total === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <KidsPendingBanner
        pendingProofs={kidsPending.pendingProofs}
        pendingRedemptions={kidsPending.pendingRedemptions}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 pb-24">
      {/* Header - renders immediately */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bonjour !</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats rapides - streams independently */}
      <StreamingErrorBoundary sectionName="statistiques">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStatsStream />
        </Suspense>
      </StreamingErrorBoundary>

      {/* Kids pending notifications - streams independently */}
      <Suspense fallback={null}>
        <KidsPendingStream />
      </Suspense>

      {/* Tâches en retard - streams independently */}
      <StreamingErrorBoundary sectionName="tâches en retard">
        <Suspense fallback={<DashboardOverdueSkeleton />}>
          <DashboardOverdueStream />
        </Suspense>
      </StreamingErrorBoundary>

      {/* Charge mentale section - streams independently */}
      <StreamingErrorBoundary sectionName="charge mentale">
        <Suspense fallback={<DashboardChargeSkeleton />}>
          <DashboardChargeStream />
        </Suspense>
      </StreamingErrorBoundary>

      {/* Layout principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale - Tâches du jour */}
        <div className="lg:col-span-2 space-y-6">
          <StreamingErrorBoundary sectionName="tâches du jour">
            <Suspense fallback={<DashboardTodaySkeleton />}>
              <DashboardTodayStream />
            </Suspense>
          </StreamingErrorBoundary>

          <StreamingErrorBoundary sectionName="tâches non planifiées">
            <Suspense fallback={<DashboardUnscheduledSkeleton />}>
              <DashboardUnscheduledStream />
            </Suspense>
          </StreamingErrorBoundary>

          <StreamingErrorBoundary sectionName="tâches de la semaine">
            <Suspense fallback={<DashboardWeekSkeleton />}>
              <DashboardWeekStream />
            </Suspense>
          </StreamingErrorBoundary>
        </div>

        {/* Colonne latérale - Streak et Historique */}
        <div className="space-y-6">
          <StreamingErrorBoundary sectionName="streak">
            <Suspense fallback={<div className="rounded-lg border p-6 animate-pulse bg-card h-32" />}>
              <StreakCounterStream />
            </Suspense>
          </StreamingErrorBoundary>
        </div>
      </div>
    </div>
  )
}
