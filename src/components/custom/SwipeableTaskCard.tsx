"use client"

import { useState, useRef, useTransition, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskPriorityBadge } from "./TaskPriorityBadge"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { completeTask, cancelTask, deleteTask, restoreTask } from "@/lib/actions/tasks"
import type { TaskListItem } from "@/types/task"
import { cn } from "@/lib/utils/index"
import { Check, Clock, MoreHorizontal, Trash2, RotateCcw, X } from "lucide-react"
import { showToast } from "@/lib/toast-messages"

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
const MAX_SWIPE = 150

export function SwipeableTaskCard({ task, onPostpone }: SwipeableTaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showActions, setShowActions] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [longPressActive, setLongPressActive] = useState(false)
  const [actionTriggered, setActionTriggered] = useState<"complete" | "postpone" | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontalSwipe = useRef(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const handleComplete = useCallback(() => {
    setActionTriggered("complete")
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10])
    }
    startTransition(async () => {
      try {
        await completeTask(task.id)
        showToast.success("taskCompleted", task.title)
      } catch {
        showToast.error("taskCompleteFailed")
      } finally {
        setActionTriggered(null)
      }
    })
  }, [task.id, task.title])

  const handleCancel = useCallback(() => {
    startTransition(async () => {
      try {
        await cancelTask(task.id)
        showToast.info("taskCancelled", task.title)
      } catch {
        showToast.error("generic")
      }
    })
  }, [task.id, task.title])

  const handleDelete = useCallback(() => {
    startTransition(async () => {
      try {
        await deleteTask(task.id)
        showToast.success("taskDeleted", task.title)
      } catch {
        showToast.error("taskDeleteFailed")
      }
    })
  }, [task.id, task.title])

  const handleRestore = useCallback(() => {
    startTransition(async () => {
      try {
        await restoreTask(task.id)
        showToast.success("taskRestored", task.title)
      } catch {
        showToast.error("generic")
      }
    })
  }, [task.id, task.title])

  const handlePostpone = useCallback(() => {
    if (onPostpone) {
      setActionTriggered("postpone")
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
      onPostpone(task.id)
      setTimeout(() => setActionTriggered(null), 300)
    }
  }, [onPostpone, task.id])

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    startX.current = touch.clientX
    startY.current = touch.clientY
    isHorizontalSwipe.current = false
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
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return

    const touch = e.touches[0]
    if (!touch) return

    // Cancel long press if moving
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    const diffX = touch.clientX - startX.current
    const diffY = touch.clientY - startY.current

    // Determine swipe direction on first move
    if (!isHorizontalSwipe.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY)
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) {
      setSwipeX(0)
      return
    }

    // Apply resistance at the edges
    let limitedDiff = diffX
    if (Math.abs(diffX) > MAX_SWIPE) {
      const overflow = Math.abs(diffX) - MAX_SWIPE
      const resistance = 0.3
      limitedDiff = (diffX > 0 ? 1 : -1) * (MAX_SWIPE + overflow * resistance)
    }

    setSwipeX(limitedDiff)

    // Haptic feedback when crossing threshold
    if (Math.abs(swipeX) < SWIPE_THRESHOLD && Math.abs(limitedDiff) >= SWIPE_THRESHOLD) {
      if (navigator.vibrate) {
        navigator.vibrate(5)
      }
    }
  }, [isSwiping, swipeX])

  const handleTouchEnd = useCallback(() => {
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
      handlePostpone()
    }

    // Reset swipe with animation
    setSwipeX(0)
    setLongPressActive(false)
    isHorizontalSwipe.current = false
  }, [swipeX, handleComplete, handlePostpone, onPostpone])

  const overdue = isOverdue(task.deadline)
  const isDone = task.status === "done"
  const isCancelled = task.status === "cancelled"

  // Calculate background colors based on swipe
  const completeProgress = Math.min(Math.max(swipeX / SWIPE_THRESHOLD, 0), 1)
  const postponeProgress = Math.min(Math.max(-swipeX / SWIPE_THRESHOLD, 0), 1)
  const showCompleteAction = swipeX > SWIPE_THRESHOLD / 3
  const showPostponeAction = swipeX < -SWIPE_THRESHOLD / 3

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        actionTriggered === "complete" && "animate-pulse"
      )}
    >
      {/* Swipe action backgrounds */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-start px-6 transition-all duration-150",
          "bg-gradient-to-r from-green-500 to-green-600"
        )}
        style={{ opacity: completeProgress }}
      >
        <div className={cn(
          "flex items-center gap-2 text-white font-medium transition-transform",
          completeProgress >= 1 && "scale-110"
        )}>
          <Check className={cn(
            "h-5 w-5 transition-transform",
            completeProgress >= 1 && "scale-125"
          )} />
          <span>Fait</span>
        </div>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-end px-6 transition-all duration-150",
          "bg-gradient-to-l from-orange-500 to-orange-600"
        )}
        style={{ opacity: postponeProgress }}
      >
        <div className={cn(
          "flex items-center gap-2 text-white font-medium transition-transform",
          postponeProgress >= 1 && "scale-110"
        )}>
          <span>Reporter</span>
          <Clock className={cn(
            "h-5 w-5 transition-transform",
            postponeProgress >= 1 && "scale-125"
          )} />
        </div>
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
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Actions de la tâche">
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="bg-green-600 hover:bg-green-700 active:scale-95 transition-transform"
                  data-testid="task-complete-btn"
                  aria-label="Marquer comme fait"
                >
                  {isPending ? (
                    <span className="animate-pulse" aria-hidden="true">...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                      Fait
                    </>
                  )}
                </Button>
                {onPostpone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePostpone}
                    disabled={isPending}
                    className="active:scale-95 transition-transform"
                    data-testid="task-postpone-btn"
                    aria-label="Reporter la tâche"
                  >
                    <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                    Reporter
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowActions(!showActions)}
                  disabled={isPending}
                  className="active:scale-95 transition-transform"
                  aria-expanded={showActions}
                  aria-label="Plus d'actions"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
                {showActions && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                      onClick={handleCancel}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive active:scale-95 transition-transform"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
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
                  className="active:scale-95 transition-transform"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restaurer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive active:scale-95 transition-transform"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            )}

            {/* Swipe hint for mobile - only show first time */}
            <p className="text-[11px] text-muted-foreground/70 mt-2 md:hidden select-none">
              ← Glissez pour actions rapides →
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
