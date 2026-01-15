"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils/index"

interface CategoryLoad {
  category: string
  categoryLabel: string
  totalLoad: number
  tasksCount: number
  percentage: number
  members: {
    userId: string
    userName: string
    load: number
    percentage: number
  }[]
}

interface ChargeCategoryBreakdownProps {
  categories: CategoryLoad[]
  totalLoad: number
  className?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  administratif: "bg-blue-500",
  sante: "bg-red-500",
  ecole: "bg-yellow-500",
  quotidien: "bg-green-500",
  social: "bg-purple-500",
  activites: "bg-pink-500",
  logistique: "bg-orange-500",
}

const CATEGORY_ICONS: Record<string, string> = {
  administratif: "\ud83d\udcdd",
  sante: "\ud83c\udfe5",
  ecole: "\ud83c\udf93",
  quotidien: "\ud83c\udfe0",
  social: "\ud83c\udf89",
  activites: "\u26bd",
  logistique: "\ud83d\ude97",
}

export function ChargeCategoryBreakdown({
  categories,
  totalLoad,
  className,
}: ChargeCategoryBreakdownProps) {
  if (categories.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Pas encore de donn\u00e9es par cat\u00e9gorie.
            <br />
            Cr\u00e9ez des t\u00e2ches pour voir la r\u00e9partition.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {categories.map((category) => (
        <Card key={category.category}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{CATEGORY_ICONS[category.category] || "\ud83d\udccb"}</span>
                {category.categoryLabel}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {category.percentage}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Total bar */}
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    CATEGORY_COLORS[category.category] || "bg-gray-500"
                  )}
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{category.totalLoad} points</span>
                <span>
                  {category.tasksCount} t\u00e2che{category.tasksCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Member breakdown */}
            {category.members.filter((m) => m.load > 0).length > 0 && (
              <div className="pt-2 border-t space-y-2">
                {category.members
                  .filter((m) => m.load > 0)
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((member, index) => (
                    <div key={member.userId} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          index === 0 ? "bg-blue-500" : "bg-pink-500"
                        )}
                      />
                      <span className="text-sm flex-1 truncate">
                        {member.userName}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          member.percentage > 60 && "text-red-600",
                          member.percentage > 55 &&
                            member.percentage <= 60 &&
                            "text-orange-600"
                        )}
                      >
                        {member.percentage}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
