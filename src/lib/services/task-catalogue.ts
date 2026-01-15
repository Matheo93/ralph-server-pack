/**
 * Task Catalogue Service
 *
 * Generates automatic tasks based on:
 * - Child age (vaccinations, school milestones)
 * - Season/period (rentrée, holidays)
 * - Country-specific regulations
 */

import { query, queryOne, insert } from "@/lib/aws/database"

// =============================================================================
// TYPES
// =============================================================================

export interface CatalogueTask {
  id: string
  title_fr: string
  title_en: string | null
  description_fr: string | null
  category_code: string
  min_age_months: number | null
  max_age_months: number | null
  periods: string[]
  recurrence: "once" | "yearly" | "monthly" | "custom"
  typical_deadline_days: number
  charge_weight: number
  country_codes: string[]
  tags: string[]
}

export interface CatalogueSuggestion {
  catalogueTask: CatalogueTask
  childId: string | null
  childName: string | null
  suggestedDeadline: Date
  relevanceScore: number
  reason: string
}

export interface GeneratedTask {
  title: string
  description: string | null
  childId: string | null
  categoryCode: string
  deadline: Date
  chargeWeight: number
  source: "catalogue"
  catalogueTaskId: string
}

// =============================================================================
// CATALOGUE BUILT-IN DATA
// =============================================================================

/**
 * French vaccination schedule by age (months)
 */
const VACCINATION_SCHEDULE: Array<{ ageMonths: number; vaccine: string }> = [
  { ageMonths: 2, vaccine: "DTCaP-Hib-HepB + Pneumocoque" },
  { ageMonths: 4, vaccine: "DTCaP-Hib-HepB + Pneumocoque (2e dose)" },
  { ageMonths: 5, vaccine: "Méningocoque C" },
  { ageMonths: 11, vaccine: "DTCaP-Hib-HepB + Pneumocoque (rappel)" },
  { ageMonths: 12, vaccine: "Méningocoque C + ROR" },
  { ageMonths: 16, vaccine: "ROR (2e dose)" },
  { ageMonths: 72, vaccine: "DTCaP (rappel 6 ans)" }, // 6 years
  { ageMonths: 132, vaccine: "dTcaP (rappel 11-13 ans)" }, // 11 years
  { ageMonths: 156, vaccine: "Méningocoque ACWY" }, // 13 years
]

/**
 * School milestones by age
 */
const SCHOOL_MILESTONES: Array<{ ageMonths: number; milestone: string; category: string }> = [
  { ageMonths: 30, milestone: "Inscription crèche/halte-garderie", category: "administratif" },
  { ageMonths: 33, milestone: "Inscription maternelle", category: "administratif" },
  { ageMonths: 72, milestone: "Inscription CP", category: "administratif" },
  { ageMonths: 132, milestone: "Inscription collège (6ème)", category: "administratif" },
  { ageMonths: 180, milestone: "Inscription lycée (2nde)", category: "administratif" },
]

/**
 * Seasonal tasks by period
 */
const SEASONAL_TASKS: Array<{
  periods: string[]
  title: string
  description: string
  category: string
  chargeWeight: number
  ageRange?: { min?: number; max?: number }
}> = [
  // September - Back to school
  {
    periods: ["september"],
    title: "Fournitures scolaires",
    description: "Acheter les fournitures de la liste de l'école",
    category: "ecole",
    chargeWeight: 4,
    ageRange: { min: 36 },
  },
  {
    periods: ["september"],
    title: "Vérifier assurance scolaire",
    description: "Renouveler l'assurance scolaire et responsabilité civile",
    category: "administratif",
    chargeWeight: 3,
    ageRange: { min: 36 },
  },
  {
    periods: ["september"],
    title: "Inscription cantine",
    description: "Renouveler l'inscription à la cantine scolaire",
    category: "ecole",
    chargeWeight: 2,
    ageRange: { min: 36 },
  },
  {
    periods: ["september"],
    title: "Réinscription activités",
    description: "Réinscrire aux activités extra-scolaires",
    category: "activites",
    chargeWeight: 3,
  },
  // October
  {
    periods: ["october"],
    title: "Réunion parents-professeurs",
    description: "Prendre RDV pour la réunion de rentrée",
    category: "ecole",
    chargeWeight: 4,
    ageRange: { min: 36 },
  },
  // December
  {
    periods: ["december"],
    title: "Cadeaux de Noël",
    description: "Préparer et acheter les cadeaux de Noël",
    category: "social",
    chargeWeight: 5,
  },
  {
    periods: ["december"],
    title: "Carte de voeux / photos famille",
    description: "Préparer les cartes de voeux ou la photo de famille",
    category: "social",
    chargeWeight: 2,
  },
  // January
  {
    periods: ["january"],
    title: "Déclaration CAF",
    description: "Mettre à jour les informations auprès de la CAF",
    category: "administratif",
    chargeWeight: 4,
  },
  {
    periods: ["january"],
    title: "Inscription centres de loisirs vacances",
    description: "Réserver les centres aérés pour les vacances",
    category: "logistique",
    chargeWeight: 3,
    ageRange: { min: 36, max: 144 },
  },
  // March
  {
    periods: ["march"],
    title: "Déclaration revenus",
    description: "Préparer les éléments pour la déclaration d'impôts",
    category: "administratif",
    chargeWeight: 5,
  },
  // June
  {
    periods: ["june"],
    title: "Réinscription école",
    description: "Confirmer l'inscription pour l'année prochaine",
    category: "administratif",
    chargeWeight: 3,
    ageRange: { min: 36 },
  },
  {
    periods: ["june"],
    title: "Cahier de vacances",
    description: "Acheter le cahier de vacances adapté au niveau",
    category: "ecole",
    chargeWeight: 2,
    ageRange: { min: 72, max: 144 },
  },
  // Recurring monthly
  {
    periods: ["monthly"],
    title: "Visite pédiatre",
    description: "Rendez-vous mensuel de suivi chez le pédiatre",
    category: "sante",
    chargeWeight: 3,
    ageRange: { max: 12 },
  },
  // Recurring yearly
  {
    periods: ["yearly"],
    title: "Bilan dentaire annuel",
    description: "Contrôle dentaire annuel",
    category: "sante",
    chargeWeight: 3,
    ageRange: { min: 24 },
  },
  {
    periods: ["yearly"],
    title: "Bilan ophtalmique",
    description: "Contrôle de la vue annuel",
    category: "sante",
    chargeWeight: 3,
    ageRange: { min: 36 },
  },
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate age in months from birth date
 */
export function calculateAgeMonths(birthDate: Date): number {
  const now = new Date()
  return (
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth())
  )
}

/**
 * Get current month name in lowercase
 */
export function getCurrentPeriod(): string {
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ]
  return months[new Date().getMonth()] ?? "january"
}

/**
 * Check if task already exists for this household/child
 */
async function taskExists(
  householdId: string,
  title: string,
  childId: string | null,
  catalogueTaskId: string | null
): Promise<boolean> {
  const existing = await queryOne<{ id: string }>(`
    SELECT id FROM tasks
    WHERE household_id = $1
      AND title = $2
      AND ($3::uuid IS NULL OR child_id = $3)
      AND ($4::uuid IS NULL OR catalogue_task_id = $4)
      AND status IN ('pending', 'in_progress')
      AND created_at > NOW() - INTERVAL '30 days'
  `, [householdId, title, childId, catalogueTaskId])

  return !!existing
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get vaccination tasks for a child based on age
 */
export function getVaccinationTasks(birthDate: Date): CatalogueSuggestion[] {
  const ageMonths = calculateAgeMonths(birthDate)
  const suggestions: CatalogueSuggestion[] = []

  // Find upcoming vaccinations (within next 3 months)
  for (const vax of VACCINATION_SCHEDULE) {
    const monthsUntil = vax.ageMonths - ageMonths

    if (monthsUntil > 0 && monthsUntil <= 3) {
      const suggestedDeadline = new Date()
      suggestedDeadline.setMonth(suggestedDeadline.getMonth() + monthsUntil)

      suggestions.push({
        catalogueTask: {
          id: `vax-${vax.ageMonths}`,
          title_fr: `Vaccin: ${vax.vaccine}`,
          title_en: `Vaccination: ${vax.vaccine}`,
          description_fr: `Prendre rendez-vous pour le vaccin ${vax.vaccine} (${Math.floor(vax.ageMonths / 12)} ans)`,
          category_code: "sante",
          min_age_months: vax.ageMonths - 1,
          max_age_months: vax.ageMonths + 2,
          periods: [],
          recurrence: "once",
          typical_deadline_days: 30,
          charge_weight: 4,
          country_codes: ["FR"],
          tags: ["vaccin", "sante", "obligatoire"],
        },
        childId: null,
        childName: null,
        suggestedDeadline,
        relevanceScore: 0.9,
        reason: `Vaccin recommandé à ${Math.floor(vax.ageMonths / 12)} ans ${vax.ageMonths % 12} mois`,
      })
    }
  }

  return suggestions
}

/**
 * Get school milestone tasks for a child based on age
 */
export function getSchoolMilestoneTasks(birthDate: Date): CatalogueSuggestion[] {
  const ageMonths = calculateAgeMonths(birthDate)
  const suggestions: CatalogueSuggestion[] = []

  for (const milestone of SCHOOL_MILESTONES) {
    const monthsUntil = milestone.ageMonths - ageMonths

    // Show milestones 6 months in advance for planning
    if (monthsUntil > 0 && monthsUntil <= 6) {
      const suggestedDeadline = new Date()
      suggestedDeadline.setMonth(suggestedDeadline.getMonth() + Math.max(1, monthsUntil - 2))

      suggestions.push({
        catalogueTask: {
          id: `school-${milestone.ageMonths}`,
          title_fr: milestone.milestone,
          title_en: null,
          description_fr: `À faire avant ${Math.floor(milestone.ageMonths / 12)} ans`,
          category_code: milestone.category,
          min_age_months: milestone.ageMonths - 6,
          max_age_months: milestone.ageMonths + 1,
          periods: [],
          recurrence: "once",
          typical_deadline_days: 60,
          charge_weight: 5,
          country_codes: ["FR"],
          tags: ["ecole", "administratif", "inscription"],
        },
        childId: null,
        childName: null,
        suggestedDeadline,
        relevanceScore: 0.85,
        reason: `Inscription requise avant ${Math.floor(milestone.ageMonths / 12)} ans`,
      })
    }
  }

  return suggestions
}

/**
 * Get seasonal tasks for current period
 */
export function getSeasonalTasks(
  childBirthDate?: Date,
  householdCountry: string = "FR"
): CatalogueSuggestion[] {
  const currentPeriod = getCurrentPeriod()
  const suggestions: CatalogueSuggestion[] = []
  const ageMonths = childBirthDate ? calculateAgeMonths(childBirthDate) : null

  for (const task of SEASONAL_TASKS) {
    // Check if task applies to current period
    if (!task.periods.includes(currentPeriod) && !task.periods.includes("yearly") && !task.periods.includes("monthly")) {
      continue
    }

    // Check age range if specified
    if (ageMonths !== null && task.ageRange) {
      if (task.ageRange.min && ageMonths < task.ageRange.min) continue
      if (task.ageRange.max && ageMonths > task.ageRange.max) continue
    }

    // Skip age-restricted tasks if no child
    if (ageMonths === null && task.ageRange) continue

    const suggestedDeadline = new Date()
    suggestedDeadline.setDate(suggestedDeadline.getDate() + 14) // 2 weeks default

    suggestions.push({
      catalogueTask: {
        id: `seasonal-${task.title.replace(/\s/g, "-").toLowerCase()}`,
        title_fr: task.title,
        title_en: null,
        description_fr: task.description,
        category_code: task.category,
        min_age_months: task.ageRange?.min ?? null,
        max_age_months: task.ageRange?.max ?? null,
        periods: task.periods,
        recurrence: task.periods.includes("monthly") ? "monthly" : "yearly",
        typical_deadline_days: 14,
        charge_weight: task.chargeWeight,
        country_codes: [householdCountry],
        tags: [task.category, currentPeriod],
      },
      childId: null,
      childName: null,
      suggestedDeadline,
      relevanceScore: 0.75,
      reason: `Tâche saisonnière (${currentPeriod})`,
    })
  }

  return suggestions
}

/**
 * Get all catalogue suggestions for a household
 */
export async function getCatalogueSuggestions(
  householdId: string
): Promise<CatalogueSuggestion[]> {
  const suggestions: CatalogueSuggestion[] = []

  // Get household country
  const household = await queryOne<{ country: string }>(`
    SELECT country FROM households WHERE id = $1
  `, [householdId])
  const country = household?.country ?? "FR"

  // Get children
  const children = await query<{
    id: string
    first_name: string
    birth_date: string
  }>(`
    SELECT id, first_name, birth_date::text
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  // Generate suggestions for each child
  for (const child of children) {
    const birthDate = new Date(child.birth_date)

    // Vaccinations
    const vaxSuggestions = getVaccinationTasks(birthDate)
    for (const s of vaxSuggestions) {
      s.childId = child.id
      s.childName = child.first_name
      suggestions.push(s)
    }

    // School milestones
    const schoolSuggestions = getSchoolMilestoneTasks(birthDate)
    for (const s of schoolSuggestions) {
      s.childId = child.id
      s.childName = child.first_name
      suggestions.push(s)
    }

    // Seasonal (child-specific)
    const seasonalChildSuggestions = getSeasonalTasks(birthDate, country)
    for (const s of seasonalChildSuggestions) {
      s.childId = child.id
      s.childName = child.first_name
      suggestions.push(s)
    }
  }

  // Household-level seasonal tasks
  const householdSeasonalSuggestions = getSeasonalTasks(undefined, country)
  suggestions.push(...householdSeasonalSuggestions)

  // Filter out already existing tasks
  const filteredSuggestions: CatalogueSuggestion[] = []
  for (const s of suggestions) {
    const exists = await taskExists(
      householdId,
      s.catalogueTask.title_fr,
      s.childId,
      null
    )
    if (!exists) {
      filteredSuggestions.push(s)
    }
  }

  // Sort by relevance
  return filteredSuggestions.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

/**
 * Generate automatic tasks from suggestions
 */
export async function generateAutomaticTasks(
  householdId: string,
  maxTasks: number = 5
): Promise<GeneratedTask[]> {
  const suggestions = await getCatalogueSuggestions(householdId)
  const generatedTasks: GeneratedTask[] = []

  for (const suggestion of suggestions.slice(0, maxTasks)) {
    generatedTasks.push({
      title: suggestion.catalogueTask.title_fr,
      description: suggestion.catalogueTask.description_fr,
      childId: suggestion.childId,
      categoryCode: suggestion.catalogueTask.category_code,
      deadline: suggestion.suggestedDeadline,
      chargeWeight: suggestion.catalogueTask.charge_weight,
      source: "catalogue",
      catalogueTaskId: suggestion.catalogueTask.id,
    })
  }

  return generatedTasks
}

/**
 * Create tasks in database from generated tasks
 */
export async function createTasksFromCatalogue(
  householdId: string,
  userId: string,
  tasks: GeneratedTask[]
): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0

  for (const task of tasks) {
    // Check if already exists
    const exists = await taskExists(householdId, task.title, task.childId, null)
    if (exists) {
      skipped++
      continue
    }

    // Get category ID
    const category = await queryOne<{ id: string }>(`
      SELECT id FROM task_categories WHERE code = $1
    `, [task.categoryCode])

    if (!category) {
      skipped++
      continue
    }

    // Create task
    await insert("tasks", {
      title: task.title,
      description: task.description,
      household_id: householdId,
      child_id: task.childId,
      category_id: category.id,
      deadline: task.deadline.toISOString(),
      priority: "normal",
      status: "pending",
      source: "catalogue",
      charge_weight: task.chargeWeight,
      created_by: userId,
    })

    created++
  }

  return { created, skipped }
}

/**
 * Get catalogue categories with counts
 */
export function getCatalogueCategories(): Array<{ code: string; name: string; taskCount: number }> {
  const categories: Record<string, number> = {}

  // Count from vaccinations
  for (const _vax of VACCINATION_SCHEDULE) {
    categories["sante"] = (categories["sante"] ?? 0) + 1
  }

  // Count from school milestones
  for (const milestone of SCHOOL_MILESTONES) {
    categories[milestone.category] = (categories[milestone.category] ?? 0) + 1
  }

  // Count from seasonal
  for (const task of SEASONAL_TASKS) {
    categories[task.category] = (categories[task.category] ?? 0) + 1
  }

  const categoryNames: Record<string, string> = {
    sante: "Santé",
    ecole: "École",
    administratif: "Administratif",
    social: "Social",
    activites: "Activités",
    logistique: "Logistique",
    quotidien: "Quotidien",
  }

  return Object.entries(categories).map(([code, count]) => ({
    code,
    name: categoryNames[code] ?? code,
    taskCount: count,
  }))
}

/**
 * Search catalogue tasks
 */
export function searchCatalogueTasks(searchQuery: string): CatalogueTask[] {
  const query = searchQuery.toLowerCase()
  const results: CatalogueTask[] = []

  // Search vaccinations
  for (const vax of VACCINATION_SCHEDULE) {
    if (vax.vaccine.toLowerCase().includes(query)) {
      results.push({
        id: `vax-${vax.ageMonths}`,
        title_fr: `Vaccin: ${vax.vaccine}`,
        title_en: null,
        description_fr: null,
        category_code: "sante",
        min_age_months: vax.ageMonths - 1,
        max_age_months: vax.ageMonths + 2,
        periods: [],
        recurrence: "once",
        typical_deadline_days: 30,
        charge_weight: 4,
        country_codes: ["FR"],
        tags: ["vaccin"],
      })
    }
  }

  // Search seasonal tasks
  for (const task of SEASONAL_TASKS) {
    if (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    ) {
      results.push({
        id: `seasonal-${task.title.replace(/\s/g, "-")}`,
        title_fr: task.title,
        title_en: null,
        description_fr: task.description,
        category_code: task.category,
        min_age_months: task.ageRange?.min ?? null,
        max_age_months: task.ageRange?.max ?? null,
        periods: task.periods,
        recurrence: task.periods.includes("monthly") ? "monthly" : "yearly",
        typical_deadline_days: 14,
        charge_weight: task.chargeWeight,
        country_codes: ["FR"],
        tags: [task.category],
      })
    }
  }

  return results
}
