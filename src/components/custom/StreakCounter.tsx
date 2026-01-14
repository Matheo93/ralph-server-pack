"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils/index"

interface StreakCounterProps {
  current: number
  best: number
  className?: string
}

export function StreakCounter({ current, best, className }: StreakCounterProps) {
  const isGood = current >= 5
  const isGreat = current >= 10
  const isAmazing = current >= 30

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isAmazing && "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
        className
      )}
    >
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Streak du foyer
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-4xl font-bold",
                  !isGood && "text-foreground",
                  isGood && !isGreat && "text-orange-500",
                  isGreat && !isAmazing && "text-orange-600",
                  isAmazing && "text-amber-500"
                )}
              >
                {current}
              </span>
              <span className="text-lg text-muted-foreground">jours</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Record: {best} jours
            </p>
          </div>

          <div className="text-5xl">
            {isAmazing ? "🔥" : isGreat ? "⭐" : isGood ? "✨" : "📅"}
          </div>
        </div>

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
      </CardContent>
    </Card>
  )
}
