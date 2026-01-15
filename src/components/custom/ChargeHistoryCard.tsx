"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"

interface WeekHistory {
  weekStart: string
  weekEnd: string
  weekLabel: string
  members: {
    userId: string
    userName: string
    load: number
    percentage: number
  }[]
  totalLoad: number
  isBalanced: boolean
}

interface ChargeHistoryCardProps {
  history: WeekHistory[]
  className?: string
}

export function ChargeHistoryCard({ history, className }: ChargeHistoryCardProps) {
  if (history.length < 2) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-lg">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Pas assez de données pour afficher l&apos;historique.
            <br />
            Revenez la semaine prochaine !
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate trends
  const currentWeek = history[0]
  const previousWeek = history[1]

  const totalTrend =
    previousWeek && previousWeek.totalLoad > 0
      ? ((currentWeek?.totalLoad ?? 0) - previousWeek.totalLoad) / previousWeek.totalLoad
      : 0

  const balanceTrend = history.filter((w) => w.isBalanced).length

  // Encouraging message based on balance
  const balanceRatio = balanceTrend / history.length
  let message = ""
  if (balanceRatio >= 0.75) {
    message = "Excellent ! Vous maintenez un bon \u00e9quilibre."
  } else if (balanceRatio >= 0.5) {
    message = "Pas mal ! La charge est souvent bien r\u00e9partie."
  } else {
    message = "Pensez \u00e0 r\u00e9\u00e9quilibrer les t\u00e2ches entre vous."
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Historique (4 semaines)</CardTitle>
          {balanceRatio >= 0.5 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Bien
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week by week summary */}
        <div className="space-y-3">
          {history.map((week, index) => (
            <div
              key={week.weekStart}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                index === 0 && "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm",
                    index === 0 ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {week.weekLabel}
                </span>
                {index === 0 && (
                  <Badge variant="outline" className="text-xs">
                    En cours
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{week.totalLoad} pts</span>
                {week.isBalanced ? (
                  <span className="text-green-600 text-xs">Equilibr\u00e9</span>
                ) : (
                  <span className="text-orange-600 text-xs">D\u00e9s\u00e9quilibr\u00e9</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Trend indicator */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tendance charge</span>
            <div className="flex items-center gap-1">
              {totalTrend > 0.1 ? (
                <>
                  <TrendUpIcon className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">
                    +{Math.round(totalTrend * 100)}%
                  </span>
                </>
              ) : totalTrend < -0.1 ? (
                <>
                  <TrendDownIcon className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">
                    {Math.round(totalTrend * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendNeutralIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Stable</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Semaines \u00e9quilibr\u00e9es</span>
            <span className="font-medium">
              {balanceTrend}/{history.length}
            </span>
          </div>
        </div>

        {/* Encouraging message */}
        <div className="pt-2">
          <p className="text-sm text-muted-foreground italic">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
    </svg>
  )
}

function TrendDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
    </svg>
  )
}

function TrendNeutralIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
    </svg>
  )
}
