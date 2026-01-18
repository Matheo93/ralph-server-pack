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
import { Gift, Sparkles, Coins } from "lucide-react"
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
  { value: "none", label: "Pas de récurrence" },
  { value: "daily", label: "Tous les jours" },
  { value: "weekly", label: "Toutes les semaines" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Tous les mois" },
  { value: "custom", label: "Personnalisé..." },
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
    reward_type: ((task as unknown as Record<string, unknown>)?.["reward_type"] as "xp" | "immediate") ?? "xp",
    reward_immediate_text: ((task as unknown as Record<string, unknown>)?.["reward_immediate_text"] as string) ?? "",
    reward_xp_override: (task as unknown as Record<string, unknown>)?.["reward_xp_override"] as number | null ?? null,
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

  const calculatedXp = formData.reward_xp_override ?? formData.load_weight * 5

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
        ...(formData.child_id && {
          reward_type: formData.reward_type,
          reward_immediate_text: formData.reward_type === "immediate" ? formData.reward_immediate_text : null,
          reward_xp_override: formData.reward_xp_override,
        }),
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

          {/* Reward Section - Only show when a child is selected */}
          {formData.child_id && (
            <div className="space-y-4 p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                <Label className="text-purple-800 font-semibold">Récompense pour l&apos;enfant</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, reward_type: "xp" }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.reward_type === "xp"
                      ? "border-purple-500 bg-purple-100 shadow-md"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Coins className="h-8 w-8 text-yellow-500" />
                    <span className="font-medium">Points XP</span>
                    <span className="text-sm text-muted-foreground">
                      +{calculatedXp} XP
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, reward_type: "immediate" }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.reward_type === "immediate"
                      ? "border-purple-500 bg-purple-100 shadow-md"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="h-8 w-8 text-pink-500" />
                    <span className="font-medium">Secret</span>
                    <span className="text-sm text-muted-foreground">
                      Coffre au trésor
                    </span>
                  </div>
                </button>
              </div>

              {/* Immediate reward text input */}
              {formData.reward_type === "immediate" && (
                <div className="space-y-2">
                  <Label htmlFor="reward_text" className="text-purple-800">
                    Récompense secrète *
                  </Label>
                  <Textarea
                    id="reward_text"
                    value={formData.reward_immediate_text}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reward_immediate_text: e.target.value,
                      }))
                    }
                    placeholder="Ex: Code WiFi: FAMILLE2024 ou Tu peux regarder 30min de dessins animés!"
                    rows={2}
                    className="bg-white"
                  />
                  <p className="text-xs text-purple-600">
                    Ce texte sera révélé dans un coffre au trésor après validation!
                  </p>
                </div>
              )}

              {/* XP override option */}
              {formData.reward_type === "xp" && (
                <div className="flex items-center gap-4">
                  <Label className="text-purple-800 text-sm">XP personnalisé:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.reward_xp_override ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reward_xp_override: e.target.value ? parseInt(e.target.value, 10) : null,
                        }))
                      }
                      placeholder={String(formData.load_weight * 5)}
                      className="w-20 bg-white"
                    />
                    <span className="text-sm text-muted-foreground">
                      (défaut: {formData.load_weight * 5})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Deadline</Label>
            {/* Quick date buttons */}
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                type="button"
                variant={formData.deadline?.toDateString() === new Date().toDateString() ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const today = new Date()
                  today.setHours(23, 59, 59, 999)
                  setFormData((prev) => ({ ...prev, deadline: today }))
                }}
              >
                Aujourd&apos;hui
              </Button>
              <Button
                type="button"
                variant={(() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  return formData.deadline?.toDateString() === tomorrow.toDateString() ? "default" : "outline"
                })()}
                size="sm"
                onClick={() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  tomorrow.setHours(23, 59, 59, 999)
                  setFormData((prev) => ({ ...prev, deadline: tomorrow }))
                }}
              >
                Demain
              </Button>
              <Button
                type="button"
                variant={(() => {
                  const nextWeek = new Date()
                  nextWeek.setDate(nextWeek.getDate() + 7)
                  return formData.deadline?.toDateString() === nextWeek.toDateString() ? "default" : "outline"
                })()}
                size="sm"
                onClick={() => {
                  const nextWeek = new Date()
                  nextWeek.setDate(nextWeek.getDate() + 7)
                  nextWeek.setHours(23, 59, 59, 999)
                  setFormData((prev) => ({ ...prev, deadline: nextWeek }))
                }}
              >
                Dans 1 semaine
              </Button>
            </div>
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
                  : "Autre date..."}
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
              <Label>Récurrence</Label>
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
                    <Label className="text-sm">Fréquence</Label>
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
