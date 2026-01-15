/**
 * Task by ID API v1
 *
 * GET, PUT, DELETE operations for a specific task.
 */

import { NextRequest } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  apiSuccess,
  apiError,
  withAuth,
  parseBody,
} from "@/lib/api/utils"

interface TaskResponse {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  is_critical: boolean
  deadline: string | null
  completed_at: string | null
  assigned_to: string | null
  assigned_name: string | null
  child_id: string | null
  child_name: string | null
  category_id: string | null
  category_name: string | null
  category_color: string | null
  load_weight: number
  created_at: string
  updated_at: string
}

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  deadline: z.string().datetime().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  child_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  is_critical: z.boolean().optional(),
  status: z.enum(["pending", "done", "cancelled"]).optional(),
})

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/tasks/[id]
 * Get a specific task
 */
export async function GET(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    const task = await queryOne<TaskResponse>(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.is_critical,
        t.deadline::text,
        t.completed_at::text,
        t.assigned_to,
        u.name as assigned_name,
        t.child_id,
        c.first_name as child_name,
        t.category_id,
        tc.name_fr as category_name,
        tc.color as category_color,
        t.load_weight,
        t.created_at::text,
        t.updated_at::text
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN children c ON c.id = t.child_id
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      WHERE t.id = $1 AND t.household_id = $2
    `, [id, householdId])

    if (!task) {
      return apiError("Tâche non trouvée", 404)
    }

    return apiSuccess(task)
  })
}

/**
 * PUT /api/v1/tasks/[id]
 * Update a task
 */
export async function PUT(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    // Verify task exists and belongs to household
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM tasks
      WHERE id = $1 AND household_id = $2
    `, [id, householdId])

    if (!existing) {
      return apiError("Tâche non trouvée", 404)
    }

    const bodyResult = await parseBody(request, UpdateTaskSchema)
    if (bodyResult.error) {
      return apiError(bodyResult.error)
    }

    const data = bodyResult.data

    // Build update query dynamically
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex}`)
      values.push(data.title)
      paramIndex++
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      values.push(data.description)
      paramIndex++
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`)
      values.push(data.priority)
      paramIndex++
    }
    if (data.deadline !== undefined) {
      updates.push(`deadline = $${paramIndex}`)
      values.push(data.deadline)
      paramIndex++
    }
    if (data.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`)
      values.push(data.assigned_to)
      paramIndex++
    }
    if (data.child_id !== undefined) {
      updates.push(`child_id = $${paramIndex}`)
      values.push(data.child_id)
      paramIndex++
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = $${paramIndex}`)
      values.push(data.category_id)
      paramIndex++
    }
    if (data.is_critical !== undefined) {
      updates.push(`is_critical = $${paramIndex}`)
      values.push(data.is_critical)
      paramIndex++
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(data.status)
      paramIndex++

      // Set completed_at if status is done
      if (data.status === "done") {
        updates.push(`completed_at = NOW()`)
      } else if (data.status === "pending") {
        updates.push(`completed_at = NULL`)
      }
    }

    if (updates.length === 0) {
      return apiError("Aucune modification fournie")
    }

    updates.push("updated_at = NOW()")
    values.push(id, householdId)

    await query(`
      UPDATE tasks
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND household_id = $${paramIndex + 1}
    `, values)

    // Get updated task
    const task = await queryOne<TaskResponse>(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.is_critical,
        t.deadline::text,
        t.completed_at::text,
        t.assigned_to,
        u.name as assigned_name,
        t.child_id,
        c.first_name as child_name,
        t.category_id,
        tc.name_fr as category_name,
        tc.color as category_color,
        t.load_weight,
        t.created_at::text,
        t.updated_at::text
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN children c ON c.id = t.child_id
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      WHERE t.id = $1
    `, [id])

    return apiSuccess(task)
  })
}

/**
 * DELETE /api/v1/tasks/[id]
 * Delete (cancel) a task
 */
export async function DELETE(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    const result = await query<{ id: string }>(`
      UPDATE tasks
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND household_id = $2
      RETURNING id
    `, [id, householdId])

    if (result.length === 0) {
      return apiError("Tâche non trouvée", 404)
    }

    return apiSuccess({ deleted: true, id })
  })
}

/**
 * PATCH /api/v1/tasks/[id]
 * Quick status update (complete/uncomplete task)
 */
export async function PATCH(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    const StatusSchema = z.object({
      status: z.enum(["pending", "done"]),
    })

    const bodyResult = await parseBody(request, StatusSchema)
    if (bodyResult.error) {
      return apiError(bodyResult.error)
    }

    const { status } = bodyResult.data

    const result = await query<{ id: string; status: string }>(`
      UPDATE tasks
      SET
        status = $1,
        completed_at = CASE WHEN $1 = 'done' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $2 AND household_id = $3
      RETURNING id, status
    `, [status, id, householdId])

    if (result.length === 0) {
      return apiError("Tâche non trouvée", 404)
    }

    return apiSuccess({
      id: result[0]!.id,
      status: result[0]!.status,
      completed: status === "done",
    })
  })
}
