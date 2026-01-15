import { query, queryOne, insert, update, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import type {
  TaskTemplate,
  GeneratedTask,
  TaskGenerationResult,
} from "@/types/template"
import type { TaskCreate } from "@/types/task"
import { generateGenerationKey, generateYearlyKey, parseCronRule } from "@/lib/validations/template"
import { assignToLeastLoaded } from "@/lib/services/charge"

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
 * Calculate the next deadline for a template based on its cron rule
 */
export function calculateNextDeadline(
  cronRule: string | null,
  fromDate: Date = new Date()
): Date | null {
  if (!cronRule) return null

  const parsed = parseCronRule(cronRule)
  if (!parsed) return null

  const result = new Date(fromDate)
  result.setHours(0, 0, 0, 0)

  if (parsed.isPattern) {
    switch (parsed.pattern) {
      case "@yearly": {
        // Next January 1st
        result.setFullYear(result.getFullYear() + 1)
        result.setMonth(0)
        result.setDate(1)
        return result
      }
      case "@monthly": {
        // First of next month
        result.setMonth(result.getMonth() + 1)
        result.setDate(1)
        return result
      }
      case "@weekly": {
        // Next Sunday
        const daysUntilSunday = (7 - result.getDay()) % 7 || 7
        result.setDate(result.getDate() + daysUntilSunday)
        return result
      }
      case "@daily": {
        // Tomorrow
        result.setDate(result.getDate() + 1)
        return result
      }
      default:
        return null
    }
  }

  // Standard cron format: minute hour dayOfMonth month dayOfWeek
  const { dayOfMonth, month } = parsed

  if (!dayOfMonth || !month) return null

  // Parse day
  const day = dayOfMonth === "*" ? 1 : parseInt(dayOfMonth, 10)
  if (isNaN(day)) return null

  // Parse month (cron months are 1-12)
  let monthNum: number | null = null
  if (month !== "*") {
    monthNum = parseInt(month, 10)
    if (isNaN(monthNum)) return null
    monthNum = monthNum - 1 // Convert to 0-indexed
  }

  // Set the date
  if (monthNum !== null) {
    result.setMonth(monthNum)
  }
  result.setDate(day)

  // If the date is in the past or today, move to next occurrence
  if (result <= fromDate) {
    if (monthNum !== null) {
      // Yearly: move to next year
      result.setFullYear(result.getFullYear() + 1)
    } else {
      // Monthly: move to next month
      result.setMonth(result.getMonth() + 1)
    }
  }

  return result
}

/**
 * Determine if a template should generate a task for a child
 */
export function shouldGenerateTask(
  template: TaskTemplate,
  childAge: number,
  generatedTasks: Set<string>
): { shouldGenerate: boolean; reason?: string } {
  // Check age range
  if (childAge < template.age_min || childAge > template.age_max) {
    return { shouldGenerate: false, reason: "Age out of range" }
  }

  // Check if template is active
  if (!template.is_active) {
    return { shouldGenerate: false, reason: "Template inactive" }
  }

  // Check if already generated (using generation key)
  const deadline = calculateNextDeadline(template.cron_rule)
  if (deadline) {
    const generationKey = generateGenerationKey(template.id, deadline)
    if (generatedTasks.has(generationKey)) {
      return { shouldGenerate: false, reason: "Already generated" }
    }
  }

  return { shouldGenerate: true }
}

/**
 * Get current period based on month
 */
export function getCurrentPeriod(): string {
  const month = new Date().getMonth() + 1 // 1-12

  if (month >= 8 && month <= 9) return "rentree"
  if (month >= 10 && month <= 11) return "toussaint"
  if (month === 12) return "noel"
  if (month >= 1 && month <= 2) return "hiver"
  if (month >= 3 && month <= 5) return "printemps"
  return "ete"
}

/**
 * Check and generate tasks for all households (daily cron job)
 */
export async function checkAndGenerateTasks(): Promise<{
  householdsProcessed: number
  totalGenerated: number
  totalSkipped: number
  totalErrors: number
}> {
  const result = {
    householdsProcessed: 0,
    totalGenerated: 0,
    totalSkipped: 0,
    totalErrors: 0,
  }

  try {
    // Get all active households
    const households = await query<{ id: string }>(`
      SELECT DISTINCT h.id
      FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.is_active = true
    `)

    for (const household of households) {
      try {
        const householdResult = await generateTasksForHousehold(household.id)
        result.householdsProcessed++
        result.totalGenerated += householdResult.generated
        result.totalSkipped += householdResult.skipped
        result.totalErrors += householdResult.errors
      } catch (error) {
        console.error(`Error processing household ${household.id}:`, error)
        result.totalErrors++
      }
    }
  } catch (error) {
    console.error("Error in checkAndGenerateTasks:", error)
  }

  return result
}

/**
 * Generate tasks for a specific household
 */
export async function generateTasksForHousehold(
  householdId: string
): Promise<TaskGenerationResult> {
  const result: TaskGenerationResult = {
    generated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }

  try {
    // Get children with ages
    const children = await query<Child>(`
      SELECT id, first_name, birthdate, household_id
      FROM children
      WHERE household_id = $1
    `, [householdId])

    const childrenWithAges: ChildWithAge[] = children.map((c) => ({
      ...c,
      age: calculateAge(c.birthdate),
    }))

    if (childrenWithAges.length === 0) {
      return result
    }

    // Get templates applicable for this household
    const templates = await query<TaskTemplate>(`
      SELECT tt.*
      FROM task_templates tt
      LEFT JOIN household_template_settings hts
        ON hts.template_id = tt.id AND hts.household_id = $1
      WHERE tt.is_active = true
        AND (hts.is_enabled IS NULL OR hts.is_enabled = true)
    `, [householdId])

    // Get existing generated tasks for this household
    const existingGenerated = await query<{ generation_key: string }>(`
      SELECT generation_key
      FROM generated_tasks
      WHERE household_id = $1
    `, [householdId])

    const existingKeys = new Set(existingGenerated.map((g) => g.generation_key))

    const today = new Date()
    const lookAheadDays = 30

    for (const child of childrenWithAges) {
      for (const template of templates) {
        try {
          // Check if template applies to this child
          const { shouldGenerate, reason } = shouldGenerateTask(
            template,
            child.age,
            existingKeys
          )

          if (!shouldGenerate) {
            result.skipped++
            if (reason !== "Age out of range") {
              result.details.push({
                templateId: template.id,
                childId: child.id,
                success: false,
                error: reason,
              })
            }
            continue
          }

          // Calculate deadline
          const deadline = calculateNextDeadline(template.cron_rule, today)
          if (!deadline) {
            result.skipped++
            continue
          }

          // Check if within look-ahead window
          const daysUntil = Math.ceil(
            (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysUntil > lookAheadDays || daysUntil < -7) {
            result.skipped++
            continue
          }

          // Generate unique key
          const generationKey = generateGenerationKey(template.id, deadline)
          if (existingKeys.has(generationKey)) {
            result.skipped++
            continue
          }

          // Create generated task entry
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
    console.error(`Error generating tasks for household ${householdId}:`, error)
    result.errors++
  }

  return result
}

/**
 * Create actual task from generated task
 */
export async function createTaskFromGenerated(
  generatedTaskId: string,
  userId: string
): Promise<TaskCreate | null> {
  await setCurrentUser(userId)

  // Get generated task with template info
  const generated = await queryOne<GeneratedTask & {
    template_title: string
    template_description: string | null
    template_category: string
    template_weight: number
    child_first_name: string
    household_id: string
  }>(`
    SELECT
      gt.*,
      tt.title as template_title,
      tt.description as template_description,
      tt.category as template_category,
      tt.weight as template_weight,
      c.first_name as child_first_name,
      c.household_id
    FROM generated_tasks gt
    JOIN task_templates tt ON tt.id = gt.template_id
    JOIN children c ON c.id = gt.child_id
    WHERE gt.id = $1
  `, [generatedTaskId])

  if (!generated) return null

  // Get least loaded parent
  const assignedTo = await assignToLeastLoaded(generated.household_id)

  // Create the task
  const taskData: TaskCreate = {
    household_id: generated.household_id,
    title: `${generated.template_title} - ${generated.child_first_name}`,
    description: generated.template_description,
    category_id: null, // Would need to map category string to ID
    child_id: generated.child_id,
    assigned_to: assignedTo,
    deadline: generated.deadline,
    deadline_flexible: true,
    priority: "normal",
    load_weight: generated.template_weight,
    is_critical: false,
    source: "auto",
    template_id: generated.template_id,
  }

  // Insert the task
  const task = await insert<{ id: string }>("tasks", {
    ...taskData,
    status: "pending",
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (task) {
    // Update generated task status
    await update("generated_tasks", generatedTaskId, {
      status: "created",
      task_id: task.id,
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
  }

  return taskData
}

/**
 * Skip a generated task
 */
export async function skipGeneratedTask(
  generatedTaskId: string,
  userId: string
): Promise<boolean> {
  await setCurrentUser(userId)

  const result = await update("generated_tasks", generatedTaskId, {
    status: "skipped",
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: userId,
  })

  return result !== null
}

/**
 * Get deadline summary for dashboard
 */
export async function getDeadlineSummary(
  householdId: string
): Promise<{
  overdue: number
  today: number
  thisWeek: number
  thisMonth: number
}> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return { overdue: 0, today: 0, thisWeek: 0, thisMonth: 0 }
  }

  await setCurrentUser(currentUserId)

  try {
    const result = await queryOne<{
      overdue: string
      today: string
      this_week: string
      this_month: string
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status = 'pending') as overdue,
        COUNT(*) FILTER (WHERE deadline = CURRENT_DATE AND status = 'pending') as today,
        COUNT(*) FILTER (WHERE deadline >= CURRENT_DATE AND deadline < CURRENT_DATE + INTERVAL '7 days' AND status = 'pending') as this_week,
        COUNT(*) FILTER (WHERE deadline >= CURRENT_DATE AND deadline < CURRENT_DATE + INTERVAL '30 days' AND status = 'pending') as this_month
      FROM tasks
      WHERE household_id = $1
    `, [householdId])

    return {
      overdue: parseInt(result?.overdue ?? "0", 10),
      today: parseInt(result?.today ?? "0", 10),
      thisWeek: parseInt(result?.this_week ?? "0", 10),
      thisMonth: parseInt(result?.this_month ?? "0", 10),
    }
  } catch {
    return { overdue: 0, today: 0, thisWeek: 0, thisMonth: 0 }
  }
}

/**
 * Get tasks by deadline range
 */
export async function getTasksByDeadlineRange(
  householdId: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: string; count: number; weight: number }[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  try {
    const results = await query<{ date: string; count: string; weight: string }>(`
      SELECT
        deadline::text as date,
        COUNT(*) as count,
        COALESCE(SUM(load_weight), 0) as weight
      FROM tasks
      WHERE household_id = $1
        AND deadline >= $2
        AND deadline <= $3
        AND status = 'pending'
      GROUP BY deadline
      ORDER BY deadline
    `, [householdId, startDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]])

    return results.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
      weight: parseInt(r.weight, 10),
    }))
  } catch {
    return []
  }
}
