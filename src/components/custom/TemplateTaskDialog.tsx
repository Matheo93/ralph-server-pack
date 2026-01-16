"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTask } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import type { TaskTemplate, TemplateWithSettings } from "@/types/template"
import type { Child } from "@/types/database"
import { CalendarIcon, Loader2 } from "lucide-react"

const createTaskFromTemplateSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]),
  child_id: z.string().optional(),
})

type FormData = z.infer<typeof createTaskFromTemplateSchema>

interface TemplateTaskDialogProps {
  template: TaskTemplate | TemplateWithSettings | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getDefaultDeadline(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split("T")[0] ?? ""
}

function getPriorityFromWeight(weight: number): "low" | "normal" | "high" | "critical" {
  if (weight <= 2) return "low"
  if (weight <= 4) return "normal"
  if (weight <= 6) return "high"
  return "critical"
}

export function TemplateTaskDialog({
  template,
  open,
  onOpenChange,
}: TemplateTaskDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [loadingChildren, setLoadingChildren] = useState(true)

  const form = useForm<FormData>({
    resolver: zodResolver(createTaskFromTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      priority: "normal",
      child_id: undefined,
    },
  })

  // Load children when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingChildren(true)
      getChildren()
        .then((data) => {
          setChildren(data)
          setLoadingChildren(false)
        })
        .catch(() => {
          setLoadingChildren(false)
        })
    }
  }, [open])

  // Reset form when template changes
  useEffect(() => {
    if (template && open) {
      const defaultDeadline = template.days_before_deadline
        ? getDefaultDeadline(template.days_before_deadline)
        : ""

      form.reset({
        title: template.title,
        description: template.description ?? "",
        deadline: defaultDeadline,
        priority: getPriorityFromWeight(template.weight),
        child_id: undefined,
      })
      setError(null)
    }
  }, [template, open, form])

  const onSubmit = (data: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await createTask({
        title: data.title,
        description: data.description ?? null,
        deadline: data.deadline || null,
        priority: data.priority,
        child_id: data.child_id || null,
        source: "manual",
        load_weight: template?.weight ?? 3,
        is_critical: false,
        deadline_flexible: true,
      })

      if (result.success) {
        onOpenChange(false)
        form.reset()
      } else {
        setError(result.error ?? "Erreur lors de la création de la tâche")
      }
    })
  }

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer une tâche</DialogTitle>
          <DialogDescription>
            Personnalisez la tâche avant de la créer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="Details supplementaires..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date limite</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="date" {...field} />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Priorité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="critical">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {children.length > 0 && (
              <FormField
                control={form.control}
                name="child_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enfant (optionnel)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      defaultValue={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un enfant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {children.filter((child) => child.id).map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.first_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {loadingChildren && (
              <p className="text-xs text-muted-foreground">
                Chargement des enfants...
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer la tâche"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
