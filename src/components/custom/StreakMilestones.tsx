"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

interface StreakMilestonesProps {
  currentStreak: number
  bestStreak: number
  className?: string
}

export function StreakMilestones({
  currentStreak,
  bestStreak,
  className,
}: StreakMilestonesProps) {
  const unlockedCount = MILESTONES.filter((m) => bestStreak >= m.days).length
  const nextMilestone = MILESTONES.find((m) => m.days > currentStreak)

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Collection de badges</CardTitle>
          <Badge variant="outline">
            {unlockedCount}/{MILESTONES.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Milestones grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MILESTONES.map((milestone) => {
            const isUnlocked = bestStreak >= milestone.days
            const isNext = nextMilestone?.days === milestone.days
            const isCurrent = currentStreak >= milestone.days

            return (
              <div
                key={milestone.days}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  isUnlocked && "bg-primary/5 border-primary/30",
                  !isUnlocked && "bg-muted/30 border-dashed opacity-60",
                  isNext && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <div
                  className={cn(
                    "text-3xl mb-1",
                    !isUnlocked && "grayscale opacity-50"
                  )}
                >
                  {milestone.badge}
                </div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    !isUnlocked && "text-muted-foreground"
                  )}
                >
                  {milestone.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {milestone.days} jours
                </p>

                {/* Progress indicator for next milestone */}
                {isNext && (
                  <div className="mt-2">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.round(
                            (currentStreak /
                              milestone.days) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-primary mt-1">
                      {milestone.days - currentStreak} jour
                      {milestone.days - currentStreak > 1 ? "s" : ""} restant
                      {milestone.days - currentStreak > 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Unlocked badge */}
                {isUnlocked && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Debloque
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* Encouragement message */}
        <div className="pt-4 border-t">
          {unlockedCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              Completez des taches critiques chaque jour pour debloquer des badges !
            </p>
          ) : unlockedCount === MILESTONES.length ? (
            <p className="text-sm text-center text-amber-600 font-medium">
              Felicitations ! Vous avez debloque tous les badges !
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Continuez ainsi ! Plus que {nextMilestone ? nextMilestone.days - currentStreak : 0} jour
              {(nextMilestone ? nextMilestone.days - currentStreak : 0) > 1 ? "s" : ""} pour le prochain badge.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
