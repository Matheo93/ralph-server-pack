/**
 * Period-Based Task Generation Service
 *
 * Ce service gère la génération de tâches saisonnières basées sur la période de l'année.
 * Implémente les règles du MASTER_PROMPT.
 *
 * Périodes:
 * - Rentrée (Août-Septembre): assurance, fournitures
 * - Toussaint (Octobre-Novembre): réunion parents-profs
 * - Noël (Décembre): cadeaux, vacances
 * - Hiver (Janvier-Février): inscriptions activités
 * - Printemps (Mars-Mai): fin d'année, réinscriptions
 * - Été (Juin-Juillet): vacances, colonies
 */

import { query, insert, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import type {
  TaskTemplate,
  GeneratedTask,
  TaskGenerationResult,
  PeriodType,
} from "@/types/template"
import { generateGenerationKey } from "@/lib/validations/template"

// =============================================================================
// TYPES
// =============================================================================

export interface PeriodConfig {
  code: PeriodType
  labelFr: string
  labelEn: string
  monthStart: number // 1-12
  monthEnd: number // 1-12
  description: string
  icon: string
}

export interface CurrentPeriodInfo {
  current: PeriodConfig
  daysRemaining: number
  nextPeriod: PeriodConfig
  daysUntilNext: number
}

export interface PeriodTaskResult {
  period: PeriodType
  generated: number
  skipped: number
  errors: string[]
}

// =============================================================================
// PERIOD CONFIGURATIONS
// =============================================================================

export const PERIODS: PeriodConfig[] = [
  {
    code: "rentree",
    labelFr: "Rentrée",
    labelEn: "Back to School",
    monthStart: 8,
    monthEnd: 9,
    description: "Rentrée scolaire, assurance, fournitures",
    icon: "📚",
  },
  {
    code: "toussaint",
    labelFr: "Toussaint",
    labelEn: "Fall Break",
    monthStart: 10,
    monthEnd: 11,
    description: "Vacances de la Toussaint, réunions parents-profs",
    icon: "🍂",
  },
  {
    code: "noel",
    labelFr: "Noël",
    labelEn: "Christmas",
    monthStart: 12,
    monthEnd: 12,
    description: "Vacances de Noël, cadeaux, fêtes",
    icon: "🎄",
  },
  {
    code: "hiver",
    labelFr: "Hiver",
    labelEn: "Winter",
    monthStart: 1,
    monthEnd: 2,
    description: "Vacances d'hiver, inscriptions activités",
    icon: "❄️",
  },
  {
    code: "printemps",
    labelFr: "Printemps",
    labelEn: "Spring",
    monthStart: 3,
    monthEnd: 5,
    description: "Printemps, fin d'année scolaire approche",
    icon: "🌸",
  },
  {
    code: "ete",
    labelFr: "Été",
    labelEn: "Summer",
    monthStart: 6,
    monthEnd: 7,
    description: "Fin d'année, vacances d'été, colonies",
    icon: "☀️",
  },
]

// Period-specific tasks that activate during each period
export const PERIOD_TASKS: Record<PeriodType, string[]> = {
  rentree: [
    "Assurance scolaire",
    "Fournitures scolaires",
    "Réunion de rentrée",
    "Inscription cantine",
    "Inscription étude/garderie",
    "Certificat médical sport",
    "Équipement sportif rentrée",
    "Chaussures rentrée",
    "Allocation rentrée scolaire",
  ],
  toussaint: [
    "Photos de classe",
    "Stage d'observation 3ème",
    "Inscription Brevet",
    "Manteau hiver",
  ],
  noel: [
    "Réunion parents-enseignants 1er trimestre",
    "Conseils de classe - 1er trimestre",
    "Liste cadeaux Noël",
    "Achats cadeaux Noël",
  ],
  hiver: [
    "Choix spécialités 1ère",
    "Choix spécialités Terminale",
    "Inscription Parcoursup",
  ],
  printemps: [
    "Inscription école maternelle",
    "Inscription CP",
    "Réunion parents-enseignants mars",
    "Conseils de classe - 2ème trimestre",
    "Choix orientation fin 3ème",
    "Confirmation vœux Parcoursup",
    "Révisions Brevet",
    "Révisions Baccalauréat",
    "Inscription centre aéré / colonies",
    "Déclaration impôts",
  ],
  ete: [
    "Inscription collège 6ème",
    "Inscription lycée 2nde",
    "Inscription demi-pension collège",
    "Fête de l'école",
    "Réponses Parcoursup",
    "Réinscription activités extra-scolaires",
    "Inscription cantine",
    "Inscription étude/garderie",
  ],
  year_round: [], // Always applicable
}

// =============================================================================
// PERIOD DETECTION
// =============================================================================

/**
 * Get the current period based on today's date
 */
export function getCurrentPeriod(): PeriodType {
  const month = new Date().getMonth() + 1 // 1-12

  for (const period of PERIODS) {
    if (period.monthStart <= period.monthEnd) {
      // Normal range (e.g., 3-5 for spring)
      if (month >= period.monthStart && month <= period.monthEnd) {
        return period.code
      }
    } else {
      // Wrapping range (e.g., 12-1 for Christmas)
      if (month >= period.monthStart || month <= period.monthEnd) {
        return period.code
      }
    }
  }

  // Default fallback
  return "year_round"
}

/**
 * Get detailed info about current period
 */
export function getCurrentPeriodInfo(): CurrentPeriodInfo {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const currentPeriod = PERIODS.find((p) => {
    if (p.monthStart <= p.monthEnd) {
      return month >= p.monthStart && month <= p.monthEnd
    }
    return month >= p.monthStart || month <= p.monthEnd
  }) ?? PERIODS[0]!

  // Calculate days remaining in current period
  const periodEndDate = new Date(today.getFullYear(), currentPeriod.monthEnd, 0) // Last day of end month
  const daysRemaining = Math.max(
    0,
    Math.ceil((periodEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Find next period
  const currentIndex = PERIODS.findIndex((p) => p.code === currentPeriod.code)
  const nextPeriod = PERIODS[(currentIndex + 1) % PERIODS.length]!

  // Calculate days until next period
  let nextPeriodStart = new Date(today.getFullYear(), nextPeriod.monthStart - 1, 1)
  if (nextPeriodStart <= today) {
    nextPeriodStart = new Date(today.getFullYear() + 1, nextPeriod.monthStart - 1, 1)
  }
  const daysUntilNext = Math.ceil(
    (nextPeriodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    current: currentPeriod,
    daysRemaining,
    nextPeriod,
    daysUntilNext,
  }
}

/**
 * Get period config by code
 */
export function getPeriodConfig(code: PeriodType): PeriodConfig | null {
  return PERIODS.find((p) => p.code === code) ?? null
}

/**
 * Check if a period is currently active or approaching
 */
export function isPeriodActive(periodCode: PeriodType, lookAheadDays: number = 14): boolean {
  const currentPeriod = getCurrentPeriod()
  if (currentPeriod === periodCode) return true

  // Check if approaching
  const info = getCurrentPeriodInfo()
  if (info.nextPeriod.code === periodCode && info.daysUntilNext <= lookAheadDays) {
    return true
  }

  return false
}

// =============================================================================
// TEMPLATE FILTERING BY PERIOD
// =============================================================================

/**
 * Get templates that are relevant for the current period
 */
export async function getTemplatesForCurrentPeriod(
  householdId: string
): Promise<TaskTemplate[]> {
  const currentPeriod = getCurrentPeriod()
  return getTemplatesForPeriod(householdId, currentPeriod)
}

/**
 * Get templates for a specific period
 */
export async function getTemplatesForPeriod(
  householdId: string,
  period: PeriodType
): Promise<TaskTemplate[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  try {
    const templates = await query<TaskTemplate>(
      `
      SELECT tt.*
      FROM task_templates tt
      LEFT JOIN household_template_settings hts
        ON hts.template_id = tt.id AND hts.household_id = $1
      WHERE tt.is_active = true
        AND (tt.period = $2 OR tt.period = 'year_round')
        AND (hts.is_enabled IS NULL OR hts.is_enabled = true)
      ORDER BY tt.category, tt.title
    `,
      [householdId, period]
    )

    return templates
  } catch {
    return []
  }
}

/**
 * Get all templates that match a period (from static data)
 */
export function getStaticTemplatesForPeriod(period: PeriodType): string[] {
  return PERIOD_TASKS[period] ?? []
}

// =============================================================================
// PERIOD-BASED TASK GENERATION
// =============================================================================

interface Child {
  id: string
  first_name: string
  birthdate: string
  household_id: string
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: string): number {
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
 * Generate period-specific tasks for a household
 */
export async function generatePeriodTasksForHousehold(
  householdId: string,
  period?: PeriodType
): Promise<TaskGenerationResult> {
  const result: TaskGenerationResult = {
    generated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }

  const currentUserId = await getUserId()
  if (!currentUserId) return result

  await setCurrentUser(currentUserId)

  const targetPeriod = period ?? getCurrentPeriod()

  try {
    // Get children
    const children = await query<Child>(
      `
      SELECT id, first_name, birthdate, household_id
      FROM children
      WHERE household_id = $1
    `,
      [householdId]
    )

    if (children.length === 0) return result

    // Get templates for this period
    const templates = await getTemplatesForPeriod(householdId, targetPeriod)

    // Get existing generated tasks
    const existingGenerated = await query<{ generation_key: string }>(
      `
      SELECT generation_key
      FROM generated_tasks
      WHERE household_id = $1
    `,
      [householdId]
    )

    const existingKeys = new Set(existingGenerated.map((g) => g.generation_key))

    const today = new Date()

    for (const child of children) {
      const childAge = calculateAge(child.birthdate)

      for (const template of templates) {
        try {
          // Check age range
          if (childAge < template.age_min || childAge > template.age_max) {
            result.skipped++
            continue
          }

          // Calculate deadline
          const deadline = calculatePeriodDeadline(template, today, targetPeriod)
          if (!deadline) {
            result.skipped++
            continue
          }

          // Check if already generated
          const generationKey = generateGenerationKey(template.id, deadline)
          if (existingKeys.has(generationKey)) {
            result.skipped++
            continue
          }

          // Generate the task
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
          result.generated++
          result.details.push({
            templateId: template.id,
            childId: child.id,
            success: true,
          })
        } catch (error) {
          result.errors++
          result.details.push({
            templateId: template.id,
            childId: child.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error generating period tasks for household ${householdId}:`, error)
    result.errors++
  }

  return result
}

/**
 * Calculate deadline for a period-based template
 */
function calculatePeriodDeadline(
  template: TaskTemplate,
  fromDate: Date,
  period: PeriodType
): Date | null {
  // If template has a cron rule, use it
  if (template.cron_rule) {
    const rule = template.cron_rule

    // Handle special patterns
    if (rule === "@yearly" || rule === "@monthly" || rule === "@weekly" || rule === "@daily") {
      const next = new Date(fromDate)
      if (rule === "@yearly") {
        next.setFullYear(next.getFullYear() + 1)
        next.setMonth(0)
        next.setDate(1)
      } else if (rule === "@monthly") {
        next.setMonth(next.getMonth() + 1)
        next.setDate(1)
      } else if (rule === "@weekly") {
        next.setDate(next.getDate() + (7 - next.getDay()))
      } else {
        next.setDate(next.getDate() + 1)
      }
      return next
    }

    // Parse cron format
    const parts = rule.split(" ")
    if (parts.length === 5) {
      const [, , dayStr, monthStr] = parts
      const day = parseInt(dayStr ?? "1", 10)
      const month = monthStr === "*" ? null : parseInt(monthStr ?? "1", 10)

      if (!isNaN(day)) {
        const next = new Date(fromDate)
        if (month !== null && !isNaN(month)) {
          next.setMonth(month - 1)
        }
        next.setDate(day)

        if (next <= fromDate) {
          if (month !== null) {
            next.setFullYear(next.getFullYear() + 1)
          } else {
            next.setMonth(next.getMonth() + 1)
          }
        }
        return next
      }
    }
  }

  // For templates without cron, calculate based on period
  const periodConfig = getPeriodConfig(period)
  if (!periodConfig) return null

  // Set deadline to middle of period
  const deadline = new Date(fromDate)
  const midMonth = Math.floor((periodConfig.monthStart + periodConfig.monthEnd) / 2)
  deadline.setMonth(midMonth - 1)
  deadline.setDate(15)

  // If past, move to next year
  if (deadline <= fromDate) {
    deadline.setFullYear(deadline.getFullYear() + 1)
  }

  return deadline
}

// =============================================================================
// PERIOD SUMMARY & PREVIEW
// =============================================================================

/**
 * Get summary of tasks by period for a household
 */
export async function getPeriodTaskSummary(
  householdId: string
): Promise<Record<PeriodType, { count: number; weight: number }>> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return {} as Record<PeriodType, { count: number; weight: number }>
  }

  await setCurrentUser(currentUserId)

  const summary: Record<PeriodType, { count: number; weight: number }> = {
    rentree: { count: 0, weight: 0 },
    toussaint: { count: 0, weight: 0 },
    noel: { count: 0, weight: 0 },
    hiver: { count: 0, weight: 0 },
    printemps: { count: 0, weight: 0 },
    ete: { count: 0, weight: 0 },
    year_round: { count: 0, weight: 0 },
  }

  try {
    const results = await query<{ period: PeriodType; count: string; weight: string }>(
      `
      SELECT
        COALESCE(tt.period, 'year_round') as period,
        COUNT(*) as count,
        COALESCE(SUM(tt.weight), 0) as weight
      FROM task_templates tt
      LEFT JOIN household_template_settings hts
        ON hts.template_id = tt.id AND hts.household_id = $1
      WHERE tt.is_active = true
        AND (hts.is_enabled IS NULL OR hts.is_enabled = true)
      GROUP BY tt.period
    `,
      [householdId]
    )

    for (const row of results) {
      const period = row.period as PeriodType
      if (summary[period]) {
        summary[period] = {
          count: parseInt(row.count, 10),
          weight: parseInt(row.weight, 10),
        }
      }
    }
  } catch {
    // Return empty summary on error
  }

  return summary
}

/**
 * Preview upcoming period tasks
 */
export async function previewPeriodTasks(
  householdId: string,
  months: number = 3
): Promise<
  Array<{
    period: PeriodConfig
    templates: TaskTemplate[]
    isActive: boolean
    startsIn: number // days
  }>
> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  const preview: Array<{
    period: PeriodConfig
    templates: TaskTemplate[]
    isActive: boolean
    startsIn: number
  }> = []

  const today = new Date()
  const endDate = new Date(today)
  endDate.setMonth(endDate.getMonth() + months)

  for (const period of PERIODS) {
    const templates = await getTemplatesForPeriod(householdId, period.code)

    // Calculate when period starts
    let periodStart = new Date(today.getFullYear(), period.monthStart - 1, 1)
    if (periodStart < today) {
      periodStart = new Date(today.getFullYear() + 1, period.monthStart - 1, 1)
    }

    const startsIn = Math.ceil(
      (periodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Only include periods that start within the preview window
    if (periodStart <= endDate || isPeriodActive(period.code)) {
      preview.push({
        period,
        templates,
        isActive: isPeriodActive(period.code),
        startsIn: isPeriodActive(period.code) ? 0 : startsIn,
      })
    }
  }

  // Sort by start date (active first, then by startsIn)
  preview.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.startsIn - b.startsIn
  })

  return preview
}

// =============================================================================
// PERIOD TRANSITION NOTIFICATIONS
// =============================================================================

/**
 * Check if period is about to change and return notification data
 */
export function checkPeriodTransition(): {
  isTransitioning: boolean
  message: string
  currentPeriod: PeriodConfig
  nextPeriod: PeriodConfig
  daysUntilTransition: number
} | null {
  const info = getCurrentPeriodInfo()

  // Transition warning at 7 days
  if (info.daysUntilNext <= 7) {
    return {
      isTransitioning: true,
      message: `La période ${info.nextPeriod.labelFr} commence dans ${info.daysUntilNext} jours. De nouvelles tâches seront générées.`,
      currentPeriod: info.current,
      nextPeriod: info.nextPeriod,
      daysUntilTransition: info.daysUntilNext,
    }
  }

  return null
}

/**
 * Get period-specific tips for the current period
 */
export function getPeriodTips(period: PeriodType): string[] {
  const tips: Record<PeriodType, string[]> = {
    rentree: [
      "Pensez à vérifier les fournitures scolaires avant la rentrée",
      "L'assurance scolaire doit être renouvelée chaque année",
      "Anticipez les réunions de rentrée dans votre agenda",
    ],
    toussaint: [
      "C'est le moment des réunions parents-profs du 1er trimestre",
      "Pensez aux photos de classe",
      "Préparez le manteau d'hiver",
    ],
    noel: [
      "Préparez la liste de cadeaux avec vos enfants",
      "Les réunions de bilan du 1er trimestre approchent",
    ],
    hiver: [
      "C'est le moment des inscriptions Parcoursup pour les terminales",
      "Choix des spécialités pour les lycéens",
    ],
    printemps: [
      "Inscriptions scolaires pour l'année prochaine",
      "Révisions du brevet et du bac",
      "Pensez aux inscriptions centres de loisirs d'été",
    ],
    ete: [
      "Fin d'année scolaire et fêtes d'école",
      "Réinscriptions activités extra-scolaires",
      "Réponses Parcoursup pour les terminales",
    ],
    year_round: [
      "Pensez à mettre à jour vos documents administratifs",
      "Vérifiez régulièrement les vaccinations",
    ],
  }

  return tips[period] ?? []
}
