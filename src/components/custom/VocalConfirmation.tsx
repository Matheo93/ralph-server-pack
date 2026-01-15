"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { TaskPriorityBadge } from "./TaskPriorityBadge"

interface VocalTask {
  title: string
  description: string | null
  child_id: string | null
  child_name: string | null
  category_code: string
  category_id: string | null
  priority: "critical" | "high" | "normal" | "low"
  deadline: string | null
  vocal_transcript: string
  confidence_score: number
}

interface VocalConfirmationProps {
  task: VocalTask
  transcript: string
  onConfirm: () => Promise<{ success: boolean; taskId?: string }>
  onCancel: () => void
  onEdit?: (updatedTask: VocalTask) => void
}

export function VocalConfirmation({
  task,
  transcript,
  onConfirm,
  onCancel,
  onEdit,
}: VocalConfirmationProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)

  const handleConfirm = () => {
    startTransition(async () => {
      if (isEditing && onEdit) {
        onEdit({ ...task, title: editedTitle })
      }
      await onConfirm()
    })
  }

  const confidencePercentage = Math.round(task.confidence_score * 100)
  const confidenceColor =
    task.confidence_score >= 0.8
      ? "text-green-600"
      : task.confidence_score >= 0.5
        ? "text-yellow-600"
        : "text-red-600"

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "Pas de deadline"

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nouvelle tâche vocale</span>
          <Badge variant="outline" className={confidenceColor}>
            {confidencePercentage}% confiance
          </Badge>
        </CardTitle>
        <CardDescription className="italic">
          &quot;{transcript}&quot;
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <TaskCategoryIcon code={task.category_code} />
              <div className="flex-1">
                <p className="font-medium">{task.title}</p>
                {task.child_name && (
                  <p className="text-sm text-muted-foreground">
                    Pour: {task.child_name}
                  </p>
                )}
              </div>
              <TaskPriorityBadge priority={task.priority} />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deadline:</span>
              <span>{formattedDeadline}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1"
          >
            Annuler
          </Button>
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
            >
              Modifier
            </Button>
          )}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              OK
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? "Création..." : "Confirmer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
