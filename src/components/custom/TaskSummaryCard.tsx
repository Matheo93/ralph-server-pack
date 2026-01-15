"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Clock, AlertTriangle, CalendarClock } from "lucide-react"
import type { TaskListItem } from "@/types/task"
import { cn } from "@/lib/utils/index"

interface TaskSummaryCardProps {
  tasks: TaskListItem[]
  className?: string
}

export function TaskSummaryCard({ tasks, className }: TaskSummaryCardProps) {
  const summary = useMemo(() => {
    const now = new Date()
    const pending = tasks.filter((t) => t.status === "pending")
    const done = tasks.filter((t) => t.status === "done")
    const overdue = pending.filter((t) => {
      if (!t.deadline) return false
      return new Date(t.deadline) < now
    })
    const critical = pending.filter((t) => t.is_critical)
    const total = tasks.length
    const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0

    return {
      total,
      pending: pending.length,
      done: done.length,
      overdue: overdue.length,
      critical: critical.length,
      completionRate,
    }
  }, [tasks])

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Résumé du jour</span>
          {summary.total > 0 && (
            <Badge variant="outline" className="font-normal">
              {summary.completionRate}% terminé
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {summary.total > 0 && (
          <div className="space-y-1">
            <Progress value={summary.completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {summary.done}/{summary.total} tâches
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{summary.pending}</p>
              <p className="text-xs text-muted-foreground">À faire</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">{summary.done}</p>
              <p className="text-xs text-muted-foreground">Terminées</p>
            </div>
          </div>

          {summary.overdue > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20">
              <CalendarClock className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-600">{summary.overdue}</p>
                <p className="text-xs text-orange-600/80">En retard</p>
              </div>
            </div>
          )}

          {summary.critical > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600">{summary.critical}</p>
                <p className="text-xs text-red-600/80">Critiques</p>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {summary.total === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Aucune tâche pour aujourd&apos;hui</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
