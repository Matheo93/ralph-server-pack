"use client"

import { useState, useRef, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskPriorityBadge } from "./TaskPriorityBadge"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { completeTask, cancelTask, deleteTask, restoreTask } from "@/lib/actions/tasks"
import type { TaskListItem } from "@/types/task"
import { cn } from "@/lib/utils/index"

interface SwipeableTaskCardProps {
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

const SWIPE_THRESHOLD = 80

export function SwipeableTaskCard({ task, onPostpone }: SwipeableTaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showActions, setShowActions] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [longPressActive, setLongPressActive] = useState(false)
  const startX = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

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

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? 0
    setIsSwiping(true)

    // Long press detection
    longPressTimer.current = setTimeout(() => {
      setLongPressActive(true)
      setShowActions(true)
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return

    // Cancel long press if moving
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    const currentX = e.touches[0]?.clientX ?? 0
    const diff = currentX - startX.current

    // Limit swipe distance
    const limitedDiff = Math.max(-150, Math.min(150, diff))
    setSwipeX(limitedDiff)
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Handle swipe actions
    if (swipeX > SWIPE_THRESHOLD) {
      // Swipe right = complete
      handleComplete()
    } else if (swipeX < -SWIPE_THRESHOLD && onPostpone) {
      // Swipe left = postpone
      onPostpone(task.id)
    }

    // Reset swipe
    setSwipeX(0)
    setLongPressActive(false)
  }

  const overdue = isOverdue(task.deadline)
  const isDone = task.status === "done"
  const isCancelled = task.status === "cancelled"

  // Calculate background colors based on swipe
  const showCompleteAction = swipeX > SWIPE_THRESHOLD / 2
  const showPostponeAction = swipeX < -SWIPE_THRESHOLD / 2

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe action backgrounds */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-start px-4 transition-opacity",
          showCompleteAction ? "opacity-100" : "opacity-0",
          "bg-green-500"
        )}
      >
        <span className="text-white font-medium">Fait</span>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-end px-4 transition-opacity",
          showPostponeAction ? "opacity-100" : "opacity-0",
          "bg-orange-500"
        )}
      >
        <span className="text-white font-medium">Reporter</span>
      </div>

      {/* Card with swipe transform */}
      <div
        className="relative"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
                  {isDone ? "Termine" : "Annule"}
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

            {/* Swipe hint for mobile */}
            <p className="text-xs text-muted-foreground mt-2 md:hidden">
              Glissez pour actions rapides
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
