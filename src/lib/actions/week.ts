"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import type { TaskListItem } from "@/types/task"
import { z } from "zod"

interface HouseholdMembership {
  household_id: string
  role: string
}

async function getHouseholdForUser(userId: string): Promise<HouseholdMembership | null> {
  await setCurrentUser(userId)
  return queryOne<HouseholdMembership>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])
}

// Schema for moveTaskToDay
const moveTaskSchema = z.object({
  taskId: z.string().uuid("ID de tâche invalide"),
  newDate: z.string().min(1, "Date requise"),
})

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// Get tasks grouped by day for a week
export interface WeekTasksResult {
  tasks: TaskListItem[]
  weekStart: string
  weekEnd: string
}

export async function getTasksForWeek(
  startDate?: string
): Promise<WeekTasksResult> {
  const userId = await getUserId()
  if (!userId) {
    return { tasks: [], weekStart: "", weekEnd: "" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { tasks: [], weekStart: "", weekEnd: "" }
  }

  // Default to start of current week (Monday)
  let weekStartDate: Date
  if (startDate) {
    weekStartDate = new Date(startDate)
  } else {
    weekStartDate = new Date()
    const day = weekStartDate.getDay()
    const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    weekStartDate.setDate(diff)
  }
  weekStartDate.setHours(0, 0, 0, 0)

  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  weekEndDate.setHours(23, 59, 59, 999)

  const weekStartStr = weekStartDate.toISOString().split("T")[0]
  const weekEndStr = weekEndDate.toISOString().split("T")[0]

  const tasks = await query<TaskListItem>(`
    SELECT
      t.id,
      t.title,
      t.status,
      t.priority,
      t.deadline::text,
      t.deadline_flexible,
      t.is_critical,
      t.load_weight,
      t.child_id,
      c.first_name as child_name,
      t.assigned_to,
      NULL as assigned_name,
      tc.code as category_code,
      tc.name_fr as category_name,
      tc.color as category_color,
      tc.icon as category_icon,
      t.created_at::text
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.household_id = $1
      AND t.deadline::date >= $2::date
      AND t.deadline::date <= $3::date
    ORDER BY
      t.deadline ASC,
      t.is_critical DESC,
      CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      t.created_at ASC
  `, [membership.household_id, weekStartStr, weekEndStr])

  return {
    tasks,
    weekStart: weekStartStr ?? "",
    weekEnd: weekEndStr ?? "",
  }
}

// Move a task to a different day
export async function moveTaskToDay(
  taskId: string,
  newDate: string
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = moveTaskSchema.safeParse({ taskId, newDate })
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Données invalides",
    }
  }

  // Verify task belongs to household and update deadline
  const result = await query(
    `UPDATE tasks
     SET deadline = $1::date, updated_at = NOW()
     WHERE id = $2 AND household_id = $3
     RETURNING id`,
    [newDate, taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath("/tasks/week")
  revalidatePath("/dashboard")
  revalidatePath("/tasks/today")

  return { success: true }
}

// Get counts for each day of the week (for badges)
export interface DayCount {
  date: string
  count: number
  critical_count: number
}

export async function getWeekDayCounts(
  startDate?: string
): Promise<DayCount[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  // Default to start of current week (Monday)
  let weekStartDate: Date
  if (startDate) {
    weekStartDate = new Date(startDate)
  } else {
    weekStartDate = new Date()
    const day = weekStartDate.getDay()
    const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1)
    weekStartDate.setDate(diff)
  }
  weekStartDate.setHours(0, 0, 0, 0)

  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const weekStartStr = weekStartDate.toISOString().split("T")[0]
  const weekEndStr = weekEndDate.toISOString().split("T")[0]

  const counts = await query<DayCount>(`
    SELECT
      t.deadline::text as date,
      COUNT(*)::int as count,
      COUNT(*) FILTER (WHERE t.is_critical = true)::int as critical_count
    FROM tasks t
    WHERE t.household_id = $1
      AND t.deadline::date >= $2::date
      AND t.deadline::date <= $3::date
      AND t.status IN ('pending', 'postponed')
    GROUP BY t.deadline::date
    ORDER BY t.deadline::date
  `, [membership.household_id, weekStartStr, weekEndStr])

  return counts
}
