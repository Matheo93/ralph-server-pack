"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import type { UserLoadSummary, HouseholdBalance } from "@/types/task"
import { CheckCircle2, TrendingDown } from "lucide-react"

interface ChargeBalanceProps {
  balance: HouseholdBalance
  className?: string
}

export function ChargeBalance({ balance, className }: ChargeBalanceProps) {
  const { members, isBalanced, alertLevel, totalLoad } = balance

  // Sort by percentage descending
  const sortedMembers = [...members].sort((a, b) => b.percentage - a.percentage)

  // Calculate if load is low (good state)
  const isLowLoad = totalLoad <= 10

  return (
    <Card
      className={cn(
        className,
        alertLevel === "critical" && "border-red-300 bg-red-50/50 dark:bg-red-950/20",
        alertLevel === "warning" && "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20",
        isLowLoad && isBalanced && "border-green-300 bg-green-50/50 dark:bg-green-950/20"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Charge mentale</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-green-600" />
              <span className="text-xs">Compléter une tâche réduit le score</span>
            </CardDescription>
          </div>
          {isLowLoad && isBalanced ? (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Excellent
            </Badge>
          ) : alertLevel !== "none" ? (
            <Badge
              variant={alertLevel === "critical" ? "destructive" : "secondary"}
              className={alertLevel === "warning" ? "bg-orange-500" : ""}
            >
              {alertLevel === "critical" ? "Déséquilibre" : "Attention"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total load indicator */}
        <div className="flex items-center justify-between text-sm pb-2 border-b">
          <span className="text-muted-foreground">Charge totale actuelle</span>
          <span className={cn(
            "font-bold",
            totalLoad === 0 && "text-green-600",
            totalLoad > 0 && totalLoad <= 20 && "text-green-600",
            totalLoad > 20 && totalLoad <= 50 && "text-amber-600",
            totalLoad > 50 && "text-red-600"
          )}>
            {totalLoad} points
            {totalLoad === 0 && " - Bravo !"}
          </span>
        </div>

        {sortedMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Pas encore de données de charge
          </p>
        ) : (
          sortedMembers.map((member) => (
            <MemberLoadBar key={member.userId} member={member} />
          ))
        )}

        {!isBalanced && members.length >= 2 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {alertLevel === "critical"
                ? "La charge est très déséquilibrée. Pensez à redistribuer les tâches."
                : "La charge commence à être déséquilibrée."}
            </p>
          </div>
        )}

        {/* Tip for reducing load */}
        {totalLoad > 0 && (
          <div className="pt-2 border-t bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 -mx-1">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <span className="text-base">💡</span>
              <span>Complétez vos tâches en attente pour réduire votre charge mentale !</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MemberLoadBar({ member }: { member: UserLoadSummary }) {
  const isHigh = member.percentage > 55
  const isCritical = member.percentage > 60

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{member.userName || "Parent"}</span>
        <span
          className={cn(
            "font-medium",
            isCritical && "text-red-600",
            isHigh && !isCritical && "text-orange-600"
          )}
        >
          {Math.round(member.percentage)}%
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            !isHigh && "bg-primary",
            isHigh && !isCritical && "bg-orange-500",
            isCritical && "bg-red-500"
          )}
          style={{ width: `${Math.min(member.percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {member.tasksCount} tâche{member.tasksCount > 1 ? "s" : ""} cette semaine
      </p>
    </div>
  )
}
