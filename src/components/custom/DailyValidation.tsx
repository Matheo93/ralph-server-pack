"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"

// =============================================================================
// TYPES
// =============================================================================

export interface DailyTask {
  id: string
  title: string
  category: string
  categoryColor: string
  childName?: string
  deadline?: string
  isCritical: boolean
  isCompleted: boolean
  assignedTo?: string
}

export interface DailyValidationProps {
  tasks: DailyTask[]
  onTaskComplete: (taskId: string) => Promise<void>
  onValidateAll: () => Promise<void>
  currentStreak: number
  className?: string
}

// =============================================================================
// CATEGORY COLORS
// =============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  ecole: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sante: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  administratif: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  quotidien: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  social: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  activites: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  logistique: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DailyValidation({
  tasks,
  onTaskComplete,
  onValidateAll,
  currentStreak,
  className,
}: DailyValidationProps) {
  const [expandedTasks, setExpandedTasks] = useState(true)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [isValidatingAll, setIsValidatingAll] = useState(false)

  // Separate critical and non-critical tasks
  const criticalTasks = tasks.filter((t) => t.isCritical)
  const regularTasks = tasks.filter((t) => !t.isCritical)

  const completedCritical = criticalTasks.filter((t) => t.isCompleted).length
  const totalCritical = criticalTasks.length
  const allCriticalDone = completedCritical === totalCritical && totalCritical > 0

  const completedRegular = regularTasks.filter((t) => t.isCompleted).length
  const totalRegular = regularTasks.length

  const handleTaskComplete = useCallback(
    async (taskId: string) => {
      setCompletingTaskId(taskId)
      try {
        await onTaskComplete(taskId)
      } finally {
        setCompletingTaskId(null)
      }
    },
    [onTaskComplete]
  )

  const handleValidateAll = useCallback(async () => {
    setIsValidatingAll(true)
    try {
      await onValidateAll()
    } finally {
      setIsValidatingAll(false)
    }
  }, [onValidateAll])

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Validation quotidienne</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {allCriticalDone
                ? "Toutes les tâches critiques sont faites !"
                : `${completedCritical}/${totalCritical} tâche${totalCritical > 1 ? "s" : ""} critique${totalCritical > 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedTasks(!expandedTasks)}
          >
            {expandedTasks ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progression critique</span>
            <span>
              {completedCritical}/{totalCritical}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                allCriticalDone
                  ? "bg-green-500"
                  : completedCritical > 0
                  ? "bg-amber-500"
                  : "bg-red-400"
              )}
              style={{
                width: `${totalCritical > 0 ? (completedCritical / totalCritical) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </CardHeader>

      {expandedTasks && (
        <CardContent className="pt-0">
          {/* Critical tasks section */}
          {criticalTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>Tâches critiques ({totalCritical})</span>
              </div>
              {criticalTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleTaskComplete}
                  isLoading={completingTaskId === task.id}
                />
              ))}
            </div>
          )}

          {/* Regular tasks section */}
          {regularTasks.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Autres tâches ({totalRegular})</span>
              </div>
              {regularTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleTaskComplete}
                  isLoading={completingTaskId === task.id}
                />
              ))}
            </div>
          )}

          {/* Validate all button */}
          {tasks.length > 0 && !tasks.every((t) => t.isCompleted) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleValidateAll}
                disabled={isValidatingAll}
                className="w-full"
                variant={allCriticalDone ? "default" : "outline"}
              >
                {isValidatingAll ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">...</span>
                    Validation en cours
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Valider toutes les tâches restantes
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Success state */}
          {tasks.length > 0 && tasks.every((t) => t.isCompleted) && (
            <div className="mt-4 pt-4 border-t text-center">
              <div className="text-4xl mb-2">
                {currentStreak >= 30 ? "🔥" : currentStreak >= 7 ? "⭐" : "✨"}
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Toutes les tâches du jour sont terminées !
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Streak: {currentStreak} jour{currentStreak > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Pas de tâches pour aujourd&apos;hui</p>
              <p className="text-xs mt-1">Profitez de votre journée !</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// =============================================================================
// TASK ITEM
// =============================================================================

interface TaskItemProps {
  task: DailyTask
  onComplete: (taskId: string) => Promise<void>
  isLoading: boolean
}

function TaskItem({ task, onComplete, isLoading }: TaskItemProps) {
  const categoryColorClass =
    CATEGORY_COLORS[task.category] ?? "bg-gray-100 text-gray-800"

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        task.isCompleted
          ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
          : task.isCritical
          ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          : "bg-background border-border"
      )}
    >
      <button
        type="button"
        onClick={() => !task.isCompleted && !isLoading && onComplete(task.id)}
        disabled={task.isCompleted || isLoading}
        className={cn(
          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
          task.isCompleted
            ? "bg-green-500 border-green-500 text-white"
            : task.isCritical
            ? "border-red-400 hover:border-red-500"
            : "border-gray-300 hover:border-gray-400",
          (task.isCompleted || isLoading) && "cursor-not-allowed opacity-70"
        )}
        aria-label={task.isCompleted ? "Tâche terminée" : "Marquer comme terminée"}
      >
        {task.isCompleted && (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium truncate",
              task.isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          {task.isCritical && !task.isCompleted && (
            <Badge variant="destructive" className="text-xs px-1 py-0">
              !
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge className={cn("text-xs", categoryColorClass)}>
            {task.category}
          </Badge>
          {task.childName && (
            <span className="text-xs text-muted-foreground">
              {task.childName}
            </span>
          )}
        </div>
      </div>

      {task.isCompleted && (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
      )}

      {isLoading && (
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
    </div>
  )
}
