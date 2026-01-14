"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils/index"
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react"

interface TimelineTask {
  id: string
  title: string
  status: "done" | "pending" | "upcoming"
  date: Date
  categoryName?: string
  categoryColor?: string
  assignedTo?: string
  loadWeight: number
}

interface ChildTimelineProps {
  childId: string
  childName: string
  tasks: TimelineTask[]
  className?: string
}

type PeriodFilter = "week" | "month" | "all"

export function ChildTimeline({
  childId,
  childName,
  tasks,
  className,
}: ChildTimelineProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month")
  const [currentOffset, setCurrentOffset] = useState(0) // Offset in weeks/months

  // Filter and group tasks
  const filteredTasks = filterTasksByPeriod(tasks, periodFilter, currentOffset)
  const groupedTasks = groupTasksByDate(filteredTasks)

  // Get period label
  const periodLabel = getPeriodLabel(periodFilter, currentOffset)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Historique de {childName}</h3>
          <p className="text-sm text-muted-foreground">
            {filteredTasks.length} tâche{filteredTasks.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg border bg-muted/50 p-1">
            {(["week", "month", "all"] as const).map((period) => (
              <Button
                key={period}
                variant={periodFilter === period ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setPeriodFilter(period)
                  setCurrentOffset(0)
                }}
                className="h-7 text-xs"
              >
                {period === "week" && "Semaine"}
                {period === "month" && "Mois"}
                {period === "all" && "Tout"}
              </Button>
            ))}
          </div>

          {/* Navigation */}
          {periodFilter !== "all" && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {periodLabel}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentOffset((o) => o + 1)}
                disabled={currentOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          {groupedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune tâche pour cette période</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {groupedTasks.map((group, groupIndex) => (
                  <div key={group.date.toISOString()}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {formatDateHeader(group.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.tasks.length} tâche{group.tasks.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Tasks for this date */}
                    <div className="ml-[31px] space-y-3">
                      {group.tasks.map((task, taskIndex) => (
                        <TimelineItem key={task.id} task={task} />
                      ))}
                    </div>

                    {groupIndex < groupedTasks.length - 1 && (
                      <Separator className="mt-6 ml-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled>
          <FileText className="mr-2 h-4 w-4" />
          Exporter en PDF (bientôt)
        </Button>
      </div>
    </div>
  )
}

function TimelineItem({ task }: { task: TimelineTask }) {
  const getStatusIcon = () => {
    switch (task.status) {
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "pending":
        return <Circle className="h-4 w-4 text-amber-500" />
      case "upcoming":
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = () => {
    switch (task.status) {
      case "done":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Fait</Badge>
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">En cours</Badge>
      case "upcoming":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">À venir</Badge>
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="mt-0.5">{getStatusIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{task.title}</p>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {task.categoryName && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: task.categoryColor ?? undefined }}
            >
              {task.categoryName}
            </span>
          )}
          {task.assignedTo && <span>Assigné à {task.assignedTo}</span>}
          <span>{task.loadWeight} pts</span>
        </div>
      </div>
    </div>
  )
}

function filterTasksByPeriod(
  tasks: TimelineTask[],
  period: PeriodFilter,
  offset: number
): TimelineTask[] {
  if (period === "all") {
    return tasks
  }

  const now = new Date()
  let start: Date
  let end: Date

  if (period === "week") {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    start = startOfWeek
    end = endOfWeek
  } else {
    // month
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  }

  return tasks.filter((task) => {
    const taskDate = task.date
    return taskDate >= start && taskDate <= end
  })
}

function groupTasksByDate(tasks: TimelineTask[]): { date: Date; tasks: TimelineTask[] }[] {
  const groups = new Map<string, TimelineTask[]>()

  for (const task of tasks) {
    const dateKey = task.date.toISOString().split("T")[0] ?? task.date.toISOString()
    const existing = groups.get(dateKey) ?? []
    existing.push(task)
    groups.set(dateKey, existing)
  }

  // Convert to array and sort by date descending
  return Array.from(groups.entries())
    .map(([dateStr, tasks]) => ({
      date: new Date(dateStr),
      tasks: tasks.sort((a, b) => b.date.getTime() - a.date.getTime()),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

function getPeriodLabel(period: PeriodFilter, offset: number): string {
  if (period === "all") return "Tout"

  const now = new Date()

  if (period === "week") {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)

    if (offset === 0) return "Cette semaine"
    if (offset === -1) return "Semaine dernière"

    return `Sem. ${startOfWeek.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
  }

  // month
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1)

  if (offset === 0) return "Ce mois"
  if (offset === -1) return "Mois dernier"

  return targetMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
}

function formatDateHeader(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return "Aujourd'hui"
  if (isYesterday) return "Hier"

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}
