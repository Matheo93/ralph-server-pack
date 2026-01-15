import { z } from "zod"
import { TaskCategoryEnum } from "./task"

// =============================================
// ENUMS - Template Specific
// =============================================

/**
 * Groupes d'âge valides
 */
export const AgeGroupEnum = z.enum([
  "0-3",
  "3-6",
  "6-11",
  "11-15",
  "15-18",
  "18-25",
])

export type AgeGroup = z.infer<typeof AgeGroupEnum>

/**
 * Périodes de l'année
 */
export const PeriodTypeEnum = z.enum([
  "rentree",
  "toussaint",
  "noel",
  "hiver",
  "printemps",
  "ete",
  "year_round",
])

export type PeriodType = z.infer<typeof PeriodTypeEnum>

/**
 * Statut d'une tâche générée
 */
export const GeneratedTaskStatusEnum = z.enum([
  "pending",
  "created",
  "skipped",
  "expired",
])

export type GeneratedTaskStatus = z.infer<typeof GeneratedTaskStatusEnum>

/**
 * Pays supportés (ISO 2)
 */
export const CountryCodeEnum = z.enum([
  "FR", // France
  "BE", // Belgique
  "CH", // Suisse
  "CA", // Canada
  "LU", // Luxembourg
])

export type CountryCode = z.infer<typeof CountryCodeEnum>

// =============================================
// CRON RULE VALIDATION
// =============================================

/**
 * Patterns cron valides
 */
const cronPatternRegex = /^(@yearly|@monthly|@weekly|@daily|(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+))$/

export const CronRuleSchema = z
  .string()
  .regex(cronPatternRegex, {
    message:
      "Format cron invalide. Utilisez @yearly, @monthly, @weekly, @daily ou 'minute hour day month weekday'",
  })
  .nullable()

// =============================================
// TASK TEMPLATE SCHEMAS
// =============================================

/**
 * Schema complet d'un template
 */
export const TaskTemplateSchema = z.object({
  id: z.string().uuid(),
  country: z.string().length(2).default("FR"),
  age_min: z.number().int().min(0).max(25),
  age_max: z.number().int().min(0).max(25),
  category: z.string().min(1),
  subcategory: z.string().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  cron_rule: CronRuleSchema,
  weight: z.number().int().min(1).max(10).default(3),
  days_before_deadline: z.number().int().min(0).max(90).default(7),
  period: PeriodTypeEnum.nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).refine((data) => data.age_min <= data.age_max, {
  message: "age_min doit être inférieur ou égal à age_max",
  path: ["age_min"],
})

export type TaskTemplateType = z.infer<typeof TaskTemplateSchema>

/**
 * Schema pour création de template
 */
export const TaskTemplateCreateSchema = z.object({
  country: z.string().length(2).default("FR"),
  age_min: z.number().int().min(0).max(25),
  age_max: z.number().int().min(0).max(25),
  category: z.string().min(1),
  subcategory: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  cron_rule: CronRuleSchema.optional(),
  weight: z.number().int().min(1).max(10).default(3),
  days_before_deadline: z.number().int().min(0).max(90).default(7),
  period: PeriodTypeEnum.nullable().optional(),
  is_active: z.boolean().default(true),
}).refine((data) => data.age_min <= data.age_max, {
  message: "age_min doit être inférieur ou égal à age_max",
  path: ["age_min"],
})

export type TaskTemplateCreateInput = z.infer<typeof TaskTemplateCreateSchema>

/**
 * Schema pour mise à jour de template (sans .partial() car refine() ne le supporte pas)
 */
export const TaskTemplateUpdateSchema = z.object({
  id: z.string().uuid(),
  country: z.string().length(2).optional(),
  age_min: z.number().int().min(0).max(25).optional(),
  age_max: z.number().int().min(0).max(25).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  cron_rule: CronRuleSchema.optional(),
  weight: z.number().int().min(1).max(10).optional(),
  days_before_deadline: z.number().int().min(0).max(90).optional(),
  period: PeriodTypeEnum.nullable().optional(),
  is_active: z.boolean().optional(),
})

export type TaskTemplateUpdateInput = z.infer<typeof TaskTemplateUpdateSchema>

/**
 * Schema pour filtrer les templates
 */
export const TaskTemplateFilterSchema = z.object({
  country: z.string().length(2).optional(),
  age: z.number().int().min(0).max(25).optional(), // Âge exact
  age_group: AgeGroupEnum.optional(), // Groupe d'âge
  category: z.string().optional(),
  subcategory: z.string().optional(),
  period: PeriodTypeEnum.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().positive().max(200).default(100),
  offset: z.number().int().nonnegative().default(0),
})

export type TaskTemplateFilterInput = z.infer<typeof TaskTemplateFilterSchema>

// =============================================
// GENERATED TASK SCHEMAS
// =============================================

/**
 * Schema d'une tâche générée
 */
export const GeneratedTaskSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  child_id: z.string().uuid(),
  household_id: z.string().uuid(),
  task_id: z.string().uuid().nullable(),
  generated_at: z.string().datetime(),
  deadline: z.string(), // Date ISO
  status: GeneratedTaskStatusEnum,
  acknowledged: z.boolean(),
  acknowledged_at: z.string().datetime().nullable(),
  acknowledged_by: z.string().uuid().nullable(),
  generation_key: z.string().min(1),
})

export type GeneratedTaskType = z.infer<typeof GeneratedTaskSchema>

/**
 * Schema pour création de tâche générée
 */
export const GeneratedTaskCreateSchema = z.object({
  template_id: z.string().uuid(),
  child_id: z.string().uuid(),
  household_id: z.string().uuid(),
  deadline: z.string(),
  generation_key: z.string().min(1),
})

export type GeneratedTaskCreateInput = z.infer<typeof GeneratedTaskCreateSchema>

/**
 * Schema pour acknowledge une tâche générée
 */
export const GeneratedTaskAcknowledgeSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["create", "skip"]),
})

export type GeneratedTaskAcknowledgeInput = z.infer<typeof GeneratedTaskAcknowledgeSchema>

// =============================================
// HOUSEHOLD TEMPLATE SETTINGS SCHEMAS
// =============================================

/**
 * Schema des paramètres de template par foyer
 */
export const HouseholdTemplateSettingsSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  template_id: z.string().uuid(),
  is_enabled: z.boolean(),
  custom_days_before: z.number().int().min(0).max(90).nullable(),
  custom_weight: z.number().int().min(1).max(10).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type HouseholdTemplateSettingsType = z.infer<typeof HouseholdTemplateSettingsSchema>

/**
 * Schema pour toggle un template
 */
export const TemplateToggleSchema = z.object({
  template_id: z.string().uuid(),
  is_enabled: z.boolean(),
})

export type TemplateToggleInput = z.infer<typeof TemplateToggleSchema>

/**
 * Schema pour personnaliser un template
 */
export const TemplateCustomizeSchema = z.object({
  template_id: z.string().uuid(),
  custom_days_before: z.number().int().min(0).max(90).nullable().optional(),
  custom_weight: z.number().int().min(1).max(10).nullable().optional(),
})

export type TemplateCustomizeInput = z.infer<typeof TemplateCustomizeSchema>

// =============================================
// CALENDAR PREVIEW SCHEMAS
// =============================================

/**
 * Schema pour prévisualisation du calendrier
 */
export const CalendarPreviewRequestSchema = z.object({
  household_id: z.string().uuid(),
  months: z.number().int().min(1).max(12).default(3),
  include_completed: z.boolean().default(false),
})

export type CalendarPreviewRequestInput = z.infer<typeof CalendarPreviewRequestSchema>

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Convertit un groupe d'âge en min/max
 */
export function ageGroupToRange(group: AgeGroup): { min: number; max: number } {
  const ranges: Record<AgeGroup, { min: number; max: number }> = {
    "0-3": { min: 0, max: 3 },
    "3-6": { min: 3, max: 6 },
    "6-11": { min: 6, max: 11 },
    "11-15": { min: 11, max: 15 },
    "15-18": { min: 15, max: 18 },
    "18-25": { min: 18, max: 25 },
  }
  return ranges[group]
}

/**
 * Détermine le groupe d'âge pour un âge donné
 */
export function getAgeGroup(age: number): AgeGroup | null {
  if (age >= 0 && age < 3) return "0-3"
  if (age >= 3 && age < 6) return "3-6"
  if (age >= 6 && age < 11) return "6-11"
  if (age >= 11 && age < 15) return "11-15"
  if (age >= 15 && age < 18) return "15-18"
  if (age >= 18 && age <= 25) return "18-25"
  return null
}

/**
 * Vérifie si un âge correspond à un template
 */
export function isAgeInRange(age: number, ageMin: number, ageMax: number): boolean {
  return age >= ageMin && age <= ageMax
}

/**
 * Parse une règle cron en composants
 */
export function parseCronRule(rule: string | null): {
  isPattern: boolean
  pattern?: string
  minute?: string
  hour?: string
  dayOfMonth?: string
  month?: string
  dayOfWeek?: string
} | null {
  if (!rule) return null

  // Patterns spéciaux
  if (rule.startsWith("@")) {
    return { isPattern: true, pattern: rule }
  }

  // Format standard
  const parts = rule.split(" ")
  if (parts.length !== 5) return null

  return {
    isPattern: false,
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  }
}

/**
 * Génère une clé unique pour éviter les doublons
 */
export function generateGenerationKey(
  templateId: string,
  date: Date
): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${templateId}-${year}-${month}`
}

/**
 * Génère une clé annuelle
 */
export function generateYearlyKey(
  templateId: string,
  year: number
): string {
  return `${templateId}-${year}`
}
