"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import type { UserLoadSummary, HouseholdBalance } from "@/types/task"

interface ChargeBalanceProps {
  balance: HouseholdBalance
  className?: string
}

export function ChargeBalance({ balance, className }: ChargeBalanceProps) {
  const { members, isBalanced, alertLevel } = balance

  // Sort by percentage descending
  const sortedMembers = [...members].sort((a, b) => b.percentage - a.percentage)

  return (
    <Card
      className={cn(
        className,
        alertLevel === "critical" && "border-red-300 bg-red-50/50 dark:bg-red-950/20",
        alertLevel === "warning" && "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Charge mentale</CardTitle>
          {alertLevel !== "none" && (
            <Badge
              variant={alertLevel === "critical" ? "destructive" : "secondary"}
              className={alertLevel === "warning" ? "bg-orange-500" : ""}
            >
              {alertLevel === "critical" ? "Déséquilibre" : "Attention"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
