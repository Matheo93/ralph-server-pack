"use client"

import { useMemo, memo } from "react"
import { TaskCard } from "./TaskCard"
import type { TaskListItem } from "@/types/task"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DashboardTodayProps {
  tasks: TaskListItem[]
  onPostpone?: (taskId: string) => void
}

function DashboardTodayInner({ tasks, onPostpone }: DashboardTodayProps) {
  // Memoize filtered task lists to prevent recalculation on every render
  const { pendingTasks, criticalTasks, regularTasks } = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending")
    return {
      pendingTasks: pending,
      criticalTasks: pending.filter((t) => t.is_critical),
      regularTasks: pending.filter((t) => !t.is_critical),
    }
  }, [tasks])

  if (pendingTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-lg font-medium">Tout est fait !</p>
            <p className="text-muted-foreground">
              Aucune tâche pour aujourd&apos;hui
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Aujourd&apos;hui</h2>
        <div className="flex gap-2">
          <Badge variant="outline">
            {pendingTasks.length} à faire
          </Badge>
          {criticalTasks.length > 0 && (
            <Badge variant="destructive">
              {criticalTasks.length} critique{criticalTasks.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {criticalTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-600 uppercase tracking-wide">
            Critiques
          </h3>
          {criticalTasks.map((task) => (
            <TaskCard key={task.id} task={task} onPostpone={onPostpone} />
          ))}
        </div>
      )}

      {regularTasks.length > 0 && (
        <div className="space-y-3">
          {criticalTasks.length > 0 && (
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Autres tâches
            </h3>
          )}
          {regularTasks.map((task) => (
            <TaskCard key={task.id} task={task} onPostpone={onPostpone} />
          ))}
        </div>
      )}
    </div>
  )
}

// Memoize to prevent re-renders when parent updates but tasks haven't changed
export const DashboardToday = memo(DashboardTodayInner)
