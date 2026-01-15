/**
 * Streak Counter Component
 *
 * Displays current streak count with visual feedback.
 */

"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Flame, Star, Shield, Clock } from "lucide-react"
import { STREAK_MILESTONES, isAtMilestone } from "@/lib/streak/calculator"

interface StreakCounterProps {
  current: number
  longest: number
  isActive: boolean
  expiresAt?: string | null
  onUseJoker?: () => void
  jokerAvailable?: boolean
  isPremium?: boolean
  className?: string
  variant?: "default" | "compact" | "full"
}

export function StreakCounter({
  current,
  longest,
  isActive,
  expiresAt,
  onUseJoker,
  jokerAvailable = false,
  isPremium = false,
  className,
  variant = "default",
}: StreakCounterProps) {
  const isMilestone = isAtMilestone(current)
  const timeRemaining = expiresAt ? getTimeRemaining(expiresAt) : null

  if (variant === "compact") {
    return (
      <CompactStreak
        current={current}
        isActive={isActive}
        className={className}
      />
    )
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        isActive ? "border-orange-500/50" : "border-muted",
        isMilestone && "ring-2 ring-yellow-500",
        className
      )}
      data-testid="streak-counter"
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          {/* Main streak display */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "relative flex items-center justify-center w-16 h-16 rounded-full",
                isActive
                  ? "bg-gradient-to-br from-orange-500 to-red-500"
                  : "bg-muted"
              )}
            >
              <Flame
                className={cn(
                  "h-8 w-8",
                  isActive ? "text-white" : "text-muted-foreground"
                )}
              />
              {isMilestone && (
                <div className="absolute -top-1 -right-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{current}</span>
                <span className="text-sm text-muted-foreground">
                  jour{current !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isActive ? "Streak actif" : "Streak interrompu"}
              </p>
              {longest > 0 && longest !== current && (
                <p className="text-xs text-muted-foreground">
                  Record : {longest} jours
                </p>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col gap-2 items-end">
            {isActive && (
              <Badge variant="outline" className="bg-green-100 text-green-700">
                Actif
              </Badge>
            )}
            {!isActive && current > 0 && (
              <Badge variant="destructive">Interrompu</Badge>
            )}
            {isPremium && (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Expiration warning */}
        {timeRemaining && isActive && (
          <div className="mt-4 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg p-2">
            <Clock className="h-4 w-4" />
            <span>Expire dans {timeRemaining}</span>
          </div>
        )}

        {/* Full variant extras */}
        {variant === "full" && (
          <>
            {/* Milestone progress */}
            <MilestoneProgress current={current} />

            {/* Joker button */}
            {!isActive && isPremium && jokerAvailable && onUseJoker && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={onUseJoker}
                >
                  <Shield className="h-4 w-4" />
                  Utiliser le Joker pour sauver le streak
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Compact variant for inline display
interface CompactStreakProps {
  current: number
  isActive: boolean
  className?: string
}

function CompactStreak({ current, isActive, className }: CompactStreakProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        isActive
          ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20"
          : "bg-muted",
        className
      )}
      data-testid="streak-compact"
    >
      <Flame
        className={cn(
          "h-4 w-4",
          isActive ? "text-orange-500" : "text-muted-foreground"
        )}
      />
      <span
        className={cn(
          "font-semibold",
          isActive ? "text-orange-600" : "text-muted-foreground"
        )}
      >
        {current}
      </span>
    </div>
  )
}

// Milestone progress component
interface MilestoneProgressProps {
  current: number
}

function MilestoneProgress({ current }: MilestoneProgressProps) {
  // Find next milestone
  let nextMilestone = null
  let prevMilestone = 0

  for (const milestone of STREAK_MILESTONES) {
    if (milestone > current) {
      nextMilestone = milestone
      break
    }
    prevMilestone = milestone
  }

  if (!nextMilestone) {
    return (
      <div className="mt-4 text-center text-sm text-muted-foreground">
        🎉 Tous les jalons atteints !
      </div>
    )
  }

  const progress = Math.round(
    ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100
  )

  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{prevMilestone} jours</span>
        <span>Prochain jalon : {nextMilestone} jours</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-center text-xs text-muted-foreground">
        Plus que {nextMilestone - current} jour{nextMilestone - current > 1 ? "s" : ""} !
      </p>
    </div>
  )
}

// Helper functions
function getTimeRemaining(expiresAt: string): string | null {
  const expires = new Date(expiresAt)
  const now = new Date()
  const diff = expires.getTime() - now.getTime()

  if (diff <= 0) return null

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} minutes`
}
