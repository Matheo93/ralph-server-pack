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
import { RecurrencePreview } from "@/components/custom/RecurrencePreview"
import { FormError } from "@/components/custom/FormError"
import { createTask, updateTask } from "@/lib/actions/tasks"
import { reportError } from "@/lib/error-reporting"
import type { TaskWithRelations, RecurrenceRule } from "@/types/task"

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

const recurrenceOptions = [
  { value: "none", label: "Pas de recurrence" },
  { value: "daily", label: "Tous les jours" },
  { value: "weekly", label: "Toutes les semaines" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Tous les mois" },
  { value: "custom", label: "Personnalise..." },
]

const DAY_NAMES = [
  { value: 0, label: "Dim" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
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
  const [showRecurrence, setShowRecurrence] = useState(false)

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

  const [recurrenceType, setRecurrenceType] = useState<string>(
    task?.recurrence_rule ? "custom" : "none"
  )
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    task?.recurrence_rule ?? null
  )
  const [customRecurrence, setCustomRecurrence] = useState({
    frequency: task?.recurrence_rule?.frequency ?? "weekly" as "daily" | "weekly" | "monthly" | "yearly",
    interval: task?.recurrence_rule?.interval ?? 1,
    byDayOfWeek: task?.recurrence_rule?.byDayOfWeek ?? [] as number[],
    byDayOfMonth: task?.recurrence_rule?.byDayOfMonth ?? [] as number[],
  })

  const handleRecurrenceChange = (value: string) => {
    setRecurrenceType(value)

    switch (value) {
      case "none":
        setRecurrenceRule(null)
        break
      case "daily":
        setRecurrenceRule({ frequency: "daily", interval: 1 })
        break
      case "weekly":
        setRecurrenceRule({ frequency: "weekly", interval: 1 })
        break
      case "biweekly":
        setRecurrenceRule({ frequency: "weekly", interval: 2 })
        break
      case "monthly":
        setRecurrenceRule({ frequency: "monthly", interval: 1 })
        break
      case "custom":
        setShowRecurrence(true)
        updateCustomRecurrence()
        break
    }
  }

  const updateCustomRecurrence = () => {
    const rule: RecurrenceRule = {
      frequency: customRecurrence.frequency,
      interval: customRecurrence.interval,
    }
    if (customRecurrence.byDayOfWeek.length > 0) {
      rule.byDayOfWeek = customRecurrence.byDayOfWeek
    }
    if (customRecurrence.byDayOfMonth.length > 0) {
      rule.byDayOfMonth = customRecurrence.byDayOfMonth
    }
    setRecurrenceRule(rule)
  }

  const toggleDayOfWeek = (day: number) => {
    const newDays = customRecurrence.byDayOfWeek.includes(day)
      ? customRecurrence.byDayOfWeek.filter((d) => d !== day)
      : [...customRecurrence.byDayOfWeek, day].sort()
    setCustomRecurrence((prev) => ({ ...prev, byDayOfWeek: newDays }))
    setTimeout(updateCustomRecurrence, 0)
  }

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
        recurrence_rule: recurrenceRule,
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
        const errorMessage = result.error ?? "Une erreur est survenue"
        setError(errorMessage)
        reportError(new Error(errorMessage), {
          componentName: "TaskForm",
          action: mode === "edit" ? "updateTask" : "createTask",
        })
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
          <FormError
            error={error}
            variant="banner"
            onDismiss={() => setError(null)}
          />

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

          {/* Recurrence Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={recurrenceType} onValueChange={handleRecurrenceChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom recurrence options */}
            {recurrenceType === "custom" && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Frequence</Label>
                    <Select
                      value={customRecurrence.frequency}
                      onValueChange={(v) => {
                        setCustomRecurrence((prev) => ({
                          ...prev,
                          frequency: v as "daily" | "weekly" | "monthly" | "yearly",
                        }))
                        setTimeout(updateCustomRecurrence, 0)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Quotidien</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                        <SelectItem value="yearly">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Intervalle</Label>
                    <Select
                      value={String(customRecurrence.interval)}
                      onValueChange={(v) => {
                        setCustomRecurrence((prev) => ({
                          ...prev,
                          interval: parseInt(v, 10),
                        }))
                        setTimeout(updateCustomRecurrence, 0)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Tous les {n}{" "}
                            {customRecurrence.frequency === "daily"
                              ? "jour"
                              : customRecurrence.frequency === "weekly"
                                ? "semaine"
                                : customRecurrence.frequency === "monthly"
                                  ? "mois"
                                  : "an"}
                            {n > 1 && customRecurrence.frequency !== "monthly" ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Day of week selector for weekly */}
                {customRecurrence.frequency === "weekly" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Jours de la semaine</Label>
                    <div className="flex gap-1 flex-wrap">
                      {DAY_NAMES.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={
                            customRecurrence.byDayOfWeek.includes(day.value)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="w-10"
                          onClick={() => toggleDayOfWeek(day.value)}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day of month selector for monthly */}
                {customRecurrence.frequency === "monthly" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Jour du mois</Label>
                    <Select
                      value={String(customRecurrence.byDayOfMonth[0] ?? 1)}
                      onValueChange={(v) => {
                        setCustomRecurrence((prev) => ({
                          ...prev,
                          byDayOfMonth: [parseInt(v, 10)],
                        }))
                        setTimeout(updateCustomRecurrence, 0)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            Le {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {recurrenceRule && (
              <RecurrencePreview
                rule={recurrenceRule}
                startDate={formData.deadline || new Date()}
                className="mt-4"
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
