"use server"

import { revalidatePath } from "next/cache"
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskFilterSchema,
  TaskPostponeSchema,
  TaskReassignSchema,
  RecurrenceRuleSchema,
  type TaskFilter,
  type RecurrenceRule,
} from "@/lib/validations/task"
import type {
  TaskCreate,
  TaskUpdate,
  TaskListItem,
  TaskWithRelations,
  TaskActionResult,
} from "@/types/task"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"
import { generateNextOccurrence } from "@/lib/services/recurrence"

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

// ============================================================
// CREATE TASK
// ============================================================

export async function createTask(
  data: Omit<TaskCreate, "household_id" | "created_by">
): Promise<TaskActionResult<{ taskId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = TaskCreateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Données invalides",
    }
  }

  const taskData = {
    ...validation.data,
    household_id: membership.household_id,
    created_by: userId,
    assigned_to: validation.data.assigned_to ?? userId,
  } as Record<string, unknown>

  const task = await insert<{ id: string }>("tasks", taskData)
  if (!task) {
    return { success: false, error: "Erreur lors de la création de la tâche" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true, data: { taskId: task.id } }
}

// ============================================================
// UPDATE TASK
// ============================================================

export async function updateTask(
  data: TaskUpdate
): Promise<TaskActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = TaskUpdateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Données invalides",
    }
  }

  const { id, ...updateData } = validation.data
  const keys = Object.keys(updateData)
  if (keys.length === 0) {
    return { success: false, error: "Aucune modification fournie" }
  }

  const values = Object.values(updateData)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ")

  const result = await query(
    `UPDATE tasks
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
       AND household_id = $${keys.length + 2}
     RETURNING id`,
    [...values, id, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath(`/tasks/${id}`)
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// DELETE TASK
// ============================================================

export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `DELETE FROM tasks
     WHERE id = $1 AND household_id = $2
     RETURNING id`,
    [taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// COMPLETE TASK
// ============================================================

export async function completeTask(
  taskId: string
): Promise<TaskActionResult<{ nextTaskId?: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  // Complete the task
  const result = await query<{ id: string; recurrence_rule: string | null }>(
    `UPDATE tasks
     SET status = 'done', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND household_id = $2
     RETURNING id, recurrence_rule`,
    [taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  let nextTaskId: string | undefined

  // If the task has a recurrence rule, generate the next occurrence
  const completedTask = result[0]
  if (completedTask?.recurrence_rule) {
    try {
      nextTaskId = (await generateNextOccurrence(taskId)) ?? undefined
    } catch (error) {
      console.error("Error generating next occurrence:", error)
      // Don't fail the completion if recurring generation fails
    }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  revalidatePath("/tasks/today")

  return { success: true, data: { nextTaskId } }
}

// ============================================================
// POSTPONE TASK
// ============================================================

export async function postponeTask(
  taskId: string,
  newDeadline: string
): Promise<TaskActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = TaskPostponeSchema.safeParse({ id: taskId, new_deadline: newDeadline })
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Données invalides",
    }
  }

  const result = await query(
    `UPDATE tasks
     SET status = 'postponed',
         postponed_to = $1::date,
         deadline = $1::date,
         updated_at = NOW()
     WHERE id = $2 AND household_id = $3
     RETURNING id`,
    [newDeadline, taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  revalidatePath("/tasks/today")

  return { success: true }
}

// ============================================================
// CANCEL TASK
// ============================================================

export async function cancelTask(taskId: string): Promise<TaskActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `UPDATE tasks
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND household_id = $2
     RETURNING id`,
    [taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// REASSIGN TASK
// ============================================================

export async function reassignTask(
  taskId: string,
  newUserId: string | null
): Promise<TaskActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = TaskReassignSchema.safeParse({ id: taskId, assigned_to: newUserId })
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Données invalides",
    }
  }

  // Verify the new user is in the same household
  if (newUserId) {
    const targetMember = await queryOne<{ user_id: string }>(`
      SELECT user_id
      FROM household_members
      WHERE user_id = $1 AND household_id = $2 AND is_active = true
    `, [newUserId, membership.household_id])

    if (!targetMember) {
      return { success: false, error: "Utilisateur cible non trouvé dans le foyer" }
    }
  }

  const result = await query(
    `UPDATE tasks
     SET assigned_to = $1, updated_at = NOW()
     WHERE id = $2 AND household_id = $3
     RETURNING id`,
    [newUserId, taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// GET TASKS (with filters)
// ============================================================

export async function getTasks(
  filters?: Partial<TaskFilter>
): Promise<TaskListItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const validation = TaskFilterSchema.safeParse(filters ?? {})
  const parsedFilters = validation.success ? validation.data : {
    limit: 50,
    offset: 0,
    sort_by: "deadline" as const,
    sort_order: "asc" as const,
  }

  const conditions: string[] = ["t.household_id = $1"]
  const params: unknown[] = [membership.household_id]
  let paramIndex = 2

  if (parsedFilters.child_id) {
    conditions.push(`t.child_id = $${paramIndex}`)
    params.push(parsedFilters.child_id)
    paramIndex++
  }

  if (parsedFilters.assigned_to) {
    conditions.push(`t.assigned_to = $${paramIndex}`)
    params.push(parsedFilters.assigned_to)
    paramIndex++
  }

  if (parsedFilters.category_id) {
    conditions.push(`t.category_id = $${paramIndex}`)
    params.push(parsedFilters.category_id)
    paramIndex++
  }

  if (parsedFilters.status && parsedFilters.status.length > 0) {
    conditions.push(`t.status = ANY($${paramIndex}::text[])`)
    params.push(parsedFilters.status)
    paramIndex++
  }

  if (parsedFilters.priority && parsedFilters.priority.length > 0) {
    conditions.push(`t.priority = ANY($${paramIndex}::text[])`)
    params.push(parsedFilters.priority)
    paramIndex++
  }

  if (parsedFilters.is_critical !== undefined) {
    conditions.push(`t.is_critical = $${paramIndex}`)
    params.push(parsedFilters.is_critical)
    paramIndex++
  }

  if (parsedFilters.deadline_from) {
    conditions.push(`t.deadline >= $${paramIndex}::date`)
    params.push(parsedFilters.deadline_from)
    paramIndex++
  }

  if (parsedFilters.deadline_to) {
    conditions.push(`t.deadline <= $${paramIndex}::date`)
    params.push(parsedFilters.deadline_to)
    paramIndex++
  }

  if (parsedFilters.search) {
    conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`)
    params.push(`%${parsedFilters.search}%`)
    paramIndex++
  }

  const whereClause = conditions.join(" AND ")
  const sortColumn = {
    deadline: "t.deadline",
    priority: "t.priority",
    created_at: "t.created_at",
    updated_at: "t.updated_at",
  }[parsedFilters.sort_by]
  const sortOrder = parsedFilters.sort_order.toUpperCase()

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
    WHERE ${whereClause}
    ORDER BY
      CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
      ${sortColumn} ${sortOrder} NULLS LAST,
      t.created_at DESC
    LIMIT $${paramIndex}
    OFFSET $${paramIndex + 1}
  `, [...params, parsedFilters.limit, parsedFilters.offset])

  return tasks
}

// ============================================================
// GET TASK BY ID
// ============================================================

export async function getTask(taskId: string): Promise<TaskWithRelations | null> {
  const userId = await getUserId()
  if (!userId) return null

  const membership = await getHouseholdForUser(userId)
  if (!membership) return null

  const task = await queryOne<TaskWithRelations>(`
    SELECT
      t.*,
      row_to_json(c.*) as child,
      row_to_json(tc.*) as category
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.id = $1 AND t.household_id = $2
  `, [taskId, membership.household_id])

  return task
}

// ============================================================
// GET TASKS BY CHILD
// ============================================================

export async function getTasksByChild(childId: string): Promise<TaskListItem[]> {
  return getTasks({ child_id: childId })
}

// ============================================================
// GET TODAY'S TASKS
// ============================================================

export async function getTodayTasks(): Promise<TaskListItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

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
      AND t.deadline::date = CURRENT_DATE
      AND t.status IN ('pending', 'postponed')
    ORDER BY
      t.is_critical DESC,
      CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      t.created_at ASC
  `, [membership.household_id])

  return tasks
}

// ============================================================
// GET WEEK TASKS
// ============================================================

export async function getWeekTasks(): Promise<TaskListItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

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
      AND t.deadline::date >= CURRENT_DATE
      AND t.deadline::date <= CURRENT_DATE + INTERVAL '7 days'
      AND t.status IN ('pending', 'postponed')
    ORDER BY
      t.deadline ASC,
      t.is_critical DESC,
      CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END
  `, [membership.household_id])

  return tasks
}

// ============================================================
// GET OVERDUE TASKS
// ============================================================

export async function getOverdueTasks(): Promise<TaskListItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

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
      AND t.deadline::date < CURRENT_DATE
      AND t.status = 'pending'
    ORDER BY
      t.deadline ASC,
      t.is_critical DESC
  `, [membership.household_id])

  return tasks
}

// ============================================================
// GET TASK CATEGORIES
// ============================================================

interface TaskCategoryRow {
  id: string
  code: string
  name_fr: string
  name_en: string
  icon: string | null
  color: string | null
  sort_order: number
}

export async function getTaskCategories(): Promise<TaskCategoryRow[]> {
  const categories = await query<TaskCategoryRow>(`
    SELECT id, code, name_fr, name_en, icon, color, sort_order
    FROM task_categories
    ORDER BY sort_order ASC
  `)

  return categories
}

// ============================================================
// RESTORE TASK (un-cancel/un-complete)
// ============================================================

export async function restoreTask(taskId: string): Promise<TaskActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `UPDATE tasks
     SET status = 'pending', completed_at = NULL, updated_at = NOW()
     WHERE id = $1 AND household_id = $2
     RETURNING id`,
    [taskId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Tâche introuvable ou non autorisée" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// CREATE RECURRING TASK
// ============================================================

export async function createRecurringTask(
  data: Omit<TaskCreate, "household_id" | "created_by">,
  recurrenceRule: RecurrenceRule
): Promise<TaskActionResult<{ taskId: string; seriesId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  // Validate task data
  const taskValidation = TaskCreateSchema.safeParse(data)
  if (!taskValidation.success) {
    return {
      success: false,
      error: taskValidation.error.issues[0]?.message ?? "Données de tâche invalides",
    }
  }

  // Validate recurrence rule
  const ruleValidation = RecurrenceRuleSchema.safeParse(recurrenceRule)
  if (!ruleValidation.success) {
    return {
      success: false,
      error: ruleValidation.error.issues[0]?.message ?? "Règle de récurrence invalide",
    }
  }

  // Generate series ID
  const seriesId = crypto.randomUUID()

  const taskData = {
    ...taskValidation.data,
    household_id: membership.household_id,
    created_by: userId,
    assigned_to: taskValidation.data.assigned_to ?? userId,
    recurrence_rule: JSON.stringify(ruleValidation.data),
    series_id: seriesId,
    source: "manual" as const,
  }

  const task = await insert<{ id: string }>("tasks", taskData)
  if (!task) {
    return { success: false, error: "Erreur lors de la création de la tâche récurrente" }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true, data: { taskId: task.id, seriesId } }
}

// ============================================================
// CANCEL RECURRING SERIES
// ============================================================

export async function cancelRecurringSeries(
  seriesId: string
): Promise<TaskActionResult<{ cancelledCount: number }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `UPDATE tasks
     SET status = 'cancelled', updated_at = NOW()
     WHERE series_id = $1 AND household_id = $2 AND status = 'pending'
     RETURNING id`,
    [seriesId, membership.household_id]
  )

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return { success: true, data: { cancelledCount: result.length } }
}

// ============================================================
// GET RECURRING TASKS
// ============================================================

export async function getRecurringTasks(): Promise<TaskListItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

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
      AND t.recurrence_rule IS NOT NULL
      AND t.status = 'pending'
    ORDER BY t.deadline ASC
  `, [membership.household_id])

  return tasks
}
