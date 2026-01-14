import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import type { RecurrenceRule } from "@/lib/validations/task"
import type { TaskCreate, Task } from "@/types/task"

/**
 * Day of week names in French
 */
const DAYS_FR = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
]

/**
 * Month names in French
 */
const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

/**
 * Get a human-readable label for a recurrence rule
 */
export function getRecurrenceLabel(rule: RecurrenceRule | null): string {
  if (!rule) return "Aucune récurrence"

  const { frequency, interval, byDayOfWeek, byDayOfMonth, byMonth } = rule

  // Simple cases
  if (interval === 1 && !byDayOfWeek?.length && !byDayOfMonth?.length && !byMonth?.length) {
    switch (frequency) {
      case "daily":
        return "Tous les jours"
      case "weekly":
        return "Toutes les semaines"
      case "monthly":
        return "Tous les mois"
      case "yearly":
        return "Tous les ans"
    }
  }

  // Build complex label
  const parts: string[] = []

  // Frequency with interval
  if (interval > 1) {
    switch (frequency) {
      case "daily":
        parts.push(`Tous les ${interval} jours`)
        break
      case "weekly":
        parts.push(`Toutes les ${interval} semaines`)
        break
      case "monthly":
        parts.push(`Tous les ${interval} mois`)
        break
      case "yearly":
        parts.push(`Tous les ${interval} ans`)
        break
    }
  } else {
    switch (frequency) {
      case "daily":
        parts.push("Chaque jour")
        break
      case "weekly":
        parts.push("Chaque semaine")
        break
      case "monthly":
        parts.push("Chaque mois")
        break
      case "yearly":
        parts.push("Chaque année")
        break
    }
  }

  // Days of week
  if (byDayOfWeek && byDayOfWeek.length > 0) {
    const dayNames = byDayOfWeek.map((d) => DAYS_FR[d] ?? "").filter(Boolean)
    if (dayNames.length === 1) {
      parts.push(`le ${dayNames[0]}`)
    } else if (dayNames.length === 2) {
      parts.push(`les ${dayNames.join(" et ")}`)
    } else {
      const lastDay = dayNames.pop()
      parts.push(`les ${dayNames.join(", ")} et ${lastDay}`)
    }
  }

  // Days of month
  if (byDayOfMonth && byDayOfMonth.length > 0) {
    const ordinals = byDayOfMonth.map((d) => `${d}${d === 1 ? "er" : ""}`)
    if (ordinals.length === 1) {
      parts.push(`le ${ordinals[0]}`)
    } else {
      parts.push(`les ${ordinals.join(", ")}`)
    }
  }

  // Months
  if (byMonth && byMonth.length > 0) {
    const monthNames = byMonth.map((m) => MONTHS_FR[m - 1] ?? "").filter(Boolean)
    if (monthNames.length === 1) {
      parts.push(`en ${monthNames[0]}`)
    } else {
      parts.push(`en ${monthNames.join(", ")}`)
    }
  }

  return parts.join(" ")
}

/**
 * Calculate the next occurrence date based on a recurrence rule
 */
export function calculateNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date = new Date()
): Date | null {
  if (!rule) return null

  const { frequency, interval, byDayOfWeek, byDayOfMonth, byMonth, endDate, count } = rule

  // Check if recurrence has ended
  if (endDate && new Date(endDate) < fromDate) {
    return null
  }

  const next = new Date(fromDate)
  next.setHours(0, 0, 0, 0)

  switch (frequency) {
    case "daily": {
      next.setDate(next.getDate() + interval)
      break
    }

    case "weekly": {
      if (byDayOfWeek && byDayOfWeek.length > 0) {
        // Find next day in the list
        const currentDay = next.getDay()
        const sortedDays = [...byDayOfWeek].sort((a, b) => a - b)

        // Find next day in current week
        const nextDayInWeek = sortedDays.find((d) => d > currentDay)

        if (nextDayInWeek !== undefined) {
          // Same week
          next.setDate(next.getDate() + (nextDayInWeek - currentDay))
        } else {
          // Next week(s)
          const firstDay = sortedDays[0] ?? 0
          const daysUntilFirstDay = (7 - currentDay + firstDay) + (interval - 1) * 7
          next.setDate(next.getDate() + daysUntilFirstDay)
        }
      } else {
        // Same day next week(s)
        next.setDate(next.getDate() + interval * 7)
      }
      break
    }

    case "monthly": {
      if (byDayOfMonth && byDayOfMonth.length > 0) {
        const currentDayOfMonth = next.getDate()
        const sortedDays = [...byDayOfMonth].sort((a, b) => a - b)

        // Find next day in current month
        const nextDayInMonth = sortedDays.find((d) => d > currentDayOfMonth)

        if (nextDayInMonth !== undefined) {
          // Same month
          next.setDate(nextDayInMonth)
        } else {
          // Next month(s)
          next.setMonth(next.getMonth() + interval)
          next.setDate(sortedDays[0] ?? 1)
        }
      } else {
        // Same day next month(s)
        next.setMonth(next.getMonth() + interval)
      }
      break
    }

    case "yearly": {
      if (byMonth && byMonth.length > 0) {
        const currentMonth = next.getMonth() + 1 // 1-indexed
        const sortedMonths = [...byMonth].sort((a, b) => a - b)

        // Find next month in current year
        const nextMonthInYear = sortedMonths.find((m) => m > currentMonth)

        if (nextMonthInYear !== undefined) {
          // Same year
          next.setMonth(nextMonthInYear - 1)
          if (byDayOfMonth && byDayOfMonth.length > 0) {
            next.setDate(byDayOfMonth[0] ?? 1)
          }
        } else {
          // Next year(s)
          next.setFullYear(next.getFullYear() + interval)
          next.setMonth((sortedMonths[0] ?? 1) - 1)
          if (byDayOfMonth && byDayOfMonth.length > 0) {
            next.setDate(byDayOfMonth[0] ?? 1)
          }
        }
      } else {
        // Same month/day next year(s)
        next.setFullYear(next.getFullYear() + interval)
      }
      break
    }
  }

  // Validate against end date
  if (endDate && next > new Date(endDate)) {
    return null
  }

  return next
}

/**
 * Create a recurring task
 */
export async function createRecurringTask(
  taskData: TaskCreate,
  rule: RecurrenceRule
): Promise<{ taskId: string; seriesId: string } | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Generate a series ID for tracking recurring instances
  const seriesId = crypto.randomUUID()

  const insertData = {
    ...taskData,
    recurrence_rule: JSON.stringify(rule),
    series_id: seriesId,
    status: "pending",
    created_by: currentUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const task = await insert<{ id: string }>("tasks", insertData)
  if (!task) return null

  return {
    taskId: task.id,
    seriesId,
  }
}

/**
 * Generate the next occurrence of a recurring task
 */
export async function generateNextOccurrence(
  completedTaskId: string
): Promise<string | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Get the completed task
  const completedTask = await queryOne<Task & { recurrence_rule: string | null; series_id: string | null }>(`
    SELECT * FROM tasks WHERE id = $1
  `, [completedTaskId])

  if (!completedTask) return null

  // Parse recurrence rule
  let rule: RecurrenceRule | null = null
  if (completedTask.recurrence_rule) {
    try {
      rule = JSON.parse(completedTask.recurrence_rule as string) as RecurrenceRule
    } catch {
      return null
    }
  }

  if (!rule) return null

  // Calculate next occurrence
  const completedDate = completedTask.completed_at
    ? new Date(completedTask.completed_at)
    : new Date()

  const nextDate = calculateNextOccurrence(rule, completedDate)
  if (!nextDate) return null

  // Check count limit
  if (rule.count !== undefined) {
    const existingCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM tasks
      WHERE series_id = $1
    `, [completedTask.series_id])

    const currentCount = parseInt(existingCount?.count ?? "0", 10)
    if (currentCount >= rule.count) {
      return null // Count limit reached
    }
  }

  // Create next task
  const nextTask = await insert<{ id: string }>("tasks", {
    household_id: completedTask.household_id,
    title: completedTask.title,
    description: completedTask.description,
    category_id: completedTask.category_id,
    child_id: completedTask.child_id,
    assigned_to: completedTask.assigned_to,
    deadline: nextDate.toISOString().split("T")[0],
    deadline_flexible: completedTask.deadline_flexible,
    priority: completedTask.priority,
    load_weight: completedTask.load_weight,
    is_critical: completedTask.is_critical,
    recurrence_rule: JSON.stringify(rule),
    series_id: completedTask.series_id,
    source: "auto",
    parent_task_id: completedTaskId,
    status: "pending",
    created_by: currentUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return nextTask?.id ?? null
}

/**
 * Get all tasks in a recurring series
 */
export async function getSeriesTasks(seriesId: string): Promise<Task[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  const tasks = await query<Task>(`
    SELECT * FROM tasks
    WHERE series_id = $1
    ORDER BY deadline ASC
  `, [seriesId])

  return tasks
}

/**
 * Cancel a recurring series (all future occurrences)
 */
export async function cancelRecurringSeries(
  seriesId: string
): Promise<{ cancelled: number }> {
  const currentUserId = await getUserId()
  if (!currentUserId) return { cancelled: 0 }

  await setCurrentUser(currentUserId)

  const result = await query(`
    UPDATE tasks
    SET status = 'cancelled', updated_at = NOW()
    WHERE series_id = $1 AND status = 'pending'
    RETURNING id
  `, [seriesId])

  return { cancelled: result.length }
}

/**
 * Update recurrence rule for entire series
 */
export async function updateSeriesRecurrence(
  seriesId: string,
  newRule: RecurrenceRule
): Promise<boolean> {
  const currentUserId = await getUserId()
  if (!currentUserId) return false

  await setCurrentUser(currentUserId)

  const result = await query(`
    UPDATE tasks
    SET recurrence_rule = $1, updated_at = NOW()
    WHERE series_id = $2
    RETURNING id
  `, [JSON.stringify(newRule), seriesId])

  return result.length > 0
}

/**
 * Get recurring tasks for a household
 */
export async function getRecurringTasks(householdId: string): Promise<Task[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  const tasks = await query<Task>(`
    SELECT * FROM tasks
    WHERE household_id = $1
      AND recurrence_rule IS NOT NULL
      AND status = 'pending'
    ORDER BY deadline ASC
  `, [householdId])

  return tasks
}

/**
 * Check and generate next occurrences for all completed recurring tasks
 */
export async function processCompletedRecurringTasks(): Promise<{
  processed: number
  generated: number
  errors: number
}> {
  const result = {
    processed: 0,
    generated: 0,
    errors: 0,
  }

  try {
    // Find completed tasks with recurrence rules that don't have a next occurrence yet
    const completedRecurring = await query<Task & { series_id: string | null }>(`
      SELECT t.*
      FROM tasks t
      LEFT JOIN tasks next_t ON next_t.parent_task_id = t.id
      WHERE t.status = 'done'
        AND t.recurrence_rule IS NOT NULL
        AND t.series_id IS NOT NULL
        AND next_t.id IS NULL
    `)

    for (const task of completedRecurring) {
      result.processed++
      try {
        const nextTaskId = await generateNextOccurrence(task.id)
        if (nextTaskId) {
          result.generated++
        }
      } catch (error) {
        console.error(`Error generating next occurrence for task ${task.id}:`, error)
        result.errors++
      }
    }
  } catch (error) {
    console.error("Error processing completed recurring tasks:", error)
    result.errors++
  }

  return result
}

/**
 * Predefined recurrence rules
 */
export const RECURRENCE_PRESETS = {
  daily: {
    frequency: "daily" as const,
    interval: 1,
  },
  weekdays: {
    frequency: "weekly" as const,
    interval: 1,
    byDayOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
  },
  weekly: {
    frequency: "weekly" as const,
    interval: 1,
  },
  biweekly: {
    frequency: "weekly" as const,
    interval: 2,
  },
  monthly: {
    frequency: "monthly" as const,
    interval: 1,
  },
  quarterly: {
    frequency: "monthly" as const,
    interval: 3,
  },
  yearly: {
    frequency: "yearly" as const,
    interval: 1,
  },
}

/**
 * Get preset label
 */
export function getPresetLabel(presetKey: keyof typeof RECURRENCE_PRESETS): string {
  const labels: Record<keyof typeof RECURRENCE_PRESETS, string> = {
    daily: "Tous les jours",
    weekdays: "Jours de semaine",
    weekly: "Toutes les semaines",
    biweekly: "Toutes les deux semaines",
    monthly: "Tous les mois",
    quarterly: "Tous les trimestres",
    yearly: "Tous les ans",
  }
  return labels[presetKey]
}
