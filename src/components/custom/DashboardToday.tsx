"use client"

import { useMemo, memo } from "react"
import { TaskCard } from "./TaskCard"
import type { TaskListItem } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react"

interface DashboardTodayProps {
  tasks: TaskListItem[]
  onPostpone?: (taskId: string) => void
}

// Priority order for sorting
const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

interface TaskGroup {
  childId: string | null
  childName: string | null
  tasks: TaskListItem[]
}

function DashboardTodayInner({ tasks, onPostpone }: DashboardTodayProps) {
  // Memoize filtered and grouped task lists
  const { pendingTasks, overdueTasks, tasksByChild, criticalCount, overdueCount } = useMemo(() => {
    const now = new Date()
    const pending = tasks.filter((t) => t.status === "pending")

    // Identify overdue tasks
    const overdue = pending.filter((t) => {
      if (!t.deadline) return false
      return new Date(t.deadline) < now
    })

    // Sort tasks by: critical first, then priority, then deadline
    const sortedTasks = [...pending].sort((a, b) => {
      // Critical tasks first
      if (a.is_critical && !b.is_critical) return -1
      if (!a.is_critical && b.is_critical) return 1

      // Then by priority
      const priorityA = PRIORITY_ORDER[a.priority] ?? 2
      const priorityB = PRIORITY_ORDER[b.priority] ?? 2
      if (priorityA !== priorityB) return priorityA - priorityB

      // Then by deadline (closest first, null last)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1

      return 0
    })

    // Group by child
    const groupMap = new Map<string | null, TaskGroup>()
    for (const task of sortedTasks) {
      const key = task.child_id
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          childId: task.child_id,
          childName: task.child_name,
          tasks: [],
        })
      }
      groupMap.get(key)!.tasks.push(task)
    }

    // Sort groups: tasks with children first, then by child name
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.childId && !b.childId) return -1
      if (!a.childId && b.childId) return 1
      if (a.childName && b.childName) {
        return a.childName.localeCompare(b.childName)
      }
      return 0
    })

    return {
      pendingTasks: sortedTasks,
      overdueTasks: overdue,
      tasksByChild: groups,
      criticalCount: pending.filter((t) => t.is_critical).length,
      overdueCount: overdue.length,
    }
  }, [tasks])

  if (pendingTasks.length === 0) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50">
        <CardContent className="py-12">
          <div className="text-center">
            {/* Illustrated empty state */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg viewBox="0 0 128 128" className="w-full h-full">
                {/* Background circle */}
                <circle cx="64" cy="64" r="56" fill="#dcfce7" />
                {/* Checkmark */}
                <circle cx="64" cy="64" r="40" fill="#22c55e" />
                <path d="M48 64 L60 76 L80 52" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {/* Sparkles */}
                <g fill="#fbbf24">
                  <polygon transform="translate(100, 24) scale(0.8)" points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5" />
                  <polygon transform="translate(16, 32) scale(0.6)" points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5" />
                  <polygon transform="translate(108, 80) scale(0.5)" points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5" />
                </g>
                {/* Confetti */}
                <circle cx="24" cy="64" r="4" fill="#f97316" opacity="0.7" />
                <circle cx="104" cy="48" r="3" fill="#3b82f6" opacity="0.6" />
                <circle cx="96" cy="100" r="5" fill="#8b5cf6" opacity="0.5" />
              </svg>
            </div>
            <p className="text-xl font-bold text-green-700 mb-2">Bravo, tout est fait !</p>
            <p className="text-green-600 mb-4">
              Aucune tâche pour aujourd&apos;hui. Profitez de ce moment en famille !
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600/80">
              <CheckCircle2 className="w-4 h-4" />
              <span>Vous êtes à jour</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Aujourd&apos;hui</h2>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pendingTasks.length} à faire
          </Badge>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {criticalCount} critique{criticalCount > 1 ? "s" : ""}
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 bg-orange-600">
              <Clock className="w-3 h-3" />
              {overdueCount} en retard
            </Badge>
          )}
        </div>
      </div>

      {/* Overdue tasks alert */}
      {overdueTasks.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Tâches en retard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {overdueTasks.map((task) => (
              <TaskCard key={task.id} task={task} onPostpone={onPostpone} compact />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tasks grouped by child */}
      {tasksByChild.map((group) => (
        <div key={group.childId ?? "general"} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {group.childName ?? "Tâches générales"}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {group.tasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {group.tasks
              .filter((t) => !overdueTasks.some((o) => o.id === t.id))
              .map((task) => (
                <TaskCard key={task.id} task={task} onPostpone={onPostpone} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Memoize to prevent re-renders when parent updates but tasks haven't changed
export const DashboardToday = memo(DashboardTodayInner)
