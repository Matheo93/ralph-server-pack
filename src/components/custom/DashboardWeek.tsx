"use client"

import { useMemo, memo } from "react"
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
  pendingCount: number
  hasCritical: boolean
}

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const FULL_DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
]

function getDaysOfWeek(tasks: TaskListItem[]): DayData[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: DayData[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    const dateStr = date.toISOString().split("T")[0]
    const dayTasks = tasks.filter((t) => t.deadline?.startsWith(dateStr ?? ""))
    const pendingTasks = dayTasks.filter((t) => t.status === "pending")

    days.push({
      date,
      label: i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : FULL_DAY_NAMES[date.getDay()] ?? "",
      shortLabel: DAY_NAMES[date.getDay()] ?? "",
      tasks: dayTasks,
      isToday: i === 0,
      isPast: false,
      pendingCount: pendingTasks.length,
      hasCritical: pendingTasks.some((t) => t.is_critical),
    })
  }

  return days
}

function DashboardWeekInner({ tasks, className }: DashboardWeekProps) {
  // Memoize expensive calculations
  const days = useMemo(() => getDaysOfWeek(tasks), [tasks])
  const totalTasks = useMemo(
    () => tasks.filter((t) => t.status === "pending").length,
    [tasks]
  )

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
          {days.map((day) => (
            <div
              key={day.date.toISOString()}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg",
                day.isToday && "bg-primary/10 ring-2 ring-primary",
                !day.isToday && day.pendingCount > 0 && "bg-muted/50"
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
              {day.pendingCount > 0 ? (
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      day.hasCritical && "text-red-600"
                    )}
                  >
                    {day.pendingCount}
                  </span>
                  {day.hasCritical && (
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Memoize to prevent re-renders when parent updates but tasks haven't changed
export const DashboardWeek = memo(DashboardWeekInner)
