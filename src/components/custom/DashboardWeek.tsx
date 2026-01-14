"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TaskListItem } from "@/types/task"
import { cn } from "@/lib/utils/index"

interface DashboardWeekProps {
  tasks: TaskListItem[]
  className?: string
}

interface DayData {
  date: Date
  label: string
  shortLabel: string
  tasks: TaskListItem[]
  isToday: boolean
  isPast: boolean
}

function getDaysOfWeek(tasks: TaskListItem[]): DayData[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: DayData[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    const dateStr = date.toISOString().split("T")[0]
    const dayTasks = tasks.filter((t) => t.deadline?.startsWith(dateStr ?? ""))

    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
    const fullDayNames = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ]

    days.push({
      date,
      label: i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : fullDayNames[date.getDay()] ?? "",
      shortLabel: dayNames[date.getDay()] ?? "",
      tasks: dayTasks,
      isToday: i === 0,
      isPast: false,
    })
  }

  return days
}

export function DashboardWeek({ tasks, className }: DashboardWeekProps) {
  const days = getDaysOfWeek(tasks)
  const totalTasks = tasks.filter((t) => t.status === "pending").length

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cette semaine</CardTitle>
          <Badge variant="outline">{totalTasks} tâches</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const pendingCount = day.tasks.filter((t) => t.status === "pending").length
            const hasCritical = day.tasks.some((t) => t.is_critical && t.status === "pending")

            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg",
                  day.isToday && "bg-primary/10 ring-2 ring-primary",
                  !day.isToday && pendingCount > 0 && "bg-muted/50"
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {day.shortLabel}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    day.isToday && "text-primary"
                  )}
                >
                  {day.date.getDate()}
                </span>
                {pendingCount > 0 ? (
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        hasCritical && "text-red-600"
                      )}
                    >
                      {pendingCount}
                    </span>
                    {hasCritical && (
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
