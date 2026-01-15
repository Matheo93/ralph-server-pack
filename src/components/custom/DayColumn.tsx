"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TaskListItem } from "@/types/task"
import Link from "next/link"

interface DayColumnProps {
  date: Date
  tasks: TaskListItem[]
  isToday: boolean
  onTaskDrop?: (taskId: string, newDate: string) => void
  onAddTask?: (date: string) => void
}

function TaskItem({
  task,
  onDragStart,
}: {
  task: TaskListItem
  onDragStart: (e: React.DragEvent, taskId: string) => void
}) {
  const priorityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-gray-400",
  }

  return (
    <Link
      href={`/tasks/${task.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="block p-2 border rounded-md bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="flex items-start gap-2">
        <div
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
            priorityColors[task.priority] || "bg-gray-400"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {task.category_name && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                {task.category_name}
              </Badge>
            )}
            {task.is_critical && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Critique
              </Badge>
            )}
            {task.child_name && (
              <span className="text-xs text-muted-foreground">
                {task.child_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function DayColumn({
  date,
  tasks,
  isToday,
  onTaskDrop,
  onAddTask,
}: DayColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" })
  const dayNumber = date.getDate()
  const monthName = date.toLocaleDateString("fr-FR", { month: "short" })
  const dateStr = date.toISOString().split("T")[0] ?? ""

  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled")
  const criticalCount = pendingTasks.filter((t) => t.is_critical).length

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData("taskId")
    if (taskId && onTaskDrop) {
      onTaskDrop(taskId, dateStr)
    }
  }

  return (
    <div
      className={`flex flex-col min-w-[160px] md:min-w-[200px] border rounded-lg ${
        isToday ? "border-primary bg-primary/5" : "bg-card"
      } ${isDragOver ? "ring-2 ring-primary" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={`p-3 border-b ${isToday ? "bg-primary/10" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase">{dayName}</p>
            <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
              {dayNumber} {monthName}
            </p>
          </div>
          <div className="flex gap-1">
            {pendingTasks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingTasks.length}
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px]">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onDragStart={handleDragStart}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune tâche
          </p>
        )}
      </div>

      {/* Add button */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => onAddTask?.(dateStr)}
        >
          <svg
            className="w-3 h-3 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Ajouter
        </Button>
      </div>
    </div>
  )
}
