/**
 * Task Catalog Types
 *
 * Type definitions for task templates and catalog system.
 */

import { z } from "zod"

// =============================================================================
// AGE RANGES
// =============================================================================

export const AGE_RANGES = [
  "0-3",   // Nourrisson / Tout-petit
  "3-6",   // Maternelle
  "6-11",  // Primaire
  "11-15", // Collège
  "15-18", // Lycée
] as const

export type AgeRange = (typeof AGE_RANGES)[number]

// =============================================================================
// PERIODS
// =============================================================================

export const PERIODS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
  "rentree",      // Sept-Oct
  "vacances_ete", // Juil-Aout
  "vacances_noel", // Dec-Jan
  "toussaint",    // Oct-Nov
  "hiver",        // Fev
  "printemps",    // Avr
  "tout",         // All year
] as const

export type Period = (typeof PERIODS)[number]

// =============================================================================
// CATEGORIES
// =============================================================================

export const TASK_CATEGORIES = [
  "ecole",
  "sante",
  "administratif",
  "quotidien",
  "social",
  "activites",
  "logistique",
  "autre",
] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]

// =============================================================================
// RECURRENCE
// =============================================================================

export const RECURRENCE_TYPES = [
  "once",       // One-time task
  "daily",      // Every day
  "weekly",     // Every week
  "monthly",    // Every month
  "yearly",     // Every year
  "seasonal",   // At specific periods
] as const

export type RecurrenceType = (typeof RECURRENCE_TYPES)[number]

// =============================================================================
// TASK TEMPLATE
// =============================================================================

export const TaskTemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  category: z.enum(TASK_CATEGORIES),

  // Age applicability
  ageRanges: z.array(z.enum(AGE_RANGES)),

  // Time applicability
  periods: z.array(z.enum(PERIODS)),
  recurrence: z.enum(RECURRENCE_TYPES),

  // Load weight (1-5)
  weight: z.number().min(1).max(5),

  // Estimated time in minutes
  estimatedMinutes: z.number().min(5).max(480).optional(),

  // Priority suggestion (1-3)
  suggestedPriority: z.number().min(1).max(3),

  // Tags for search
  tags: z.array(z.string()).optional(),

  // Whether this is a critical task (cannot be skipped)
  critical: z.boolean().default(false),
})

export type TaskTemplate = z.infer<typeof TaskTemplateSchema>

// =============================================================================
// TASK SUGGESTION
// =============================================================================

export const TaskSuggestionSchema = z.object({
  template: TaskTemplateSchema,
  childId: z.string().uuid().optional(),
  childName: z.string().optional(),
  relevanceScore: z.number().min(0).max(1),
  reason: z.string(),
  suggestedDueDate: z.string().optional(),
})

export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>

// =============================================================================
// CATALOG FILTERS
// =============================================================================

export interface CatalogFilters {
  ageRanges?: AgeRange[]
  periods?: Period[]
  categories?: TaskCategory[]
  search?: string
  recurrence?: RecurrenceType[]
  minWeight?: number
  maxWeight?: number
  critical?: boolean
}

// =============================================================================
// CHILD INFO FOR SUGGESTIONS
// =============================================================================

export interface ChildInfo {
  id: string
  name: string
  birthDate: Date
  ageInYears: number
  ageRange: AgeRange
}

// =============================================================================
// GENERATED TASK
// =============================================================================

export interface GeneratedTask {
  templateId: string
  title: string
  description?: string
  category: TaskCategory
  priority: number
  weight: number
  childId?: string
  suggestedDueDate?: Date
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate age range from birth date
 */
export function getAgeRange(birthDate: Date): AgeRange {
  const now = new Date()
  const ageInYears = Math.floor(
    (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )

  if (ageInYears < 3) return "0-3"
  if (ageInYears < 6) return "3-6"
  if (ageInYears < 11) return "6-11"
  if (ageInYears < 15) return "11-15"
  return "15-18"
}

/**
 * Calculate age in years from birth date
 */
export function getAgeInYears(birthDate: Date): number {
  const now = new Date()
  return Math.floor(
    (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
}

/**
 * Get current period based on month
 */
export function getCurrentPeriod(): Period {
  const month = new Date().getMonth()

  switch (month) {
    case 0: return "janvier"
    case 1: return "fevrier"
    case 2: return "mars"
    case 3: return "avril"
    case 4: return "mai"
    case 5: return "juin"
    case 6: return "juillet"
    case 7: return "aout"
    case 8: return "septembre"
    case 9: return "octobre"
    case 10: return "novembre"
    case 11: return "decembre"
    default: return "tout"
  }
}

/**
 * Get applicable special periods based on current date
 */
export function getSpecialPeriods(): Period[] {
  const month = new Date().getMonth()
  const periods: Period[] = [getCurrentPeriod(), "tout"]

  // Special periods
  if (month === 8 || month === 9) periods.push("rentree")
  if (month === 6 || month === 7) periods.push("vacances_ete")
  if (month === 11 || month === 0) periods.push("vacances_noel")
  if (month === 9 || month === 10) periods.push("toussaint")
  if (month === 1) periods.push("hiver")
  if (month === 3) periods.push("printemps")

  return periods
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: TaskCategory): string {
  const names: Record<TaskCategory, string> = {
    ecole: "École",
    sante: "Santé",
    administratif: "Administratif",
    quotidien: "Quotidien",
    social: "Social",
    activites: "Activités",
    logistique: "Logistique",
    autre: "Autre",
  }
  return names[category]
}

/**
 * Get display name for age range
 */
export function getAgeRangeDisplayName(range: AgeRange): string {
  const names: Record<AgeRange, string> = {
    "0-3": "0-3 ans (Nourrisson)",
    "3-6": "3-6 ans (Maternelle)",
    "6-11": "6-11 ans (Primaire)",
    "11-15": "11-15 ans (Collège)",
    "15-18": "15-18 ans (Lycée)",
  }
  return names[range]
}

/**
 * Get display name for period
 */
export function getPeriodDisplayName(period: Period): string {
  const names: Record<Period, string> = {
    janvier: "Janvier",
    fevrier: "Février",
    mars: "Mars",
    avril: "Avril",
    mai: "Mai",
    juin: "Juin",
    juillet: "Juillet",
    aout: "Août",
    septembre: "Septembre",
    octobre: "Octobre",
    novembre: "Novembre",
    decembre: "Décembre",
    rentree: "Rentrée scolaire",
    vacances_ete: "Vacances d'été",
    vacances_noel: "Vacances de Noël",
    toussaint: "Toussaint",
    hiver: "Vacances d'hiver",
    printemps: "Vacances de printemps",
    tout: "Toute l'année",
  }
  return names[period]
}
