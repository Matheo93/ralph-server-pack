"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createTask, updateTask } from "@/lib/actions/tasks"
import type { TaskWithRelations } from "@/types/task"

interface Child {
  id: string
  first_name: string
}

interface Category {
  id: string
  code: string
  name_fr: string
}

interface TaskFormProps {
  children: Child[]
  categories: Category[]
  task?: TaskWithRelations | null
  mode?: "create" | "edit"
}

const priorityOptions = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
]

export function TaskForm({
  children,
  categories,
  task,
  mode = "create",
}: TaskFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  const [formData, setFormData] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    child_id: task?.child_id ?? "",
    category_id: task?.category_id ?? "",
    priority: task?.priority ?? "normal",
    deadline: task?.deadline ? new Date(task.deadline) : undefined as Date | undefined,
    deadline_flexible: task?.deadline_flexible ?? true,
    is_critical: task?.is_critical ?? false,
    load_weight: task?.load_weight ?? 3,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const data = {
        title: formData.title,
        description: formData.description || null,
        child_id: formData.child_id || null,
        category_id: formData.category_id || null,
        priority: formData.priority as "low" | "normal" | "high" | "critical",
        deadline: formData.deadline?.toISOString() ?? null,
        deadline_flexible: formData.deadline_flexible,
        is_critical: formData.is_critical,
        load_weight: formData.load_weight,
      }

      let result
      if (mode === "edit" && task) {
        result = await updateTask({ id: task.id, ...data })
      } else {
        result = await createTask(data)
      }

      if (result.success) {
        router.push("/tasks")
      } else {
        setError(result.error ?? "Une erreur est survenue")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Modifier la tâche" : "Nouvelle tâche"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ex: Remplir le dossier d'inscription"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Détails supplémentaires..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.length > 0 && (
              <div className="space-y-2">
                <Label>Enfant concerné</Label>
                <Select
                  value={formData.child_id || "none"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      child_id: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un enfant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun enfant</SelectItem>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune catégorie</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, priority: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Poids (charge mentale)</Label>
              <Select
                value={String(formData.load_weight)}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    load_weight: parseInt(v, 10),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {w} {w === 1 ? "(faible)" : w >= 8 ? "(lourd)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                {formData.deadline
                  ? formData.deadline.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })
                  : "Choisir une date"}
              </Button>
              {formData.deadline && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, deadline: undefined }))
                  }
                >
                  Effacer
                </Button>
              )}
            </div>
            {showCalendar && (
              <Calendar
                mode="single"
                selected={formData.deadline}
                onSelect={(date) => {
                  setFormData((prev) => ({ ...prev, deadline: date }))
                  setShowCalendar(false)
                }}
                className="rounded-md border mt-2"
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.deadline_flexible}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deadline_flexible: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <span className="text-sm">Deadline flexible</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_critical}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_critical: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <span className="text-sm">Tâche critique (casse le streak)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "..."
                : mode === "edit"
                  ? "Enregistrer"
                  : "Créer la tâche"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
