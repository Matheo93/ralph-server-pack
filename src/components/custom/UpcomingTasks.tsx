"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { showToast } from "@/lib/toast-messages"
import type { UpcomingTaskPreview } from "@/types/template"
import { cn } from "@/lib/utils/index"

interface UpcomingTasksProps {
  tasks: UpcomingTaskPreview[]
  onConfirm?: (templateId: string, childId: string) => Promise<void>
  onSkip?: (templateId: string, childId: string) => Promise<void>
  title?: string
  emptyMessage?: string
}

function formatDeadline(deadline: string, daysUntil: number): string {
  if (daysUntil === 0) return "Aujourd'hui"
  if (daysUntil === 1) return "Demain"
  if (daysUntil < 0) {
    return `En retard (${Math.abs(daysUntil)}j)`
  }
  if (daysUntil <= 7) {
    return `Dans ${daysUntil} jours`
  }

  const date = new Date(deadline)
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function getStatusColor(status: UpcomingTaskPreview["status"]): string {
  switch (status) {
    case "overdue":
      return "bg-red-100 text-red-800"
    case "due_soon":
      return "bg-orange-100 text-orange-800"
    default:
      return "bg-blue-100 text-blue-800"
  }
}

function getStatusLabel(status: UpcomingTaskPreview["status"]): string {
  switch (status) {
    case "overdue":
      return "En retard"
    case "due_soon":
      return "Urgent"
    default:
      return "À venir"
  }
}

function UpcomingTaskCard({
  task,
  onConfirm,
  onSkip,
}: {
  task: UpcomingTaskPreview
  onConfirm?: (templateId: string, childId: string) => Promise<void>
  onSkip?: (templateId: string, childId: string) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    if (!onConfirm) return
    startTransition(async () => {
      try {
        await onConfirm(task.template.id, task.child.id)
        showToast.success("taskCreated", task.template.title)
      } catch {
        showToast.error("taskCreateFailed")
      }
    })
  }

  const handleSkip = () => {
    if (!onSkip) return
    startTransition(async () => {
      try {
        await onSkip(task.template.id, task.child.id)
        showToast.info("taskCancelled", task.template.title)
      } catch {
        showToast.error("generic")
      }
    })
  }

  return (
    <Card
      className={cn(
        "w-full transition-all",
        task.status === "overdue" && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <TaskCategoryIcon
              code={task.template.category}
              color={null}
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">
                {task.template.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-xs">
                  {task.child.first_name}
                </Badge>
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    task.status === "overdue" && "text-red-600 font-medium"
                  )}
                >
                  {formatDeadline(task.deadline, task.daysUntil)}
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn("text-xs shrink-0", getStatusColor(task.status))}
          >
            {getStatusLabel(task.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {task.template.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.template.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {onConfirm && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? "..." : "Créer la tâche"}
            </Button>
          )}
          {onSkip && task.canSkip && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSkip}
              disabled={isPending}
            >
              Ignorer cette fois
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function UpcomingTasks({
  tasks,
  onConfirm,
  onSkip,
  title = "Tâches à venir",
  emptyMessage = "Aucune tâche automatique à venir",
}: UpcomingTasksProps) {
  const [showAll, setShowAll] = useState(false)

  const displayedTasks = showAll ? tasks : tasks.slice(0, 5)
  const hasMore = tasks.length > 5

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="outline">
          {tasks.length} tâche{tasks.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-3">
        {displayedTasks.map((task, index) => (
          <UpcomingTaskCard
            key={`${task.template.id}-${task.child.id}-${index}`}
            task={task}
            onConfirm={onConfirm}
            onSkip={onSkip}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Voir moins" : `Voir les ${tasks.length - 5} autres`}
          </Button>
        </div>
      )}
    </div>
  )
}
