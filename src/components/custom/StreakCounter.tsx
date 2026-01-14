"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"

interface StreakMilestone {
  days: number
  label: string
  badge: string
  description: string
}

const MILESTONES: StreakMilestone[] = [
  { days: 3, label: "Debut prometteur", badge: "\ud83c\udf31", description: "3 jours consecutifs" },
  { days: 7, label: "Une semaine", badge: "\u2b50", description: "7 jours consecutifs" },
  { days: 14, label: "Deux semaines", badge: "\ud83c\udf1f", description: "14 jours consecutifs" },
  { days: 30, label: "Un mois", badge: "\ud83d\udd25", description: "30 jours consecutifs" },
  { days: 60, label: "Deux mois", badge: "\ud83d\udcaa", description: "60 jours consecutifs" },
  { days: 100, label: "Centenaire", badge: "\ud83c\udfc6", description: "100 jours consecutifs" },
  { days: 365, label: "Legendaire", badge: "\ud83d\udc51", description: "Une annee complete" },
]

interface StreakCounterProps {
  current: number
  best: number
  isAtRisk?: boolean
  riskReason?: string | null
  className?: string
}

export function StreakCounter({
  current,
  best,
  isAtRisk = false,
  riskReason,
  className,
}: StreakCounterProps) {
  const [displayedCount, setDisplayedCount] = useState(current)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevCurrent = useRef(current)

  // Animate when streak increases
  useEffect(() => {
    if (current > prevCurrent.current) {
      setIsAnimating(true)

      // Check if milestone was just unlocked
      const justUnlocked = MILESTONES.find(
        (m) => m.days === current || (m.days > prevCurrent.current && m.days <= current)
      )
      if (justUnlocked) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }

      // Animate count up
      const diff = current - prevCurrent.current
      const step = Math.max(1, Math.floor(diff / 10))
      let count = prevCurrent.current

      const interval = setInterval(() => {
        count += step
        if (count >= current) {
          count = current
          clearInterval(interval)
          setIsAnimating(false)
        }
        setDisplayedCount(count)
      }, 50)

      prevCurrent.current = current

      return () => clearInterval(interval)
    } else {
      setDisplayedCount(current)
      prevCurrent.current = current
    }
  }, [current])

  const isGood = current >= 5
  const isGreat = current >= 10
  const isAmazing = current >= 30

  // Get current and next milestone
  const unlockedMilestones = MILESTONES.filter((m) => current >= m.days)
  const currentMilestone = unlockedMilestones.length > 0
    ? unlockedMilestones[unlockedMilestones.length - 1]
    : null
  const nextMilestone = MILESTONES.find((m) => m.days > current)

  // Calculate progress to next milestone
  let progressPercent = 0
  if (currentMilestone && nextMilestone) {
    const range = nextMilestone.days - currentMilestone.days
    const achieved = current - currentMilestone.days
    progressPercent = Math.round((achieved / range) * 100)
  } else if (!currentMilestone && nextMilestone) {
    progressPercent = Math.round((current / nextMilestone.days) * 100)
  } else if (currentMilestone && !nextMilestone) {
    progressPercent = 100
  }

  return (
    <Card
      className={cn(
        "overflow-hidden relative",
        isAmazing && "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
        isAtRisk && "border-red-300",
        className
      )}
    >
      {/* Confetti animation */}
      {showConfetti && <ConfettiEffect />}

      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Streak du foyer</p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-4xl font-bold transition-all duration-300",
                  isAnimating && "scale-110",
                  !isGood && "text-foreground",
                  isGood && !isGreat && "text-orange-500",
                  isGreat && !isAmazing && "text-orange-600",
                  isAmazing && "text-amber-500"
                )}
              >
                {displayedCount}
              </span>
              <span className="text-lg text-muted-foreground">jours</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Record: {best} jours
            </p>
          </div>

          <div
            className={cn(
              "text-5xl transition-transform duration-300",
              isAnimating && "animate-bounce"
            )}
          >
            {currentMilestone?.badge || (isAmazing ? "\ud83d\udd25" : isGreat ? "\u2b50" : isGood ? "\u2728" : "\ud83d\udcc5")}
          </div>
        </div>

        {/* Risk warning */}
        {isAtRisk && riskReason && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Streak en danger !
            </p>
            <p className="text-xs text-red-500 dark:text-red-500">
              {riskReason}
            </p>
          </div>
        )}

        {/* Progress bar */}
        {current > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  !isGood && "bg-gray-400",
                  isGood && !isGreat && "bg-orange-400",
                  isGreat && !isAmazing && "bg-orange-500",
                  isAmazing && "bg-gradient-to-r from-amber-400 to-orange-500"
                )}
                style={{
                  width: `${Math.min((current / Math.max(best, 30)) * 100, 100)}%`,
                }}
              />
            </div>

            {current >= best && current > 5 && (
              <p className="text-xs text-center mt-2 text-amber-600 font-medium">
                Nouveau record en cours !
              </p>
            )}
          </div>
        )}

        {/* Next milestone */}
        {nextMilestone && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{nextMilestone.badge}</span>
                <span className="text-muted-foreground">{nextMilestone.label}</span>
              </div>
              <span className="font-medium">
                {nextMilestone.days - current} jour{nextMilestone.days - current > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Unlocked milestones preview */}
        {unlockedMilestones.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Badges debloques ({unlockedMilestones.length})
            </p>
            <div className="flex gap-1 flex-wrap">
              {unlockedMilestones.map((m) => (
                <Badge
                  key={m.days}
                  variant="secondary"
                  className="text-base px-2"
                  title={m.label}
                >
                  {m.badge}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ConfettiEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            backgroundColor: ["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6"][
              Math.floor(Math.random() * 5)
            ],
            width: "8px",
            height: "8px",
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
        />
      ))}
    </div>
  )
}
