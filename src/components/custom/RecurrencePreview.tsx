"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"

interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  byDayOfWeek?: number[] // 0=Sunday, 6=Saturday
  byDayOfMonth?: number[]
  byMonth?: number[]
  endDate?: string
  count?: number
}

interface RecurrencePreviewProps {
  rule: RecurrenceRule | null
  startDate?: Date
  className?: string
}

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"
]

function getFrequencyLabel(rule: RecurrenceRule): string {
  const { frequency, interval } = rule

  if (interval === 1) {
    switch (frequency) {
      case "daily":
        return "Tous les jours"
      case "weekly":
        if (rule.byDayOfWeek && rule.byDayOfWeek.length > 0) {
          const days = rule.byDayOfWeek.map((d) => DAY_NAMES[d]).join(", ")
          return `Chaque ${days}`
        }
        return "Toutes les semaines"
      case "monthly":
        if (rule.byDayOfMonth && rule.byDayOfMonth.length > 0) {
          return `Le ${rule.byDayOfMonth.join(", ")} de chaque mois`
        }
        return "Tous les mois"
      case "yearly":
        return "Tous les ans"
    }
  }

  switch (frequency) {
    case "daily":
      return `Tous les ${interval} jours`
    case "weekly":
      return `Toutes les ${interval} semaines`
    case "monthly":
      return `Tous les ${interval} mois`
    case "yearly":
      return `Tous les ${interval} ans`
  }
}

function getNextOccurrences(
  rule: RecurrenceRule,
  startDate: Date,
  count: number = 5
): Date[] {
  const occurrences: Date[] = []
  let current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const maxIterations = 365 // Safety limit
  let iterations = 0

  while (occurrences.length < count && iterations < maxIterations) {
    iterations++

    let isValid = true

    // Check byDayOfWeek constraint
    if (rule.byDayOfWeek && rule.byDayOfWeek.length > 0) {
      isValid = rule.byDayOfWeek.includes(current.getDay())
    }

    // Check byDayOfMonth constraint
    if (rule.byDayOfMonth && rule.byDayOfMonth.length > 0) {
      isValid = isValid && rule.byDayOfMonth.includes(current.getDate())
    }

    // Check byMonth constraint
    if (rule.byMonth && rule.byMonth.length > 0) {
      isValid = isValid && rule.byMonth.includes(current.getMonth() + 1)
    }

    // Check endDate constraint
    if (rule.endDate && new Date(rule.endDate) < current) {
      break
    }

    if (isValid && current >= startDate) {
      occurrences.push(new Date(current))
    }

    // Advance to next potential occurrence
    switch (rule.frequency) {
      case "daily":
        current.setDate(current.getDate() + rule.interval)
        break
      case "weekly":
        if (rule.byDayOfWeek && rule.byDayOfWeek.length > 0) {
          // Move to next day, check weekly interval when wrapping
          const prevWeek = Math.floor(current.getDate() / 7)
          current.setDate(current.getDate() + 1)
          const newWeek = Math.floor(current.getDate() / 7)
          if (current.getDay() === 0 && newWeek !== prevWeek) {
            // New week started, apply interval
            if (rule.interval > 1) {
              current.setDate(current.getDate() + 7 * (rule.interval - 1))
            }
          }
        } else {
          current.setDate(current.getDate() + 7 * rule.interval)
        }
        break
      case "monthly":
        if (rule.byDayOfMonth && rule.byDayOfMonth.length > 0) {
          // Move to next day in byDayOfMonth or next month
          const currentDayIndex = rule.byDayOfMonth.indexOf(current.getDate())
          if (currentDayIndex < rule.byDayOfMonth.length - 1) {
            current.setDate(rule.byDayOfMonth[currentDayIndex + 1] ?? 1)
          } else {
            current.setMonth(current.getMonth() + rule.interval)
            current.setDate(rule.byDayOfMonth[0] ?? 1)
          }
        } else {
          current.setMonth(current.getMonth() + rule.interval)
        }
        break
      case "yearly":
        current.setFullYear(current.getFullYear() + rule.interval)
        break
    }
  }

  return occurrences
}

export function RecurrencePreview({
  rule,
  startDate = new Date(),
  className,
}: RecurrencePreviewProps) {
  const nextOccurrences = useMemo(() => {
    if (!rule) return []
    return getNextOccurrences(rule, startDate, 5)
  }, [rule, startDate])

  if (!rule) {
    return null
  }

  const label = getFrequencyLabel(rule)

  return (
    <Card className={cn("bg-muted/30", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recurrence</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Next 5 occurrences */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Prochaines occurrences
          </p>
          <div className="space-y-1">
            {nextOccurrences.map((date, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  index === 0 && "font-medium"
                )}
              >
                <span className="w-6 text-center text-muted-foreground">
                  {index + 1}.
                </span>
                <span>
                  {date.toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini calendar for weekly view */}
        {rule.frequency === "weekly" && rule.byDayOfWeek && rule.byDayOfWeek.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Jours de la semaine
            </p>
            <div className="flex gap-1">
              {DAY_NAMES.map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                    rule.byDayOfWeek?.includes(index)
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {day.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End condition */}
        {(rule.endDate || rule.count) && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {rule.endDate && (
                <>
                  Jusqu&apos;au{" "}
                  {new Date(rule.endDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </>
              )}
              {rule.count && <>Limite: {rule.count} occurrences</>}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
