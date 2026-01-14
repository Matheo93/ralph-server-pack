"use client"

import { useState } from "react"
import { TaskCard } from "./TaskCard"
import { PostponeDialog } from "./PostponeDialog"
import type { TaskListItem, TasksByDate } from "@/types/task"

interface TaskListProps {
  tasks: TaskListItem[]
  groupByDate?: boolean
  emptyMessage?: string
}

function groupTasksByDate(tasks: TaskListItem[]): TasksByDate[] {
  const groups: Map<string, TaskListItem[]> = new Map()

  for (const task of tasks) {
    const dateKey = task.deadline ?? "no-date"
    const existing = groups.get(dateKey) ?? []
    existing.push(task)
    groups.set(dateKey, existing)
  }

  const result: TasksByDate[] = []

  // Sort groups by date
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "no-date") return 1
    if (b === "no-date") return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  for (const key of sortedKeys) {
    const tasksInGroup = groups.get(key) ?? []
    result.push({
      date: key,
      tasks: tasksInGroup,
      totalWeight: tasksInGroup.reduce((sum, t) => sum + t.load_weight, 0),
    })
  }

  return result
}

function formatGroupDate(dateStr: string): string {
  if (dateStr === "no-date") return "Sans date"

  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (taskDate.getTime() === today.getTime()) {
    return "Aujourd'hui"
  }
  if (taskDate.getTime() === tomorrow.getTime()) {
    return "Demain"
  }
  if (taskDate < today) {
    return "En retard"
  }

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function TaskList({ tasks, groupByDate = false, emptyMessage }: TaskListProps) {
  const [postponeTaskId, setPostponeTaskId] = useState<string | null>(null)

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage ?? "Aucune tâche"}
      </div>
    )
  }

  const handlePostpone = (taskId: string) => {
    setPostponeTaskId(taskId)
  }

  if (groupByDate) {
    const groups = groupTasksByDate(tasks)

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">
                {formatGroupDate(group.date)}
              </h3>
              <span className="text-sm text-muted-foreground">
                {group.tasks.length} tâche{group.tasks.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPostpone={handlePostpone}
                />
              ))}
            </div>
          </div>
        ))}
        <PostponeDialog
          taskId={postponeTaskId}
          onClose={() => setPostponeTaskId(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onPostpone={handlePostpone}
        />
      ))}
      <PostponeDialog
        taskId={postponeTaskId}
        onClose={() => setPostponeTaskId(null)}
      />
    </div>
  )
}
