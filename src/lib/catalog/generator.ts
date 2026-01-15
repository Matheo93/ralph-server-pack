/**
 * Task Generator
 *
 * Generates task suggestions based on children ages, current period,
 * and household context.
 */

import {
  TaskTemplate,
  TaskSuggestion,
  CatalogFilters,
  ChildInfo,
  GeneratedTask,
  AgeRange,
  Period,
  TaskCategory,
  getAgeRange,
  getAgeInYears,
  getCurrentPeriod,
  getSpecialPeriods,
} from "./types"
import {
  ALL_TEMPLATES,
  getTemplates,
  getTemplatesByAgeRange,
  getTemplatesByPeriod,
  getTemplatesByCategory,
  searchTemplates,
  getCriticalTemplates,
} from "./templates"

// =============================================================================
// CHILD INFO HELPERS
// =============================================================================

/**
 * Create ChildInfo from basic data
 */
export function createChildInfo(id: string, name: string, birthDate: Date): ChildInfo {
  return {
    id,
    name,
    birthDate,
    ageInYears: getAgeInYears(birthDate),
    ageRange: getAgeRange(birthDate),
  }
}

// =============================================================================
// FILTERING
// =============================================================================

/**
 * Filter templates by criteria
 */
export function filterTemplates(filters: CatalogFilters): TaskTemplate[] {
  let templates = getTemplates()

  // Filter by age ranges
  if (filters.ageRanges && filters.ageRanges.length > 0) {
    templates = templates.filter((t) =>
      filters.ageRanges!.some((age) => t.ageRanges.includes(age))
    )
  }

  // Filter by periods
  if (filters.periods && filters.periods.length > 0) {
    templates = templates.filter(
      (t) =>
        filters.periods!.some((period) => t.periods.includes(period)) ||
        t.periods.includes("tout")
    )
  }

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    templates = templates.filter((t) => filters.categories!.includes(t.category))
  }

  // Filter by recurrence
  if (filters.recurrence && filters.recurrence.length > 0) {
    templates = templates.filter((t) => filters.recurrence!.includes(t.recurrence))
  }

  // Filter by weight
  if (filters.minWeight !== undefined) {
    templates = templates.filter((t) => t.weight >= filters.minWeight!)
  }
  if (filters.maxWeight !== undefined) {
    templates = templates.filter((t) => t.weight <= filters.maxWeight!)
  }

  // Filter by critical
  if (filters.critical !== undefined) {
    templates = templates.filter((t) => t.critical === filters.critical)
  }

  // Search filter
  if (filters.search && filters.search.trim().length > 0) {
    const searchResults = searchTemplates(filters.search)
    const searchIds = new Set(searchResults.map((t) => t.id))
    templates = templates.filter((t) => searchIds.has(t.id))
  }

  return templates
}

// =============================================================================
// SUGGESTION GENERATION
// =============================================================================

/**
 * Calculate relevance score for a template and child
 */
function calculateRelevanceScore(
  template: TaskTemplate,
  child: ChildInfo,
  currentPeriods: Period[]
): number {
  let score = 0

  // Age match (40% weight)
  if (template.ageRanges.includes(child.ageRange)) {
    score += 0.4
  }

  // Period match (30% weight)
  const periodMatch = template.periods.some(
    (p) => currentPeriods.includes(p) || p === "tout"
  )
  if (periodMatch) {
    score += 0.3
  }

  // Critical tasks bonus (15% weight)
  if (template.critical) {
    score += 0.15
  }

  // Recurrence bonus for recurring tasks (15% weight)
  if (["daily", "weekly", "monthly"].includes(template.recurrence)) {
    score += 0.15
  }

  return Math.min(score, 1)
}

/**
 * Generate reason text for suggestion
 */
function generateReason(
  template: TaskTemplate,
  child: ChildInfo,
  currentPeriods: Period[]
): string {
  const reasons: string[] = []

  // Age reason
  if (template.ageRanges.includes(child.ageRange)) {
    reasons.push(`Adapté à ${child.name} (${child.ageInYears} ans)`)
  }

  // Period reason
  const matchingPeriods = template.periods.filter(
    (p) => currentPeriods.includes(p) && p !== "tout"
  )
  if (matchingPeriods.length > 0) {
    const periodName = matchingPeriods[0]
    reasons.push(`Période actuelle: ${periodName}`)
  }

  // Critical reason
  if (template.critical) {
    reasons.push("Tâche importante")
  }

  // Recurrence reason
  if (template.recurrence === "daily") {
    reasons.push("Tâche quotidienne")
  } else if (template.recurrence === "weekly") {
    reasons.push("Tâche hebdomadaire")
  }

  return reasons.join(" • ") || "Suggestion basée sur votre profil"
}

/**
 * Calculate suggested due date based on recurrence
 */
function calculateSuggestedDueDate(template: TaskTemplate): Date | undefined {
  const now = new Date()

  switch (template.recurrence) {
    case "daily":
      return now
    case "weekly":
      // End of week (Sunday)
      const sunday = new Date(now)
      sunday.setDate(now.getDate() + (7 - now.getDay()))
      return sunday
    case "monthly":
      // End of month
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return endOfMonth
    case "yearly":
      // Based on period hints
      if (template.periods.includes("rentree")) {
        return new Date(now.getFullYear(), 8, 1) // Sept 1
      }
      if (template.periods.includes("janvier")) {
        return new Date(now.getFullYear(), 0, 31)
      }
      return undefined
    case "seasonal":
      // Next month
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth
    default:
      return undefined
  }
}

/**
 * Generate task suggestions for a household
 */
export function generateSuggestions(
  children: ChildInfo[],
  options: {
    maxSuggestions?: number
    includeGeneral?: boolean
    categories?: TaskCategory[]
  } = {}
): TaskSuggestion[] {
  const { maxSuggestions = 20, includeGeneral = true, categories } = options

  const suggestions: TaskSuggestion[] = []
  const currentPeriods = getSpecialPeriods()

  // Get applicable templates
  let templates = getTemplates()
  if (categories && categories.length > 0) {
    templates = templates.filter((t) => categories.includes(t.category))
  }

  // Generate child-specific suggestions
  for (const child of children) {
    const childTemplates = templates.filter((t) => t.ageRanges.includes(child.ageRange))

    for (const template of childTemplates) {
      const relevanceScore = calculateRelevanceScore(template, child, currentPeriods)

      if (relevanceScore > 0.3) {
        // Minimum threshold
        suggestions.push({
          template,
          childId: child.id,
          childName: child.name,
          relevanceScore,
          reason: generateReason(template, child, currentPeriods),
          suggestedDueDate: calculateSuggestedDueDate(template)?.toISOString(),
        })
      }
    }
  }

  // Add general suggestions (not child-specific) if enabled
  if (includeGeneral && children.length > 0) {
    const firstChild = children[0]!
    const generalTemplates = templates.filter(
      (t) => t.category === "quotidien" || t.category === "logistique"
    )

    for (const template of generalTemplates) {
      // Check if already suggested
      if (suggestions.some((s) => s.template.id === template.id)) continue

      const relevanceScore = calculateRelevanceScore(template, firstChild, currentPeriods)
      if (relevanceScore > 0.3) {
        suggestions.push({
          template,
          relevanceScore: relevanceScore * 0.8, // Slightly lower for general tasks
          reason: "Tâche générale du foyer",
          suggestedDueDate: calculateSuggestedDueDate(template)?.toISOString(),
        })
      }
    }
  }

  // Sort by relevance and limit
  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxSuggestions)
}

/**
 * Generate critical tasks for a household
 */
export function generateCriticalTasks(children: ChildInfo[]): TaskSuggestion[] {
  const currentPeriods = getSpecialPeriods()
  const criticalTemplates = getCriticalTemplates()
  const suggestions: TaskSuggestion[] = []

  for (const child of children) {
    const applicable = criticalTemplates.filter((t) => t.ageRanges.includes(child.ageRange))

    for (const template of applicable) {
      const periodMatch = template.periods.some(
        (p) => currentPeriods.includes(p) || p === "tout"
      )

      if (periodMatch) {
        suggestions.push({
          template,
          childId: child.id,
          childName: child.name,
          relevanceScore: 1,
          reason: `Important pour ${child.name}`,
          suggestedDueDate: calculateSuggestedDueDate(template)?.toISOString(),
        })
      }
    }
  }

  return suggestions
}

// =============================================================================
// TASK GENERATION
// =============================================================================

/**
 * Convert a suggestion to a generated task
 */
export function suggestionToTask(suggestion: TaskSuggestion): GeneratedTask {
  return {
    templateId: suggestion.template.id,
    title: suggestion.template.title,
    description: suggestion.template.description,
    category: suggestion.template.category,
    priority: suggestion.template.suggestedPriority,
    weight: suggestion.template.weight,
    childId: suggestion.childId,
    suggestedDueDate: suggestion.suggestedDueDate
      ? new Date(suggestion.suggestedDueDate)
      : undefined,
  }
}

/**
 * Generate tasks from suggestions
 */
export function generateTasksFromSuggestions(
  suggestions: TaskSuggestion[]
): GeneratedTask[] {
  return suggestions.map(suggestionToTask)
}

// =============================================================================
// PERIOD-BASED GENERATION
// =============================================================================

/**
 * Get tasks specific to current period
 */
export function getPeriodSpecificSuggestions(
  children: ChildInfo[]
): TaskSuggestion[] {
  const currentPeriods = getSpecialPeriods()
  const suggestions: TaskSuggestion[] = []

  // Filter templates that match current special periods (not "tout")
  const periodTemplates = getTemplates().filter((t) =>
    t.periods.some((p) => currentPeriods.includes(p) && p !== "tout")
  )

  for (const child of children) {
    const applicable = periodTemplates.filter((t) => t.ageRanges.includes(child.ageRange))

    for (const template of applicable) {
      suggestions.push({
        template,
        childId: child.id,
        childName: child.name,
        relevanceScore: 0.9,
        reason: `Tâche de saison pour ${child.name}`,
        suggestedDueDate: calculateSuggestedDueDate(template)?.toISOString(),
      })
    }
  }

  return suggestions
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get template statistics
 */
export function getTemplateStatistics() {
  const templates = getTemplates()

  // Count by category
  const byCategory: Record<TaskCategory, number> = {
    ecole: 0,
    sante: 0,
    administratif: 0,
    quotidien: 0,
    social: 0,
    activites: 0,
    logistique: 0,
    autre: 0,
  }

  // Count by age range
  const byAgeRange: Record<AgeRange, number> = {
    "0-3": 0,
    "3-6": 0,
    "6-11": 0,
    "11-15": 0,
    "15-18": 0,
  }

  // Count by recurrence
  const byRecurrence: Record<string, number> = {
    once: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    seasonal: 0,
  }

  for (const template of templates) {
    byCategory[template.category]++
    for (const age of template.ageRanges) {
      byAgeRange[age]++
    }
    byRecurrence[template.recurrence]++
  }

  return {
    total: templates.length,
    byCategory,
    byAgeRange,
    byRecurrence,
    critical: templates.filter((t) => t.critical).length,
  }
}
