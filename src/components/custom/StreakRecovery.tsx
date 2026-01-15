"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import { useJoker } from "@/hooks/use-joker"

// =============================================================================
// TYPES
// =============================================================================

interface StreakRecoveryProps {
  streakAtRisk: boolean
  currentStreak: number
  daysOverdue: number
  onRecovered?: () => void
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * StreakRecovery - Full-screen modal for recovering a lost streak
 *
 * Shown when:
 * - User hasn't completed a task today
 * - Streak is at risk of being lost
 * - Premium user has joker available
 */
export function StreakRecovery({
  streakAtRisk,
  currentStreak,
  daysOverdue,
  onRecovered,
  className,
}: StreakRecoveryProps) {
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { status, useJokerAction, refreshStatus } = useJoker()

  const handleUseJoker = () => {
    setError(null)
    startTransition(async () => {
      const result = await useJokerAction()
      if (result.success) {
        setShowSuccess(true)
        refreshStatus()
        // Callback after animation
        setTimeout(() => {
          onRecovered?.()
        }, 2000)
      } else {
        setError(result.error ?? "Une erreur est survenue")
      }
    })
  }

  // Don't show if streak not at risk or no status
  if (!streakAtRisk || !status) {
    return null
  }

  // Success state
  if (showSuccess) {
    return (
      <Card
        className={cn(
          "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-300 dark:border-green-700",
          className
        )}
      >
        <CardContent className="py-12 text-center">
          <div className="text-7xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
            Streak sauve !
          </h2>
          <p className="text-green-600 dark:text-green-400">
            Votre streak de <strong>{currentStreak} jours</strong> a ete preserve grace a votre joker.
          </p>
          <Badge
            variant="outline"
            className="mt-4 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
          >
            Joker mensuel utilise
          </Badge>
        </CardContent>
      </Card>
    )
  }

  // Check if joker is available
  const canUseJoker = status.available && status.isPremium

  return (
    <Card
      className={cn(
        "overflow-hidden",
        "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30",
        "border-red-300 dark:border-red-700",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <span className="text-3xl">⚠️</span>
          Streak en danger !
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Streak info */}
        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Streak actuel</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {currentStreak}
              <span className="text-lg font-normal ml-1">jours</span>
            </p>
          </div>
          <div className="text-5xl">🔥</div>
        </div>

        {/* Days overdue */}
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            {daysOverdue === 1 ? (
              <>Aucune tache terminee hier</>
            ) : (
              <>
                Pas d&apos;activite depuis <strong>{daysOverdue} jours</strong>
              </>
            )}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Completez une tache aujourd&apos;hui ou utilisez votre joker pour sauver votre streak.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-200 dark:bg-red-900/50 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Joker status */}
        {status.isPremium ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🃏</span>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  {canUseJoker ? "Joker disponible !" : "Joker deja utilise"}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {canUseJoker
                    ? "Utilisez-le pour sauver votre streak sans completer de tache."
                    : "Vous pourrez utiliser votre prochain joker le mois prochain."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-4xl opacity-50">🃏</span>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  Fonctionnalite Premium
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Passez a Premium pour debloquer 1 joker par mois.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {canUseJoker && (
          <Button
            onClick={handleUseJoker}
            disabled={isPending}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6 text-lg"
          >
            {isPending ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <span className="mr-2 text-2xl">🃏</span>
                Utiliser mon Joker
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground px-4">
          {canUseJoker
            ? "Le joker preserve votre streak pour aujourd'hui. Vous n'aurez pas besoin de completer une tache."
            : "Completez une tache avant minuit pour continuer votre streak."}
        </p>
      </CardFooter>
    </Card>
  )
}

// =============================================================================
// COMPACT VERSION FOR DASHBOARD
// =============================================================================

interface StreakRecoveryCompactProps {
  streakAtRisk: boolean
  currentStreak: number
  daysOverdue: number
  onRecovered?: () => void
  className?: string
}

export function StreakRecoveryCompact({
  streakAtRisk,
  currentStreak,
  daysOverdue,
  onRecovered,
  className,
}: StreakRecoveryCompactProps) {
  const [isPending, startTransition] = useTransition()
  const { status, useJokerAction, refreshStatus } = useJoker()

  const handleUseJoker = () => {
    startTransition(async () => {
      const result = await useJokerAction()
      if (result.success) {
        refreshStatus()
        onRecovered?.()
      }
    })
  }

  if (!streakAtRisk || !status?.available) {
    return null
  }

  return (
    <div
      className={cn(
        "p-3 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 rounded-lg border border-red-200 dark:border-red-800",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Streak de {currentStreak} jours en danger
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {daysOverdue === 1
                ? "Pas d'activite hier"
                : `${daysOverdue} jours sans activite`}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleUseJoker}
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {isPending ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <>
              <span className="mr-1">🃏</span>
              Sauver
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
