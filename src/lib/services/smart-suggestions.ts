/**
 * Smart Suggestions Service
 *
 * AI-powered task suggestions based on:
 * - User history and patterns
 * - Child age and context
 * - Time of year / seasonal events
 * - Household patterns
 */

import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { getTemplatesForAge, ALL_TEMPLATES } from "@/lib/data/task-templates"

// =============================================================================
// TYPES
// =============================================================================

export interface TaskSuggestion {
  id: string
  title: string
  description: string | null
  category: string
  categoryColor?: string
  childId?: string
  childName?: string
  suggestedDeadline: string | null
  priority: "high" | "normal" | "low"
  weight: number
  reason: SuggestionReason
  confidence: number
}

export type SuggestionReason =
  | "recurring_pattern"    // User creates this task regularly
  | "seasonal_event"       // Time-based (rentrée, etc.)
  | "age_milestone"        // Child age trigger
  | "template_match"       // From template catalog
  | "similar_task"         // Similar to past tasks
  | "upcoming_deadline"    // Based on known patterns
  | "ai_prediction"        // LLM prediction

export interface PatternAnalysis {
  dayOfWeekPattern: Map<number, string[]> // Day -> common tasks
  monthlyPattern: Map<number, string[]>   // Month -> common tasks
  recurringTasks: Array<{
    title: string
    frequency: "daily" | "weekly" | "monthly"
    lastOccurrence: Date
    nextPredicted: Date
  }>
  categoryPreferences: Map<string, number> // Category -> frequency
}

export interface UserContext {
  userId: string
  householdId: string
  children: Array<{
    id: string
    firstName: string
    ageMonths: number
  }>
  currentStreak: number
  recentTaskCount: number
  avgTasksPerWeek: number
}

// =============================================================================
// GET SMART SUGGESTIONS
// =============================================================================

/**
 * Get personalized task suggestions for a household
 */
export async function getSmartSuggestions(
  householdId: string,
  options: {
    limit?: number
    includeTemplates?: boolean
    includePatterns?: boolean
    includeSeasonals?: boolean
  } = {}
): Promise<TaskSuggestion[]> {
  const {
    limit = 5,
    includeTemplates = true,
    includePatterns = true,
    includeSeasonals = true,
  } = options

  const suggestions: TaskSuggestion[] = []

  // Get user context
  const context = await getUserContext(householdId)
  if (!context) return []

  // 1. Pattern-based suggestions
  if (includePatterns) {
    const patternSuggestions = await getPatternBasedSuggestions(householdId, context)
    suggestions.push(...patternSuggestions)
  }

  // 2. Template-based suggestions (age-appropriate)
  if (includeTemplates) {
    const templateSuggestions = await getTemplateBasedSuggestions(context)
    suggestions.push(...templateSuggestions)
  }

  // 3. Seasonal suggestions
  if (includeSeasonals) {
    const seasonalSuggestions = getSeasonalSuggestions(context)
    suggestions.push(...seasonalSuggestions)
  }

  // Sort by confidence and return top suggestions
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

// =============================================================================
// USER CONTEXT
// =============================================================================

async function getUserContext(householdId: string): Promise<UserContext | null> {
  // Get household info
  const household = await queryOne<{
    id: string
    streak_current: number
  }>(`
    SELECT id, streak_current
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household) return null

  // Get children
  const children = await query<{
    id: string
    first_name: string
    birthdate: string
  }>(`
    SELECT id, first_name, birthdate
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  // Calculate age in months
  const childrenWithAge = children.map((c) => {
    const birthdate = new Date(c.birthdate)
    const now = new Date()
    const ageMonths = Math.floor(
      (now.getTime() - birthdate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
    return {
      id: c.id,
      firstName: c.first_name,
      ageMonths,
    }
  })

  // Get task stats
  const stats = await queryOne<{
    recent_count: string
    avg_weekly: string
  }>(`
    SELECT
      COUNT(*)::text as recent_count,
      (COUNT(*) / GREATEST(1, EXTRACT(WEEK FROM NOW() - MIN(created_at))))::text as avg_weekly
    FROM tasks
    WHERE household_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
  `, [householdId])

  // Get current user
  const userId = await getUserId()

  return {
    userId: userId ?? "",
    householdId,
    children: childrenWithAge,
    currentStreak: household.streak_current ?? 0,
    recentTaskCount: parseInt(stats?.recent_count ?? "0", 10),
    avgTasksPerWeek: parseFloat(stats?.avg_weekly ?? "0"),
  }
}

// =============================================================================
// PATTERN-BASED SUGGESTIONS
// =============================================================================

async function getPatternBasedSuggestions(
  householdId: string,
  context: UserContext
): Promise<TaskSuggestion[]> {
  const suggestions: TaskSuggestion[] = []
  const now = new Date()
  const dayOfWeek = now.getDay()
  const month = now.getMonth()

  // Find recurring tasks that should be created soon
  const recurringPatterns = await query<{
    title: string
    category_code: string
    category_color: string
    child_id: string | null
    child_name: string | null
    avg_interval_days: string
    last_created: string
    occurrences: string
  }>(`
    WITH task_intervals AS (
      SELECT
        title,
        tc.code as category_code,
        tc.color as category_color,
        t.child_id,
        c.first_name as child_name,
        created_at,
        LAG(created_at) OVER (PARTITION BY title ORDER BY created_at) as prev_created
      FROM tasks t
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      LEFT JOIN children c ON c.id = t.child_id
      WHERE t.household_id = $1
        AND t.source != 'auto'
        AND t.created_at > NOW() - INTERVAL '90 days'
    ),
    recurring AS (
      SELECT
        title,
        category_code,
        category_color,
        child_id,
        child_name,
        AVG(EXTRACT(EPOCH FROM (created_at - prev_created)) / 86400)::int as avg_interval_days,
        MAX(created_at) as last_created,
        COUNT(*) as occurrences
      FROM task_intervals
      WHERE prev_created IS NOT NULL
      GROUP BY title, category_code, category_color, child_id, child_name
      HAVING COUNT(*) >= 2
        AND AVG(EXTRACT(EPOCH FROM (created_at - prev_created)) / 86400) BETWEEN 1 AND 45
    )
    SELECT *
    FROM recurring
    WHERE (NOW()::date - last_created::date) >= avg_interval_days - 2
    ORDER BY occurrences DESC
    LIMIT 5
  `, [householdId])

  for (const pattern of recurringPatterns) {
    const intervalDays = parseInt(pattern.avg_interval_days, 10)
    const lastCreated = new Date(pattern.last_created)
    const nextDate = new Date(lastCreated)
    nextDate.setDate(nextDate.getDate() + intervalDays)

    suggestions.push({
      id: `pattern-${pattern.title.toLowerCase().replace(/\s+/g, "-")}`,
      title: pattern.title,
      description: null,
      category: pattern.category_code ?? "quotidien",
      categoryColor: pattern.category_color,
      childId: pattern.child_id ?? undefined,
      childName: pattern.child_name ?? undefined,
      suggestedDeadline: nextDate.toISOString(),
      priority: "normal",
      weight: 3,
      reason: "recurring_pattern",
      confidence: Math.min(0.9, 0.5 + parseInt(pattern.occurrences, 10) * 0.1),
    })
  }

  // Day-of-week patterns
  const dayPatterns = await query<{
    title: string
    category_code: string
    count: string
  }>(`
    SELECT
      t.title,
      tc.code as category_code,
      COUNT(*)::text as count
    FROM tasks t
    LEFT JOIN task_categories tc ON tc.id = t.category_id
    WHERE t.household_id = $1
      AND EXTRACT(DOW FROM t.created_at) = $2
      AND t.created_at > NOW() - INTERVAL '60 days'
    GROUP BY t.title, tc.code
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
    LIMIT 3
  `, [householdId, dayOfWeek])

  for (const pattern of dayPatterns) {
    // Skip if already suggested
    if (suggestions.some((s) => s.title === pattern.title)) continue

    suggestions.push({
      id: `day-pattern-${pattern.title.toLowerCase().replace(/\s+/g, "-")}`,
      title: pattern.title,
      description: null,
      category: pattern.category_code ?? "quotidien",
      suggestedDeadline: now.toISOString(),
      priority: "normal",
      weight: 2,
      reason: "recurring_pattern",
      confidence: Math.min(0.7, 0.4 + parseInt(pattern.count, 10) * 0.1),
    })
  }

  return suggestions
}

// =============================================================================
// TEMPLATE-BASED SUGGESTIONS
// =============================================================================

async function getTemplateBasedSuggestions(
  context: UserContext
): Promise<TaskSuggestion[]> {
  const suggestions: TaskSuggestion[] = []
  const now = new Date()
  const month = now.getMonth() + 1 // 1-indexed

  for (const child of context.children) {
    const ageYears = Math.floor(child.ageMonths / 12)
    const templates = getTemplatesForAge(ageYears)

    // Get templates that match current period
    const relevantTemplates = templates.filter((t) => {
      // Check if template triggers this month
      if (t.triggerMonth && t.triggerMonth !== month) return false
      return true
    })

    // Limit to top 3 per child
    const topTemplates = relevantTemplates.slice(0, 3)

    for (const template of topTemplates) {
      // Calculate suggested deadline
      let deadline: Date | null = null
      if (template.recurrence && template.recurrence !== "once") {
        const cronRule = template.recurrence === "yearly" ? "@yearly" : "@monthly"
        deadline = calculateNextDeadline(cronRule)
      }

      suggestions.push({
        id: `template-${template.id}-${child.id}`,
        title: template.title,
        description: template.description,
        category: template.category,
        childId: child.id,
        childName: child.firstName,
        suggestedDeadline: deadline?.toISOString() ?? null,
        priority: template.priority === "critical" ? "high" : "normal",
        weight: template.weight,
        reason: "template_match",
        confidence: 0.8,
      })
    }
  }

  return suggestions
}

// =============================================================================
// SEASONAL SUGGESTIONS
// =============================================================================

function getSeasonalSuggestions(context: UserContext): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = []
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // Define seasonal events
  const seasonalEvents: Array<{
    months: number[]
    days?: [number, number] // Range [start, end]
    title: string
    description: string
    category: string
    priority: "high" | "normal"
    weight: number
  }> = [
    // Rentrée scolaire
    {
      months: [8, 9],
      days: [15, 15],
      title: "Préparer la rentrée scolaire",
      description: "Fournitures, assurance, inscriptions",
      category: "ecole",
      priority: "high",
      weight: 5,
    },
    // Vaccination de rentrée
    {
      months: [9],
      title: "Vérifier les vaccins pour la rentrée",
      description: "Carnet de vaccination à jour",
      category: "sante",
      priority: "normal",
      weight: 4,
    },
    // Impôts
    {
      months: [4, 5],
      title: "Déclaration d'impôts",
      description: "Déclaration des revenus annuelle",
      category: "administratif",
      priority: "high",
      weight: 5,
    },
    // Réinscriptions activités
    {
      months: [5, 6],
      title: "Réinscriptions activités",
      description: "Réinscrire aux activités pour l'année prochaine",
      category: "activites",
      priority: "normal",
      weight: 3,
    },
    // Préparation vacances d'été
    {
      months: [5, 6],
      title: "Préparer les vacances d'été",
      description: "Réservations, mode de garde",
      category: "logistique",
      priority: "normal",
      weight: 4,
    },
    // Fêtes de fin d'année
    {
      months: [12],
      days: [1, 20],
      title: "Préparer les cadeaux de Noël",
      description: "Liste de cadeaux pour les enfants",
      category: "social",
      priority: "normal",
      weight: 3,
    },
    // CAF January declaration
    {
      months: [1],
      days: [1, 31],
      title: "Déclaration trimestrielle CAF",
      description: "Mise à jour des revenus CAF",
      category: "administratif",
      priority: "high",
      weight: 4,
    },
    // Medical checkup
    {
      months: [1, 9],
      title: "Visite médicale annuelle",
      description: "Rendez-vous médecin généraliste",
      category: "sante",
      priority: "normal",
      weight: 3,
    },
    // Dentist
    {
      months: [3, 9],
      title: "Rendez-vous dentiste",
      description: "Contrôle dentaire semestriel",
      category: "sante",
      priority: "normal",
      weight: 3,
    },
  ]

  for (const event of seasonalEvents) {
    if (!event.months.includes(month)) continue

    // Check day range if specified
    if (event.days) {
      const [start, end] = event.days
      if (day < start || day > end) continue
    }

    // Apply to each child if relevant
    const hasSchoolAge = context.children.some(
      (c) => c.ageMonths >= 36 && c.ageMonths <= 216 // 3-18 years
    )

    // Skip school-related if no school-age children
    if (event.category === "ecole" && !hasSchoolAge) continue

    suggestions.push({
      id: `seasonal-${event.title.toLowerCase().replace(/\s+/g, "-")}`,
      title: event.title,
      description: event.description,
      category: event.category,
      suggestedDeadline: getSeasonalDeadline(month, event.days),
      priority: event.priority,
      weight: event.weight,
      reason: "seasonal_event",
      confidence: 0.75,
    })
  }

  return suggestions
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateNextDeadline(cronRule: string | null): Date | null {
  if (!cronRule) return null

  const now = new Date()

  if (cronRule === "@yearly") {
    const next = new Date(now)
    next.setMonth(0, 1)
    if (next <= now) next.setFullYear(next.getFullYear() + 1)
    return next
  }

  if (cronRule === "@monthly") {
    const next = new Date(now)
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    return next
  }

  if (cronRule === "@weekly") {
    const next = new Date(now)
    next.setDate(next.getDate() + (7 - next.getDay()))
    return next
  }

  // Parse cron format
  const parts = cronRule.split(" ")
  if (parts.length !== 5) return null

  const day = parseInt(parts[2] ?? "1", 10)
  const monthStr = parts[3]
  const month = monthStr === "*" ? null : parseInt(monthStr ?? "1", 10)

  const next = new Date(now)
  if (month !== null) next.setMonth(month - 1)
  next.setDate(day)

  if (next <= now) {
    if (month !== null) {
      next.setFullYear(next.getFullYear() + 1)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
  }

  return next
}

function getSeasonalDeadline(
  month: number,
  dayRange?: [number, number]
): string | null {
  const now = new Date()

  if (dayRange) {
    // End of the range
    const deadline = new Date(now.getFullYear(), month - 1, dayRange[1])
    return deadline.toISOString()
  }

  // End of month
  const deadline = new Date(now.getFullYear(), month, 0)
  return deadline.toISOString()
}

// =============================================================================
// PREDICT DEADLINE
// =============================================================================

/**
 * Predict deadline based on task characteristics and historical data
 */
export async function predictDeadline(
  householdId: string,
  taskTitle: string,
  category: string
): Promise<{
  suggestedDeadline: string
  confidence: number
  reason: string
}> {
  const now = new Date()

  // Check historical deadlines for similar tasks
  const similar = await queryOne<{
    avg_days: string
    count: string
  }>(`
    SELECT
      AVG(EXTRACT(DAY FROM (deadline - created_at)))::int as avg_days,
      COUNT(*)::text as count
    FROM tasks
    WHERE household_id = $1
      AND (
        title ILIKE $2
        OR category_id = (SELECT id FROM task_categories WHERE code = $3)
      )
      AND deadline IS NOT NULL
      AND created_at > NOW() - INTERVAL '180 days'
  `, [householdId, `%${taskTitle.slice(0, 20)}%`, category])

  if (similar && parseInt(similar.count, 10) >= 2) {
    const avgDays = parseInt(similar.avg_days, 10) || 7
    const deadline = new Date(now)
    deadline.setDate(deadline.getDate() + avgDays)

    return {
      suggestedDeadline: deadline.toISOString(),
      confidence: Math.min(0.9, 0.5 + parseInt(similar.count, 10) * 0.05),
      reason: `Basé sur ${similar.count} tâches similaires`,
    }
  }

  // Default by category
  const defaultDays: Record<string, number> = {
    sante: 14,
    administratif: 7,
    ecole: 7,
    quotidien: 3,
    social: 7,
    activites: 14,
    logistique: 7,
  }

  const days = defaultDays[category] ?? 7
  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + days)

  return {
    suggestedDeadline: deadline.toISOString(),
    confidence: 0.5,
    reason: "Délai par défaut pour cette catégorie",
  }
}

// =============================================================================
// DETECT PATTERNS
// =============================================================================

/**
 * Analyze household patterns for insights
 */
export async function detectPatterns(
  householdId: string
): Promise<PatternAnalysis> {
  // Day of week patterns
  const dayPatterns = await query<{
    day: string
    titles: string[]
  }>(`
    SELECT
      EXTRACT(DOW FROM created_at)::int as day,
      ARRAY_AGG(DISTINCT title) as titles
    FROM tasks
    WHERE household_id = $1
      AND created_at > NOW() - INTERVAL '90 days'
    GROUP BY EXTRACT(DOW FROM created_at)
  `, [householdId])

  const dayOfWeekPattern = new Map<number, string[]>()
  for (const dp of dayPatterns) {
    dayOfWeekPattern.set(parseInt(dp.day, 10), dp.titles)
  }

  // Monthly patterns
  const monthPatterns = await query<{
    month: string
    titles: string[]
  }>(`
    SELECT
      EXTRACT(MONTH FROM created_at)::int as month,
      ARRAY_AGG(DISTINCT title) as titles
    FROM tasks
    WHERE household_id = $1
      AND created_at > NOW() - INTERVAL '365 days'
    GROUP BY EXTRACT(MONTH FROM created_at)
  `, [householdId])

  const monthlyPattern = new Map<number, string[]>()
  for (const mp of monthPatterns) {
    monthlyPattern.set(parseInt(mp.month, 10), mp.titles)
  }

  // Category preferences
  const categoryPrefs = await query<{
    category: string
    count: string
  }>(`
    SELECT
      tc.code as category,
      COUNT(*)::text as count
    FROM tasks t
    JOIN task_categories tc ON tc.id = t.category_id
    WHERE t.household_id = $1
      AND t.created_at > NOW() - INTERVAL '90 days'
    GROUP BY tc.code
    ORDER BY COUNT(*) DESC
  `, [householdId])

  const categoryPreferences = new Map<string, number>()
  for (const cp of categoryPrefs) {
    categoryPreferences.set(cp.category, parseInt(cp.count, 10))
  }

  return {
    dayOfWeekPattern,
    monthlyPattern,
    recurringTasks: [], // Would need more complex analysis
    categoryPreferences,
  }
}
