/**
 * Task API v2 - Individual task operations
 *
 * Breaking changes from v1:
 * - camelCase response fields
 * - Priority 'urgent' instead of 'critical'
 * - Nested objects for relations (assignedTo, child, category)
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import { addVersionHeaders, type APIVersion } from "@/lib/api/versioning"
import { notFound, validationError, forbidden } from "@/lib/api/error-responses"

const API_VERSION: APIVersion = "v2"

// =============================================================================
// TYPES
// =============================================================================

interface TaskV2Response {
  id: string
  title: string
  description: string | null
  status: "pending" | "done" | "cancelled"
  priority: "low" | "normal" | "high" | "urgent"
  isCritical: boolean
  deadline: string | null
  completedAt: string | null
  assignedTo: {
    id: string
    name: string | null
    email?: string
  } | null
  child: {
    id: string
    name: string
  } | null
  category: {
    id: string
    name: string
    color: string
  } | null
  loadWeight: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

// =============================================================================
// SCHEMAS
// =============================================================================

const PriorityV2Schema = z.enum(["low", "normal", "high", "urgent"])

const UpdateTaskV2Schema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: PriorityV2Schema.optional(),
  status: z.enum(["pending", "done", "cancelled"]).optional(),
  deadline: z.string().datetime().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  childId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isCritical: z.boolean().optional(),
})

// =============================================================================
// HELPERS
// =============================================================================

function mapToV2Response(row: Record<string, unknown>): TaskV2Response {
  return {
    id: row["id"] as string,
    title: row["title"] as string,
    description: row["description"] as string | null,
    status: row["status"] as "pending" | "done" | "cancelled",
    priority: mapPriorityToV2(row["priority"] as string),
    isCritical: row["is_critical"] as boolean,
    deadline: row["deadline"] as string | null,
    completedAt: row["completed_at"] as string | null,
    assignedTo: row["assigned_to"]
      ? {
          id: row["assigned_to"] as string,
          name: row["assigned_name"] as string | null,
        }
      : null,
    child: row["child_id"]
      ? {
          id: row["child_id"] as string,
          name: row["child_name"] as string,
        }
      : null,
    category: row["category_id"]
      ? {
          id: row["category_id"] as string,
          name: row["category_name"] as string,
          color: row["category_color"] as string,
        }
      : null,
    loadWeight: row["load_weight"] as number,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
    createdBy: row["created_by"] as string,
  }
}

function mapPriorityToV2(priority: string): "low" | "normal" | "high" | "urgent" {
  if (priority === "critical") return "urgent"
  return priority as "low" | "normal" | "high" | "urgent"
}

function mapPriorityFromV2(priority: "low" | "normal" | "high" | "urgent"): string {
  if (priority === "urgent") return "critical"
  return priority
}

// =============================================================================
// GET /api/v2/tasks/[id] - Get single task
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withAuth(request, async (_userId, householdId) => {
    const task = await queryOne<Record<string, unknown>>(`
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
        t.updated_at::text,
        t.created_by
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN children c ON c.id = t.child_id
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      WHERE t.id = $1 AND t.household_id = $2
    `, [id, householdId])

    if (!task) {
      return notFound("task")
    }

    const v2Task = mapToV2Response(task)
    const response = NextResponse.json({ data: v2Task })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// PUT /api/v2/tasks/[id] - Full update
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    // Check task exists
    const existingTask = await queryOne<{ id: string }>(`
      SELECT id FROM tasks
      WHERE id = $1 AND household_id = $2
    `, [id, householdId])

    if (!existingTask) {
      return notFound("task")
    }

    const bodyResult = await parseBody(request, UpdateTaskV2Schema)
    if (!bodyResult.success) {
      return validationError({ message: bodyResult.error })
    }

    const data = bodyResult.data

    // Build update
    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (data.title !== undefined) {
      updates.push(`title = $${idx}`)
      values.push(data.title)
      idx++
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx}`)
      values.push(data.description)
      idx++
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${idx}`)
      values.push(mapPriorityFromV2(data.priority))
      idx++
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx}`)
      values.push(data.status)
      idx++
      if (data.status === "done") {
        updates.push(`completed_at = NOW()`)
        updates.push(`completed_by = $${idx}`)
        values.push(userId)
        idx++
      } else if (data.status === "pending") {
        updates.push(`completed_at = NULL`)
        updates.push(`completed_by = NULL`)
      }
    }
    if (data.deadline !== undefined) {
      updates.push(`deadline = $${idx}`)
      values.push(data.deadline)
      idx++
    }
    if (data.assignedTo !== undefined) {
      updates.push(`assigned_to = $${idx}`)
      values.push(data.assignedTo)
      idx++
    }
    if (data.childId !== undefined) {
      updates.push(`child_id = $${idx}`)
      values.push(data.childId)
      idx++
    }
    if (data.categoryId !== undefined) {
      updates.push(`category_id = $${idx}`)
      values.push(data.categoryId)
      idx++
    }
    if (data.isCritical !== undefined) {
      updates.push(`is_critical = $${idx}`)
      values.push(data.isCritical)
      idx++
      // Update load weight
      updates.push(`load_weight = $${idx}`)
      values.push(data.isCritical ? 5 : 3)
      idx++
    }

    if (updates.length === 0) {
      return validationError("No updates provided")
    }

    updates.push("updated_at = NOW()")

    await query(`
      UPDATE tasks
      SET ${updates.join(", ")}
      WHERE id = $${idx}
    `, [...values, id])

    // Get updated task
    const task = await queryOne<Record<string, unknown>>(`
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
        t.updated_at::text,
        t.created_by
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN children c ON c.id = t.child_id
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      WHERE t.id = $1
    `, [id])

    const v2Task = task ? mapToV2Response(task) : null
    const response = NextResponse.json({ data: v2Task })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// PATCH /api/v2/tasks/[id] - Partial update
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH behaves the same as PUT for this resource
  return PUT(request, { params })
}

// =============================================================================
// DELETE /api/v2/tasks/[id] - Delete task
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withAuth(request, async (_userId, householdId) => {
    const result = await query<{ id: string }>(`
      DELETE FROM tasks
      WHERE id = $1 AND household_id = $2
      RETURNING id
    `, [id, householdId])

    if (result.length === 0) {
      return notFound("task")
    }

    const response = NextResponse.json({ data: { deleted: true } })
    return addVersionHeaders(response, API_VERSION)
  })
}
