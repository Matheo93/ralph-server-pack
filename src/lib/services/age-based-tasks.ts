/**
 * Age-Based Task Generation Service
 *
 * Ce service gère la génération automatique de tâches basée sur l'âge des enfants.
 * Il implémente le "catalogue automatique" du MASTER_PROMPT.
 *
 * Règles d'âge:
 * - 0-3 ans: Vaccins, visites PMI, mode de garde
 * - 3-6 ans: Inscription école, assurance scolaire, réunions
 * - 6-11 ans: Fournitures, cantine, études, sorties
 * - 11-15 ans: Orientation, brevet, activités ados
 * - 15-18 ans: Permis, bac, parcoursup
 */

import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { getTemplatesForAge, allTemplatesFR } from "@/lib/data/templates-fr"
import { generateGenerationKey } from "@/lib/validations/template"
import type {
  TaskTemplate,
  GeneratedTask,
  TaskGenerationResult,
  AgeGroup,
} from "@/types/template"

// =============================================================================
// TYPES
// =============================================================================

export interface Child {
  id: string
  first_name: string
  birthdate: string
  household_id: string
}

export interface ChildWithAge extends Child {
  age: number
  ageGroup: AgeGroup
  monthsOld: number
}

export interface AgeBasedTaskConfig {
  lookAheadDays?: number
  includeOneTime?: boolean
  includePeriodic?: boolean
}

export interface AgeBasedTaskResult {
  child: ChildWithAge
  applicableTemplates: TaskTemplate[]
  generatedCount: number
  skippedCount: number
  errors: string[]
}

export interface HouseholdAgeBasedResult {
  householdId: string
  results: AgeBasedTaskResult[]
  totalGenerated: number
  totalSkipped: number
  totalErrors: number
}

// =============================================================================
// AGE CALCULATION
// =============================================================================

/**
 * Calculate age in years from birthdate
 */
export function calculateAge(birthdate: string): number {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(0, age)
}

/**
 * Calculate age in months for fine-grained rules (0-3 years)
 */
export function calculateAgeInMonths(birthdate: string): number {
  const today = new Date()
  const birth = new Date(birthdate)
  const months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth())
  const dayDiff = today.getDate() - birth.getDate()
  return Math.max(0, dayDiff < 0 ? months - 1 : months)
}

/**
 * Determine age group from age
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age < 3) return "0-3"
  if (age < 6) return "3-6"
  if (age < 11) return "6-11"
  if (age < 15) return "11-15"
  return "15-18"
}

/**
 * Get age group label in French
 */
export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  const labels: Record<AgeGroup, string> = {
    "0-3": "Nourrisson (0-3 ans)",
    "3-6": "Maternelle (3-6 ans)",
    "6-11": "Primaire (6-11 ans)",
    "11-15": "Collège (11-15 ans)",
    "15-18": "Lycée (15-18 ans)",
  }
  return labels[ageGroup]
}

// =============================================================================
// CHILD HELPERS
// =============================================================================

/**
 * Enrich a child record with age information
 */
export function enrichChildWithAge(child: Child): ChildWithAge {
  const age = calculateAge(child.birthdate)
  return {
    ...child,
    age,
    ageGroup: getAgeGroup(age),
    monthsOld: calculateAgeInMonths(child.birthdate),
  }
}

/**
 * Get all children for a household with age information
 */
export async function getHouseholdChildrenWithAges(
  householdId: string
): Promise<ChildWithAge[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  const children = await query<Child>(
    `
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE household_id = $1
    ORDER BY birthdate DESC
  `,
    [householdId]
  )

  return children.map(enrichChildWithAge)
}

// =============================================================================
// TEMPLATE FILTERING
// =============================================================================

/**
 * Get applicable templates for a child based on their age
 */
export function getApplicableTemplates(child: ChildWithAge): TaskTemplate[] {
  const staticTemplates = getTemplatesForAge(child.age)

  return staticTemplates.map((t, i) => ({
    id: `static-${i}`,
    country: t.country ?? "FR",
    age_min: t.age_min,
    age_max: t.age_max,
    category: t.category,
    subcategory: t.subcategory ?? null,
    title: t.title,
    description: t.description ?? null,
    cron_rule: t.cron_rule ?? null,
    weight: t.weight ?? 3,
    days_before_deadline: t.days_before_deadline ?? 7,
    period: t.period ?? null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

/**
 * Get templates from database that match child's age
 */
export async function getTemplatesFromDB(
  child: ChildWithAge,
  householdId: string
): Promise<TaskTemplate[]> {
  try {
    const templates = await query<TaskTemplate>(
      `
      SELECT tt.*
      FROM task_templates tt
      LEFT JOIN household_template_settings hts
        ON hts.template_id = tt.id AND hts.household_id = $1
      WHERE tt.is_active = true
        AND tt.age_min <= $2
        AND tt.age_max >= $2
        AND (hts.is_enabled IS NULL OR hts.is_enabled = true)
      ORDER BY tt.category, tt.title
    `,
      [householdId, child.age]
    )

    return templates
  } catch {
    // Fallback to static templates
    return getApplicableTemplates(child)
  }
}

// =============================================================================
// ONE-TIME TASK DETECTION (VACCINS, INSCRIPTIONS, ETC.)
// =============================================================================

/**
 * Check if a one-time task should be generated for specific age milestones
 * (Vaccins at 2 months, 4 months, 11 months, etc.)
 */
export function shouldGenerateOneTimeTask(
  template: TaskTemplate,
  child: ChildWithAge
): { shouldGenerate: boolean; deadline: Date | null; reason?: string } {
  // Skip if template has cron_rule (not a one-time task)
  if (template.cron_rule) {
    return { shouldGenerate: false, deadline: null, reason: "Has cron rule" }
  }

  const today = new Date()
  const birth = new Date(child.birthdate)

  // Calculate deadline based on age_min/age_max
  // For vaccines: age_min === age_max means specific age milestone
  if (template.age_min === template.age_max) {
    // This is an age-specific milestone (e.g., vaccine at 2 months)
    const targetAge = template.age_min

    // Check if we're in the window for this task
    // For young children (0-2 years), use months
    if (targetAge <= 2) {
      // Target is in months for babies
      const monthsTarget = template.category === "sante" && template.subcategory === "vaccin"
        ? guessVaccineMonths(template.title)
        : targetAge * 12

      const monthsSinceBirth = child.monthsOld
      const daysBeforeDeadline = template.days_before_deadline

      // Calculate deadline date
      const deadlineDate = new Date(birth)
      deadlineDate.setMonth(deadlineDate.getMonth() + monthsTarget)

      // Check if we're in the look-ahead window
      const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilDeadline < -30) {
        return { shouldGenerate: false, deadline: null, reason: "Deadline passed more than 30 days ago" }
      }

      if (daysUntilDeadline > daysBeforeDeadline + 30) {
        return { shouldGenerate: false, deadline: null, reason: "Too far in future" }
      }

      return { shouldGenerate: true, deadline: deadlineDate }
    }

    // For older children, use years
    const deadlineDate = new Date(birth)
    deadlineDate.setFullYear(deadlineDate.getFullYear() + targetAge)

    const daysUntilDeadline = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilDeadline < -30 || daysUntilDeadline > 60) {
      return { shouldGenerate: false, deadline: null, reason: "Outside generation window" }
    }

    return { shouldGenerate: true, deadline: deadlineDate }
  }

  // For range-based one-time tasks, check if child is in range
  if (child.age >= template.age_min && child.age <= template.age_max) {
    // Generate with deadline 30 days from now (default for flexible one-time tasks)
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)
    return { shouldGenerate: true, deadline }
  }

  return { shouldGenerate: false, deadline: null, reason: "Age out of range" }
}

/**
 * Guess vaccine target month from title
 */
function guessVaccineMonths(title: string): number {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes("2 mois")) return 2
  if (lowerTitle.includes("4 mois")) return 4
  if (lowerTitle.includes("11 mois")) return 11
  if (lowerTitle.includes("12 mois")) return 12
  if (lowerTitle.includes("16 mois") || lowerTitle.includes("18 mois")) return 17
  return 0
}

// =============================================================================
// PERIODIC TASK DEADLINE CALCULATION
// =============================================================================

/**
 * Calculate next deadline for a periodic template
 */
export function calculateNextPeriodicDeadline(
  template: TaskTemplate,
  fromDate: Date = new Date()
): Date | null {
  if (!template.cron_rule) return null

  const rule = template.cron_rule

  // Handle special patterns
  if (rule === "@yearly") {
    const next = new Date(fromDate)
    if (next.getMonth() === 0 && next.getDate() === 1) {
      next.setFullYear(next.getFullYear() + 1)
    } else {
      next.setFullYear(next.getFullYear() + 1)
      next.setMonth(0)
      next.setDate(1)
    }
    return next
  }

  if (rule === "@monthly") {
    const next = new Date(fromDate)
    next.setMonth(next.getMonth() + 1)
    next.setDate(1)
    return next
  }

  if (rule === "@weekly") {
    const next = new Date(fromDate)
    const daysUntilSunday = (7 - next.getDay()) % 7 || 7
    next.setDate(next.getDate() + daysUntilSunday)
    return next
  }

  if (rule === "@daily") {
    const next = new Date(fromDate)
    next.setDate(next.getDate() + 1)
    return next
  }

  // Parse cron format: minute hour day month weekday
  const parts = rule.split(" ")
  if (parts.length !== 5) return null

  const [, , dayStr, monthStr] = parts
  const day = parseInt(dayStr ?? "1", 10)
  const month = monthStr === "*" ? null : parseInt(monthStr ?? "1", 10)

  if (isNaN(day)) return null

  const next = new Date(fromDate)
  next.setHours(0, 0, 0, 0)

  // Set month and day
  if (month !== null && !isNaN(month)) {
    next.setMonth(month - 1) // Month is 0-indexed
  }
  next.setDate(day)

  // If date is in the past or today, move to next occurrence
  if (next <= fromDate) {
    if (month !== null) {
      next.setFullYear(next.getFullYear() + 1)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
  }

  return next
}

// =============================================================================
// TASK GENERATION
// =============================================================================

/**
 * Generate age-based tasks for a single child
 */
export async function generateAgeBasedTasksForChild(
  child: ChildWithAge,
  householdId: string,
  config: AgeBasedTaskConfig = {}
): Promise<AgeBasedTaskResult> {
  const {
    lookAheadDays = 30,
    includeOneTime = true,
    includePeriodic = true,
  } = config

  const result: AgeBasedTaskResult = {
    child,
    applicableTemplates: [],
    generatedCount: 0,
    skippedCount: 0,
    errors: [],
  }

  try {
    // Get templates from DB with fallback to static
    const templates = await getTemplatesFromDB(child, householdId)
    result.applicableTemplates = templates

    // Get existing generated tasks to avoid duplicates
    const existingGenerated = await query<{ generation_key: string; child_id: string }>(
      `
      SELECT generation_key, child_id
      FROM generated_tasks
      WHERE household_id = $1 AND child_id = $2
    `,
      [householdId, child.id]
    )

    const existingKeys = new Set(existingGenerated.map((g) => g.generation_key))

    const today = new Date()

    for (const template of templates) {
      try {
        let deadline: Date | null = null
        let shouldGenerate = false

        // Handle one-time vs periodic tasks
        if (!template.cron_rule && includeOneTime) {
          const oneTimeResult = shouldGenerateOneTimeTask(template, child)
          shouldGenerate = oneTimeResult.shouldGenerate
          deadline = oneTimeResult.deadline
        } else if (template.cron_rule && includePeriodic) {
          deadline = calculateNextPeriodicDeadline(template, today)
          if (deadline) {
            const daysUntil = Math.ceil(
              (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            )
            shouldGenerate = daysUntil <= lookAheadDays && daysUntil >= -7
          }
        }

        if (!shouldGenerate || !deadline) {
          result.skippedCount++
          continue
        }

        // Generate unique key
        const generationKey = generateGenerationKey(template.id, deadline)
        if (existingKeys.has(generationKey)) {
          result.skippedCount++
          continue
        }

        // Insert generated task
        await insert<GeneratedTask>("generated_tasks", {
          template_id: template.id,
          child_id: child.id,
          household_id: householdId,
          deadline: deadline.toISOString().split("T")[0],
          generation_key: generationKey,
          status: "pending",
          acknowledged: false,
        })

        existingKeys.add(generationKey)
        result.generatedCount++
      } catch (error) {
        result.errors.push(
          `Template ${template.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to process child: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }

  return result
}

/**
 * Generate age-based tasks for all children in a household
 */
export async function generateAgeBasedTasksForHousehold(
  householdId: string,
  config: AgeBasedTaskConfig = {}
): Promise<HouseholdAgeBasedResult> {
  const result: HouseholdAgeBasedResult = {
    householdId,
    results: [],
    totalGenerated: 0,
    totalSkipped: 0,
    totalErrors: 0,
  }

  try {
    const children = await getHouseholdChildrenWithAges(householdId)

    for (const child of children) {
      const childResult = await generateAgeBasedTasksForChild(child, householdId, config)
      result.results.push(childResult)
      result.totalGenerated += childResult.generatedCount
      result.totalSkipped += childResult.skippedCount
      result.totalErrors += childResult.errors.length
    }
  } catch (error) {
    result.totalErrors++
  }

  return result
}

// =============================================================================
// STATISTICS & PREVIEW
// =============================================================================

/**
 * Get task count by age group
 */
export function getTemplateCountsByAgeGroup(): Record<AgeGroup, number> {
  const counts: Record<AgeGroup, number> = {
    "0-3": 0,
    "3-6": 0,
    "6-11": 0,
    "11-15": 0,
    "15-18": 0,
  }

  for (const template of allTemplatesFR) {
    // Count template in all applicable age groups
    for (const ageGroup of Object.keys(counts) as AgeGroup[]) {
      const [minStr, maxStr] = ageGroup.split("-")
      const min = parseInt(minStr ?? "0", 10)
      const max = parseInt(maxStr ?? "18", 10)

      if (template.age_min <= max && template.age_max >= min) {
        counts[ageGroup]++
      }
    }
  }

  return counts
}

/**
 * Preview upcoming tasks for a child without generating them
 */
export async function previewUpcomingTasksForChild(
  child: ChildWithAge,
  householdId: string,
  days: number = 30
): Promise<Array<{
  template: TaskTemplate
  deadline: Date
  daysUntil: number
  status: "upcoming" | "due_soon" | "overdue"
}>> {
  const templates = await getTemplatesFromDB(child, householdId)
  const today = new Date()
  const preview: Array<{
    template: TaskTemplate
    deadline: Date
    daysUntil: number
    status: "upcoming" | "due_soon" | "overdue"
  }> = []

  for (const template of templates) {
    let deadline: Date | null = null

    if (!template.cron_rule) {
      const oneTimeResult = shouldGenerateOneTimeTask(template, child)
      deadline = oneTimeResult.deadline
    } else {
      deadline = calculateNextPeriodicDeadline(template, today)
    }

    if (!deadline) continue

    const daysUntil = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntil > days) continue

    preview.push({
      template,
      deadline,
      daysUntil,
      status: daysUntil < 0 ? "overdue" : daysUntil <= 7 ? "due_soon" : "upcoming",
    })
  }

  // Sort by deadline
  preview.sort((a, b) => a.daysUntil - b.daysUntil)

  return preview
}

/**
 * Get summary of automatic tasks by category for a child
 */
export function getTaskSummaryByCategory(
  child: ChildWithAge
): Record<string, { count: number; totalWeight: number }> {
  const templates = getApplicableTemplates(child)
  const summary: Record<string, { count: number; totalWeight: number }> = {}

  for (const template of templates) {
    const category = template.category
    if (!summary[category]) {
      summary[category] = { count: 0, totalWeight: 0 }
    }
    summary[category].count++
    summary[category].totalWeight += template.weight
  }

  return summary
}
