"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DayColumn } from "./DayColumn"
import { moveTaskToDay } from "@/lib/actions/week"
import type { TaskListItem } from "@/types/task"

interface WeekViewProps {
  tasks: TaskListItem[]
  weekStart: string
  weekEnd: string
}

function getWeekDates(startDateStr: string): Date[] {
  const dates: Date[] = []
  const startDate = new Date(startDateStr)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  return dates
}

function groupTasksByDate(tasks: TaskListItem[]): Map<string, TaskListItem[]> {
  const grouped = new Map<string, TaskListItem[]>()

  for (const task of tasks) {
    if (!task.deadline) continue
    const dateKey = task.deadline.split("T")[0] ?? ""
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)?.push(task)
  }

  return grouped
}

export function WeekView({ tasks, weekStart }: WeekViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)
  const tasksByDate = groupTasksByDate(tasks)
  const today = new Date().toISOString().split("T")[0]

  const handlePreviousWeek = () => {
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const newStart = prevWeekStart.toISOString().split("T")[0]
    router.push(`/tasks/week?start=${newStart}`)
  }

  const handleNextWeek = () => {
    const nextWeekStart = new Date(weekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)
    const newStart = nextWeekStart.toISOString().split("T")[0]
    router.push(`/tasks/week?start=${newStart}`)
  }

  const handleToday = () => {
    router.push("/tasks/week")
  }

  const handleTaskDrop = (taskId: string, newDate: string) => {
    setError(null)
    startTransition(async () => {
      const result = await moveTaskToDay(taskId, newDate)
      if (!result.success && result.error) {
        setError(result.error)
      }
    })
  }

  const handleAddTask = (date: string) => {
    router.push(`/tasks/new?deadline=${date}`)
  }

  // Format week label
  const weekStartDate = new Date(weekStart)
  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekLabel = `${weekStartDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })} - ${weekEndDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousWeek}
            disabled={isPending}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {weekLabel}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextWeek}
            disabled={isPending}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
        <Button variant="outline" onClick={handleToday} disabled={isPending}>
          Aujourd&apos;hui
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Week grid */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {weekDates.map((date) => {
          const dateKey = date.toISOString().split("T")[0] ?? ""
          const dayTasks = tasksByDate.get(dateKey) || []

          return (
            <DayColumn
              key={dateKey}
              date={date}
              tasks={dayTasks}
              isToday={dateKey === today}
              onTaskDrop={handleTaskDrop}
              onAddTask={handleAddTask}
            />
          )
        })}
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  )
}
