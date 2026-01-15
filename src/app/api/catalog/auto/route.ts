/**
 * Automatic Task Generation API
 *
 * POST: Generate automatic tasks based on children ages and milestones
 * GET: Get upcoming automatic tasks for household
 * DELETE: Dismiss an automatic task
 * PATCH: Schedule an automatic task
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, insert, update } from "@/lib/aws/database"
import { z } from "zod"
import {
  createAutoTaskStore,
  generateTasksForChild,
  type AutoTask,
  type ChildContext,
  type GenerationResult,
} from "@/lib/catalog/task-generator-auto"
import { createAgeRuleStore } from "@/lib/catalog/age-rules"
import { createPeriodRuleStore } from "@/lib/catalog/period-rules"

// Initialize stores
const ageRuleStore = createAgeRuleStore()
const periodRuleStore = createPeriodRuleStore()

const GenerateRequestSchema = z.object({
  childId: z.string().uuid().optional(),
  maxTasks: z.number().min(1).max(50).optional().default(20),
})

const DismissRequestSchema = z.object({
  autoTaskId: z.string().uuid(),
  reason: z.string().max(200).optional(),
})

const ScheduleRequestSchema = z.object({
  autoTaskId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
})

/**
 * GET /api/catalog/auto
 * Get upcoming automatic tasks for household
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const daysAhead = Math.min(parseInt(searchParams.get("days") ?? "30"), 90)
  const dueOnly = searchParams.get("dueOnly") === "true"

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Get stored auto tasks
  const storedTasks = await query<{
    id: string
    household_id: string
    source_type: string
    source_id: string
    child_id: string | null
    child_name: string | null
    title: string
    description: string | null
    category: string
    priority: string
    due_date: string | null
    status: string
    mandatory: boolean
    created_at: string
    scheduled_task_id: string | null
  }>(`
    SELECT *
    FROM auto_tasks
    WHERE household_id = $1
      AND status = 'pending'
      AND (due_date IS NULL OR due_date >= CURRENT_DATE - INTERVAL '7 days')
    ORDER BY due_date ASC NULLS LAST,
      CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `, [householdId])

  // Filter by due date if requested
  const now = new Date()
  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

  let filteredTasks = storedTasks
  if (dueOnly) {
    filteredTasks = storedTasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate <= now
    })
  } else {
    filteredTasks = storedTasks.filter(t => {
      if (!t.due_date) return true
      const dueDate = new Date(t.due_date)
      return dueDate <= cutoffDate
    })
  }

  const response = filteredTasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    dueDate: t.due_date,
    childId: t.child_id,
    childName: t.child_name,
    sourceType: t.source_type,
    sourceId: t.source_id,
    status: t.status,
    mandatory: t.mandatory,
    isScheduled: t.scheduled_task_id !== null,
    scheduledTaskId: t.scheduled_task_id,
  }))

  return NextResponse.json({
    tasks: response,
    count: response.length,
    daysAhead,
  })
}

/**
 * POST /api/catalog/auto
 * Generate automatic tasks based on children and milestones
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = GenerateRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { childId, maxTasks } = validation.data

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Get children from household
  let childrenQuery = `
    SELECT id, name, birth_date
    FROM children
    WHERE household_id = $1
  `
  const params: (string | null)[] = [householdId]

  if (childId) {
    childrenQuery += ` AND id = $2`
    params.push(childId)
  }

  childrenQuery += ` ORDER BY birth_date ASC`

  const childrenData = await query<{
    id: string
    name: string
    birth_date: string
  }>(childrenQuery, params)

  if (childrenData.length === 0) {
    return NextResponse.json({
      tasks: [],
      message: childId
        ? "Enfant non trouvé"
        : "Aucun enfant dans le foyer. Ajoutez des enfants pour générer des tâches automatiques.",
    })
  }

  // Get existing auto tasks to avoid duplicates
  const existingTasks = await query<{ source_type: string; source_id: string; child_id: string | null }>(`
    SELECT source_type, source_id, child_id
    FROM auto_tasks
    WHERE household_id = $1 AND status != 'dismissed'
  `, [householdId])

  const existingSet = new Set(
    existingTasks.map(t => `${t.source_type}_${t.source_id}_${t.child_id ?? ''}`)
  )

  // Generate tasks for each child
  let store = createAutoTaskStore()
  const allGenerated: AutoTask[] = []

  for (const child of childrenData) {
    const childContext: ChildContext = {
      id: child.id,
      name: child.name,
      birthDate: new Date(child.birth_date),
      householdId,
      country: 'FR',
    }

    const { store: newStore, result } = generateTasksForChild(
      store,
      ageRuleStore,
      periodRuleStore,
      childContext
    )

    store = newStore

    // Filter out already existing tasks
    const newTasks = result.generated.filter(
      t => !existingSet.has(`${t.sourceType}_${t.sourceId}_${t.childId}`)
    )

    allGenerated.push(...newTasks)
  }

  // Limit and insert
  const tasksToCreate = allGenerated.slice(0, maxTasks)

  const createdTasks: Array<{
    id: string
    title: string
    category: string
    priority: string
    childId: string | null
    childName: string | null
    dueDate: string | null
  }> = []

  for (const task of tasksToCreate) {
    try {
      const created = await insert<{ id: string }>("auto_tasks", {
        household_id: householdId,
        source_type: task.sourceType,
        source_id: task.sourceId,
        child_id: task.childId,
        child_name: task.childName,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        due_date: task.dueDate?.toISOString() ?? null,
        charge_weight: JSON.stringify(task.chargeWeight),
        status: "pending",
        mandatory: task.mandatory,
        tags: JSON.stringify(task.tags),
        created_at: new Date().toISOString(),
      })

      if (created) {
        createdTasks.push({
          id: created.id,
          title: task.title,
          category: task.category,
          priority: task.priority,
          childId: task.childId,
          childName: task.childName,
          dueDate: task.dueDate?.toISOString() ?? null,
        })
      }
    } catch (error) {
      console.error("Error creating auto task:", error)
      // Continue with other tasks
    }
  }

  return NextResponse.json({
    success: true,
    generated: createdTasks.length,
    tasks: createdTasks,
    children: childrenData.map(c => ({
      id: c.id,
      name: c.name,
    })),
  })
}

/**
 * DELETE /api/catalog/auto
 * Dismiss an automatic task
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = DismissRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { autoTaskId, reason } = validation.data

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  // Verify task belongs to household
  const task = await queryOne<{ id: string; status: string }>(`
    SELECT id, status
    FROM auto_tasks
    WHERE id = $1 AND household_id = $2
  `, [autoTaskId, membership.household_id])

  if (!task) {
    return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 })
  }

  if (task.status === 'dismissed') {
    return NextResponse.json({ error: "Tâche déjà rejetée" }, { status: 400 })
  }

  // Dismiss the task
  await update("auto_tasks", autoTaskId, {
    status: "dismissed",
    dismissed_at: new Date().toISOString(),
    dismiss_reason: reason ?? null,
  })

  return NextResponse.json({
    success: true,
    message: "Tâche rejetée avec succès",
  })
}

/**
 * PATCH /api/catalog/auto
 * Schedule an automatic task (convert to real task)
 */
export async function PATCH(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = ScheduleRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { autoTaskId, assigneeId, dueDate } = validation.data

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Verify task belongs to household
  const autoTask = await queryOne<{
    id: string
    title: string
    description: string | null
    category: string
    priority: string
    due_date: string | null
    child_id: string | null
    status: string
    scheduled_task_id: string | null
    charge_weight: string | null
  }>(`
    SELECT id, title, description, category, priority, due_date, child_id, status, scheduled_task_id, charge_weight
    FROM auto_tasks
    WHERE id = $1 AND household_id = $2
  `, [autoTaskId, householdId])

  if (!autoTask) {
    return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 })
  }

  if (autoTask.status !== 'pending') {
    return NextResponse.json({ error: "Tâche non disponible pour planification" }, { status: 400 })
  }

  if (autoTask.scheduled_task_id) {
    return NextResponse.json({ error: "Tâche déjà planifiée" }, { status: 400 })
  }

  // Verify assignee belongs to household
  const assignee = await queryOne<{ id: string }>(`
    SELECT hm.id
    FROM household_members hm
    WHERE hm.user_id = $1 AND hm.household_id = $2 AND hm.is_active = true
  `, [assigneeId, householdId])

  if (!assignee) {
    return NextResponse.json({ error: "Assigné non trouvé dans le foyer" }, { status: 400 })
  }

  // Map priority string to number
  const priorityMap: Record<string, number> = {
    'critical': 1,
    'high': 1,
    'medium': 2,
    'low': 3,
  }

  // Create the real task
  const taskDueDate = dueDate ?? autoTask.due_date

  // Parse charge weight if available
  let weight = 3
  if (autoTask.charge_weight) {
    try {
      const chargeWeight = JSON.parse(autoTask.charge_weight)
      weight = Math.round(chargeWeight.total) || 3
    } catch {
      // Use default weight
    }
  }

  const createdTask = await insert<{ id: string }>("tasks", {
    household_id: householdId,
    title: autoTask.title,
    description: autoTask.description,
    category: autoTask.category,
    priority: priorityMap[autoTask.priority] ?? 2,
    due_date: taskDueDate,
    child_id: autoTask.child_id,
    assignee_id: assigneeId,
    source: "auto",
    status: "pending",
    weight,
    created_by: userId,
    created_at: new Date().toISOString(),
  })

  if (!createdTask) {
    return NextResponse.json({ error: "Erreur lors de la création de la tâche" }, { status: 500 })
  }

  // Update auto task with reference
  await update("auto_tasks", autoTaskId, {
    scheduled_task_id: createdTask.id,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    task: {
      id: createdTask.id,
      title: autoTask.title,
      assigneeId,
      dueDate: taskDueDate,
    },
  })
}
