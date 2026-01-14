import { z } from "zod"

// Task categories matching MASTER_PROMPT.md
export const TaskCategoryEnum = z.enum([
  "ecole",
  "sante",
  "administratif",
  "quotidien",
  "social",
  "activites",
  "logistique",
])

export type TaskCategory = z.infer<typeof TaskCategoryEnum>

// Task status enum
export const TaskStatusEnum = z.enum([
  "pending",
  "done",
  "postponed",
  "cancelled",
])

export type TaskStatus = z.infer<typeof TaskStatusEnum>

// Task priority enum
export const TaskPriorityEnum = z.enum([
  "high",
  "normal",
  "low",
])

export type TaskPriority = z.infer<typeof TaskPriorityEnum>

// Task source enum
export const TaskSourceEnum = z.enum([
  "manual",
  "vocal",
  "auto",
])

export type TaskSource = z.infer<typeof TaskSourceEnum>

// Recurrence rule schema
export const RecurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive().default(1),
  byDayOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
  byDayOfMonth: z.array(z.number().min(1).max(31)).optional(),
  byMonth: z.array(z.number().min(1).max(12)).optional(),
  endDate: z.string().datetime().optional(),
  count: z.number().int().positive().optional(),
}).nullable()

export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>

// Task creation schema
export const TaskCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Le titre est requis")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  description: z
    .string()
    .max(1000, "La description ne peut pas dépasser 1000 caractères")
    .nullable()
    .optional(),
  category_id: z.string().uuid("ID de catégorie invalide").nullable().optional(),
  child_id: z.string().uuid("ID d'enfant invalide").nullable().optional(),
  assigned_to: z.string().uuid("ID d'utilisateur invalide").nullable().optional(),
  deadline: z
    .string()
    .datetime({ message: "Format de date invalide" })
    .nullable()
    .optional(),
  deadline_flexible: z.boolean().default(true),
  priority: TaskPriorityEnum.default("normal"),
  load_weight: z.number().int().min(1).max(10).default(1),
  is_critical: z.boolean().default(false),
  recurrence_rule: RecurrenceRuleSchema.optional(),
  source: TaskSourceEnum.default("manual"),
  vocal_transcript: z.string().nullable().optional(),
  vocal_audio_url: z.string().url().nullable().optional(),
})

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>

// Task update schema (partial)
export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  id: z.string().uuid("ID de tâche invalide"),
})

export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>

// Task status update schema
export const TaskStatusUpdateSchema = z.object({
  id: z.string().uuid("ID de tâche invalide"),
  status: TaskStatusEnum,
  completed_at: z.string().datetime().nullable().optional(),
  postponed_to: z.string().datetime().nullable().optional(),
})

export type TaskStatusUpdateInput = z.infer<typeof TaskStatusUpdateSchema>

// Task filter schema for querying
export const TaskFilterSchema = z.object({
  household_id: z.string().uuid().optional(),
  child_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  status: z.array(TaskStatusEnum).optional(),
  priority: z.array(TaskPriorityEnum).optional(),
  source: z.array(TaskSourceEnum).optional(),
  is_critical: z.boolean().optional(),
  deadline_from: z.string().datetime().optional(),
  deadline_to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(["deadline", "priority", "created_at", "updated_at"]).default("deadline"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
})

export type TaskFilter = z.infer<typeof TaskFilterSchema>

// Task reassignment schema
export const TaskReassignSchema = z.object({
  id: z.string().uuid("ID de tâche invalide"),
  assigned_to: z.string().uuid("ID d'utilisateur invalide").nullable(),
})

export type TaskReassignInput = z.infer<typeof TaskReassignSchema>

// Task postpone schema
export const TaskPostponeSchema = z.object({
  id: z.string().uuid("ID de tâche invalide"),
  new_deadline: z
    .string()
    .datetime({ message: "Format de date invalide" })
    .refine((date) => new Date(date) > new Date(), {
      message: "La nouvelle deadline doit être dans le futur",
    }),
})

export type TaskPostponeInput = z.infer<typeof TaskPostponeSchema>

// Category weight mapping (from MASTER_PROMPT.md)
export const CATEGORY_WEIGHTS: Record<string, number> = {
  administratif: 3,
  sante: 5,
  ecole: 4,
  quotidien: 1,
  social: 6,
  activites: 2,
  logistique: 2,
}

// Helper function to get default weight by category
export function getDefaultWeight(categoryCode: string): number {
  return CATEGORY_WEIGHTS[categoryCode] ?? 1
}
