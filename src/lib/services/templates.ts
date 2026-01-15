import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { allTemplatesFR, getTemplatesForAge } from "@/lib/data/templates-fr"
import type {
  TaskTemplate,
  TaskTemplateFilter,
  GeneratedTask,
  GeneratedTaskWithRelations,
  TemplateWithSettings,
  UpcomingTaskPreview,
  TaskGenerationResult,
  CalendarPreview,
  TaskCalendarEntry,
} from "@/types/template"
import { generateGenerationKey } from "@/lib/validations/template"

interface Child {
  id: string
  first_name: string
  birthdate: string
  household_id: string
}

interface ChildWithAge extends Child {
  age: number
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
  return age
}

/**
 * Get all templates from database (with fallback to static data)
 */
export async function getTemplates(
  filters?: TaskTemplateFilter
): Promise<TaskTemplate[]> {
  const conditions: string[] = ["is_active = true"]
  const params: unknown[] = []
  let paramIndex = 1

  if (filters?.country) {
    conditions.push(`country = $${paramIndex++}`)
    params.push(filters.country)
  }

  if (filters?.age !== undefined) {
    conditions.push(`age_min <= $${paramIndex} AND age_max >= $${paramIndex}`)
    params.push(filters.age)
    paramIndex++
  }

  if (filters?.category) {
    conditions.push(`category = $${paramIndex++}`)
    params.push(filters.category)
  }

  if (filters?.period) {
    conditions.push(`(period = $${paramIndex} OR period = 'year_round')`)
    params.push(filters.period)
    paramIndex++
  }

  if (filters?.search) {
    conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const limit = filters?.limit ?? 100
  const offset = filters?.offset ?? 0

  try {
    const templates = await query<TaskTemplate>(`
      SELECT * FROM task_templates
      ${whereClause}
      ORDER BY category, age_min, title
      LIMIT ${limit} OFFSET ${offset}
    `, params)

    return templates
  } catch {
    // Fallback to static templates if table doesn't exist
    console.warn("task_templates table not found, using static data")
    return filterStaticTemplates(filters)
  }
}

/**
 * Filter static templates (fallback when DB table doesn't exist)
 */
function filterStaticTemplates(filters?: TaskTemplateFilter): TaskTemplate[] {
  let templates = allTemplatesFR.map((t, i) => ({
    ...t,
    id: `static-${i}`,
    country: t.country ?? "FR",
    subcategory: t.subcategory ?? null,
    description: t.description ?? null,
    cron_rule: t.cron_rule ?? null,
    period: t.period ?? null,
    is_active: t.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })) as TaskTemplate[]

  if (filters?.country) {
    templates = templates.filter((t) => t.country === filters.country)
  }

  if (filters?.age !== undefined) {
    templates = templates.filter(
      (t) => filters.age !== undefined && t.age_min <= filters.age && t.age_max >= filters.age
    )
  }

  if (filters?.category) {
    templates = templates.filter((t) => t.category === filters.category)
  }

  if (filters?.period) {
    templates = templates.filter(
      (t) => t.period === filters.period || t.period === "year_round"
    )
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase()
    templates = templates.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
    )
  }

  const offset = filters?.offset ?? 0
  const limit = filters?.limit ?? 100

  return templates.slice(offset, offset + limit)
}

/**
 * Get templates applicable to a specific child based on their age
 */
export async function getTemplatesForChild(
  childId: string
): Promise<TaskTemplate[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  const child = await queryOne<Child>(`
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE id = $1
  `, [childId])

  if (!child) return []

  const age = calculateAge(child.birthdate)
  return getTemplates({ age, country: "FR" })
}

/**
 * Get templates with household settings
 */
export async function getTemplatesWithSettings(
  householdId: string
): Promise<TemplateWithSettings[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  try {
    const results = await query<TaskTemplate & {
      settings_id: string | null
      settings_is_enabled: boolean | null
      settings_custom_days_before: number | null
      settings_custom_weight: number | null
    }>(`
      SELECT
        tt.*,
        hts.id as settings_id,
        hts.is_enabled as settings_is_enabled,
        hts.custom_days_before as settings_custom_days_before,
        hts.custom_weight as settings_custom_weight
      FROM task_templates tt
      LEFT JOIN household_template_settings hts
        ON hts.template_id = tt.id AND hts.household_id = $1
      WHERE tt.is_active = true
      ORDER BY tt.category, tt.age_min, tt.title
    `, [householdId])

    return results.map((r) => ({
      ...r,
      settings: r.settings_id
        ? {
          id: r.settings_id,
          household_id: householdId,
          template_id: r.id,
          is_enabled: r.settings_is_enabled ?? true,
          custom_days_before: r.settings_custom_days_before,
          custom_weight: r.settings_custom_weight,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }
        : null,
      effectiveDaysBefore: r.settings_custom_days_before ?? r.days_before_deadline,
      effectiveWeight: r.settings_custom_weight ?? r.weight,
      isEnabledForHousehold: r.settings_is_enabled ?? true,
    }))
  } catch {
    // Fallback to static templates
    console.warn("Using static templates as fallback")
    return allTemplatesFR.map((t, i) => ({
      ...t,
      id: `static-${i}`,
      country: t.country ?? "FR",
      subcategory: t.subcategory ?? null,
      description: t.description ?? null,
      cron_rule: t.cron_rule ?? null,
      period: t.period ?? null,
      is_active: t.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: null,
      effectiveDaysBefore: t.days_before_deadline ?? 7,
      effectiveWeight: t.weight ?? 3,
      isEnabledForHousehold: true,
    })) as TemplateWithSettings[]
  }
}

/**
 * Get children for a household with their ages
 */
async function getHouseholdChildrenWithAges(
  householdId: string
): Promise<ChildWithAge[]> {
  const children = await query<Child>(`
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE household_id = $1
    ORDER BY birthdate DESC
  `, [householdId])

  return children.map((c) => ({
    ...c,
    age: calculateAge(c.birthdate),
  }))
}

/**
 * Get upcoming tasks from templates for a household
 */
export async function getUpcomingTemplates(
  householdId: string,
  days: number = 30
): Promise<UpcomingTaskPreview[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  const children = await getHouseholdChildrenWithAges(householdId)
  if (children.length === 0) return []

  const upcoming: UpcomingTaskPreview[] = []
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + days)

  // Get templates with settings
  const templates = await getTemplatesWithSettings(householdId)

  // For each child, find applicable templates
  for (const child of children) {
    const childTemplates = templates.filter(
      (t) =>
        t.isEnabledForHousehold &&
        child.age >= t.age_min &&
        child.age <= t.age_max
    )

    for (const template of childTemplates) {
      // Check if this template should generate a task soon
      const deadline = calculateNextDeadline(template, today)
      if (!deadline || deadline > endDate) continue

      // Check if already generated
      const generationKey = generateGenerationKey(template.id, deadline)
      const existing = await queryOne<{ id: string }>(`
        SELECT id FROM generated_tasks
        WHERE template_id = $1 AND child_id = $2 AND generation_key = $3
      `, [template.id, child.id, generationKey]).catch(() => null)

      if (existing) continue

      const daysUntil = Math.ceil(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      upcoming.push({
        template,
        child: {
          id: child.id,
          first_name: child.first_name,
          age: child.age,
        },
        deadline: deadline.toISOString().split("T")[0] ?? "",
        daysUntil,
        status: daysUntil < 0 ? "overdue" : daysUntil <= 7 ? "due_soon" : "upcoming",
        canSkip: true,
      })
    }
  }

  // Sort by deadline
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)

  return upcoming
}

/**
 * Calculate next deadline based on cron rule
 */
function calculateNextDeadline(
  template: TaskTemplate,
  fromDate: Date
): Date | null {
  if (!template.cron_rule) {
    // One-time template, check if applicable based on age
    return null
  }

  const rule = template.cron_rule

  // Handle special patterns
  if (rule === "@yearly") {
    const next = new Date(fromDate)
    next.setFullYear(next.getFullYear() + 1)
    next.setMonth(0)
    next.setDate(1)
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
    next.setDate(next.getDate() + (7 - next.getDay()))
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
  const month = parseInt(monthStr ?? "*", 10)

  if (isNaN(day) || isNaN(month)) return null

  const next = new Date(fromDate)

  // Set month and day
  if (month !== 0 && !isNaN(month)) {
    next.setMonth(month - 1) // Month is 0-indexed
  }
  next.setDate(day)

  // If date is in the past, move to next year
  if (next <= fromDate) {
    next.setFullYear(next.getFullYear() + 1)
  }

  return next
}

/**
 * Generate tasks from templates for all children in a household
 */
export async function generateTasksFromTemplates(
  householdId: string
): Promise<TaskGenerationResult> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return { generated: 0, skipped: 0, errors: 0, details: [] }
  }

  await setCurrentUser(currentUserId)

  const result: TaskGenerationResult = {
    generated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }

  const children = await getHouseholdChildrenWithAges(householdId)
  if (children.length === 0) return result

  const templates = await getTemplatesWithSettings(householdId)
  const today = new Date()
  const lookAheadDays = 30 // Look 30 days ahead

  for (const child of children) {
    const childTemplates = templates.filter(
      (t) =>
        t.isEnabledForHousehold &&
        child.age >= t.age_min &&
        child.age <= t.age_max
    )

    for (const template of childTemplates) {
      try {
        const deadline = calculateNextDeadline(template, today)
        if (!deadline) {
          result.skipped++
          continue
        }

        // Check if deadline is within look-ahead window
        const daysUntil = Math.ceil(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysUntil > lookAheadDays || daysUntil < 0) {
          result.skipped++
          continue
        }

        // Check if already generated
        const generationKey = generateGenerationKey(template.id, deadline)
        const existing = await queryOne<{ id: string }>(`
          SELECT id FROM generated_tasks
          WHERE template_id = $1 AND child_id = $2 AND generation_key = $3
        `, [template.id, child.id, generationKey]).catch(() => null)

        if (existing) {
          result.skipped++
          result.details.push({
            templateId: template.id,
            childId: child.id,
            success: false,
            error: "Already generated",
          })
          continue
        }

        // Generate the task entry
        await insert<GeneratedTask>("generated_tasks", {
          template_id: template.id,
          child_id: child.id,
          household_id: householdId,
          deadline: deadline.toISOString().split("T")[0],
          generation_key: generationKey,
          status: "pending",
          acknowledged: false,
        })

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

  return result
}

/**
 * Get pending generated tasks awaiting user action
 */
export async function getPendingGeneratedTasks(
  householdId: string
): Promise<GeneratedTaskWithRelations[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  try {
    const results = await query<GeneratedTask & {
      template_id: string
      template_title: string
      template_description: string | null
      template_category: string
      template_weight: number
      child_first_name: string
      child_birthdate: string
    }>(`
      SELECT
        gt.*,
        tt.id as template_id,
        tt.title as template_title,
        tt.description as template_description,
        tt.category as template_category,
        tt.weight as template_weight,
        c.first_name as child_first_name,
        c.birthdate as child_birthdate
      FROM generated_tasks gt
      JOIN task_templates tt ON tt.id = gt.template_id
      JOIN children c ON c.id = gt.child_id
      WHERE gt.household_id = $1
        AND gt.status = 'pending'
        AND gt.acknowledged = false
      ORDER BY gt.deadline ASC
    `, [householdId])

    return results.map((r) => ({
      ...r,
      template: {
        id: r.template_id,
        country: "FR",
        age_min: 0,
        age_max: 18,
        category: r.template_category,
        subcategory: null,
        title: r.template_title,
        description: r.template_description,
        cron_rule: null,
        weight: r.template_weight,
        days_before_deadline: 7,
        period: null,
        is_active: true,
        created_at: r.generated_at,
        updated_at: r.generated_at,
      },
      child: {
        id: r.child_id,
        first_name: r.child_first_name,
        birthdate: r.child_birthdate,
      },
    }))
  } catch {
    return []
  }
}

/**
 * Generate calendar preview for upcoming automatic tasks
 */
export async function getCalendarPreview(
  householdId: string,
  months: number = 3
): Promise<CalendarPreview> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return {
      startDate: new Date().toISOString().split("T")[0] ?? "",
      endDate: new Date().toISOString().split("T")[0] ?? "",
      entries: [],
      totalTasks: 0,
      totalWeight: 0,
    }
  }

  await setCurrentUser(currentUserId)

  const startDate = new Date()
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + months)

  const children = await getHouseholdChildrenWithAges(householdId)
  const templates = await getTemplatesWithSettings(householdId)

  const entriesMap: Map<string, TaskCalendarEntry> = new Map()
  let totalTasks = 0
  let totalWeight = 0

  for (const child of children) {
    const childTemplates = templates.filter(
      (t) =>
        t.isEnabledForHousehold &&
        child.age >= t.age_min &&
        child.age <= t.age_max
    )

    for (const template of childTemplates) {
      const deadline = calculateNextDeadline(template, startDate)
      if (!deadline || deadline > endDate) continue

      const dateKey = deadline.toISOString().split("T")[0] ?? ""
      let entry = entriesMap.get(dateKey)
      if (!entry) {
        entry = { date: dateKey, tasks: [] }
        entriesMap.set(dateKey, entry)
      }

      entry.tasks.push({
        templateId: template.id,
        templateTitle: template.title,
        childId: child.id,
        childName: child.first_name,
        category: template.category,
        weight: template.effectiveWeight,
        isAutomatic: true,
      })

      totalTasks++
      totalWeight += template.effectiveWeight
    }
  }

  const entries = Array.from(entriesMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    startDate: startDate.toISOString().split("T")[0] ?? "",
    endDate: endDate.toISOString().split("T")[0] ?? "",
    entries,
    totalTasks,
    totalWeight,
  }
}

/**
 * Get template count by category
 */
export function getTemplateCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const template of allTemplatesFR) {
    counts[template.category] = (counts[template.category] ?? 0) + 1
  }
  return counts
}

/**
 * Get templates count by age group
 */
export function getTemplateCountsByAge(): Record<string, number> {
  const ageGroups = ["0-3", "3-6", "6-11", "11-15", "15-18"]
  const counts: Record<string, number> = {}

  for (const group of ageGroups) {
    const [minStr, maxStr] = group.split("-")
    const min = parseInt(minStr ?? "0", 10)
    const max = parseInt(maxStr ?? "18", 10)
    counts[group] = getTemplatesForAge(min).filter(
      (t) => t.age_max >= min && t.age_min <= max
    ).length
  }

  return counts
}
