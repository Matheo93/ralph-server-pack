import { z } from "zod"

// Event type enum
export const EventTypeEnum = z.enum([
  "general",
  "medical",
  "school",
  "activity",
  "birthday",
  "reminder",
])

export type EventType = z.infer<typeof EventTypeEnum>

// Recurrence enum
export const RecurrenceEnum = z.enum([
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
])

export type Recurrence = z.infer<typeof RecurrenceEnum>

// Event colors with semantic meaning
export const EVENT_COLORS = {
  primary: "#6366f1", // Indigo - General
  medical: "#ef4444", // Red - Medical
  school: "#3b82f6", // Blue - School
  activity: "#22c55e", // Green - Activity
  birthday: "#f59e0b", // Amber - Birthday
  reminder: "#8b5cf6", // Violet - Reminder
} as const

// Calendar event creation schema
export const CalendarEventCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Le titre est requis")
    .max(255, "Le titre ne peut pas dépasser 255 caractères"),
  description: z
    .string()
    .max(1000, "La description ne peut pas dépasser 1000 caractères")
    .nullable()
    .optional(),
  start_date: z
    .string()
    .datetime({ message: "Format de date invalide" }),
  end_date: z
    .string()
    .datetime({ message: "Format de date invalide" })
    .nullable()
    .optional(),
  all_day: z.boolean().default(false),
  recurrence: RecurrenceEnum.default("none"),
  recurrence_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Format de couleur invalide")
    .default("#6366f1"),
  assigned_to: z.string().uuid("ID d'utilisateur invalide").nullable().optional(),
  child_id: z.string().uuid("ID d'enfant invalide").nullable().optional(),
  event_type: EventTypeEnum.default("general"),
  location: z
    .string()
    .max(500, "L'adresse ne peut pas dépasser 500 caractères")
    .nullable()
    .optional(),
  reminder_minutes: z.number().int().min(0).max(10080).default(30), // Max 7 jours
})

export type CalendarEventCreateInput = z.infer<typeof CalendarEventCreateSchema>

// Calendar event update schema
export const CalendarEventUpdateSchema = CalendarEventCreateSchema.partial().extend({
  id: z.string().uuid("ID d'événement invalide"),
})

export type CalendarEventUpdateInput = z.infer<typeof CalendarEventUpdateSchema>

// Calendar event filter schema
export const CalendarEventFilterSchema = z.object({
  start_date: z.string().datetime({ message: "Format de date invalide" }),
  end_date: z.string().datetime({ message: "Format de date invalide" }),
  event_type: EventTypeEnum.nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  child_id: z.string().uuid().nullable().optional(),
})

export type CalendarEventFilter = z.infer<typeof CalendarEventFilterSchema>

// Calendar event history filter schema with pagination
export const CalendarEventHistoryFilterSchema = z.object({
  event_type: EventTypeEnum.nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  child_id: z.string().uuid().nullable().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
})

export type CalendarEventHistoryFilter = z.infer<typeof CalendarEventHistoryFilterSchema>

// Helper function to get color by event type
export function getEventColor(eventType: EventType): string {
  const colorMap: Record<EventType, string> = {
    general: EVENT_COLORS.primary,
    medical: EVENT_COLORS.medical,
    school: EVENT_COLORS.school,
    activity: EVENT_COLORS.activity,
    birthday: EVENT_COLORS.birthday,
    reminder: EVENT_COLORS.reminder,
  }
  return colorMap[eventType] ?? EVENT_COLORS.primary
}

// Event type labels in French
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  general: "Général",
  medical: "Rendez-vous médical",
  school: "École",
  activity: "Activité",
  birthday: "Anniversaire",
  reminder: "Rappel",
}

// Recurrence labels in French
export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Aucune",
  daily: "Tous les jours",
  weekly: "Toutes les semaines",
  monthly: "Tous les mois",
  yearly: "Tous les ans",
}
