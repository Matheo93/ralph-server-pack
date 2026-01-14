"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskPriorityBadge } from "./TaskPriorityBadge"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { completeTask, cancelTask, deleteTask, restoreTask } from "@/lib/actions/tasks"
import type { TaskListItem } from "@/types/task"
import { cn } from "@/lib/utils/index"

interface TaskCardProps {
  task: TaskListItem
  onPostpone?: (taskId: string) => void
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "Pas de date"

  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)

  if (taskDate.getTime() === today.getTime()) {
    return "Aujourd'hui"
  }
  if (taskDate.getTime() === tomorrow.getTime()) {
    return "Demain"
  }
  if (taskDate < today) {
    const daysLate = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))
    return `En retard (${daysLate}j)`
  }

  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export function TaskCard({ task, onPostpone }: TaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showActions, setShowActions] = useState(false)

  const handleComplete = () => {
    startTransition(async () => {
      await completeTask(task.id)
    })
  }

  const handleCancel = () => {
    startTransition(async () => {
      await cancelTask(task.id)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id)
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      await restoreTask(task.id)
    })
  }

  const overdue = isOverdue(task.deadline)
  const isDone = task.status === "done"
  const isCancelled = task.status === "cancelled"

  return (
    <Card
      className={cn(
        "w-full transition-all",
        isDone && "opacity-60 bg-muted/50",
        isCancelled && "opacity-40 bg-muted/30",
        overdue && !isDone && !isCancelled && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {task.category_code && (
              <TaskCategoryIcon
                code={task.category_code}
                color={task.category_color}
              />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/tasks/${task.id}`}>
                <CardTitle
                  className={cn(
                    "text-base hover:underline cursor-pointer",
                    isDone && "line-through",
                    isCancelled && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </CardTitle>
              </Link>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {task.child_name && (
                  <Badge variant="outline" className="text-xs">
                    {task.child_name}
                  </Badge>
                )}
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    overdue && !isDone && !isCancelled && "text-red-600 font-medium"
                  )}
                >
                  {formatDeadline(task.deadline)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TaskPriorityBadge priority={task.priority} />
            {task.is_critical && (
              <Badge variant="destructive" className="text-xs">
                Critique
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!isDone && !isCancelled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? "..." : "Fait"}
            </Button>
            {onPostpone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPostpone(task.id)}
                disabled={isPending}
              >
                Reporter
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowActions(!showActions)}
              disabled={isPending}
            >
              Plus
            </Button>
            {showActions && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  Supprimer
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={isDone ? "secondary" : "outline"}>
              {isDone ? "Terminé" : "Annulé"}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRestore}
              disabled={isPending}
            >
              Restaurer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
