/**
 * Child by ID API v1
 *
 * GET, PUT, DELETE operations for a specific child.
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

interface ChildDetailResponse {
  id: string
  first_name: string
  birthdate: string
  school_level: string | null
  avatar_url: string | null
  notes: string | null
  is_active: boolean
  pending_tasks_count: number
  completed_tasks_count: number
  upcoming_vaccinations: number
  created_at: string
  updated_at: string
}

const UpdateChildSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  school_level: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/children/[id]
 * Get a specific child with details
 */
export async function GET(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    const child = await queryOne<ChildDetailResponse>(`
      SELECT
        c.id,
        c.first_name,
        c.birthdate::text,
        c.school_level,
        c.avatar_url,
        c.notes,
        c.is_active,
        COALESCE(pending.count, 0)::int as pending_tasks_count,
        COALESCE(completed.count, 0)::int as completed_tasks_count,
        0 as upcoming_vaccinations,
        c.created_at::text,
        c.updated_at::text
      FROM children c
      LEFT JOIN (
        SELECT child_id, COUNT(*) as count
        FROM tasks
        WHERE status = 'pending' AND household_id = $2
        GROUP BY child_id
      ) pending ON pending.child_id = c.id
      LEFT JOIN (
        SELECT child_id, COUNT(*) as count
        FROM tasks
        WHERE status = 'done' AND household_id = $2
        GROUP BY child_id
      ) completed ON completed.child_id = c.id
      WHERE c.id = $1 AND c.household_id = $2
    `, [id, householdId])

    if (!child) {
      return apiError("Enfant non trouvé", 404)
    }

    return apiSuccess(child)
  })
}

/**
 * PUT /api/v1/children/[id]
 * Update a child
 */
export async function PUT(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    // Verify child exists and belongs to household
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM children
      WHERE id = $1 AND household_id = $2
    `, [id, householdId])

    if (!existing) {
      return apiError("Enfant non trouvé", 404)
    }

    const bodyResult = await parseBody(request, UpdateChildSchema)
    if (!bodyResult.success) {
      return apiError(bodyResult.error)
    }

    const data = bodyResult.data

    // Build update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`)
      values.push(data.first_name)
      paramIndex++
    }
    if (data.birthdate !== undefined) {
      const birthdate = new Date(data.birthdate)
      if (birthdate > new Date()) {
        return apiError("La date de naissance doit être dans le passé")
      }
      updates.push(`birthdate = $${paramIndex}`)
      values.push(data.birthdate)
      paramIndex++
    }
    if (data.school_level !== undefined) {
      updates.push(`school_level = $${paramIndex}`)
      values.push(data.school_level)
      paramIndex++
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`)
      values.push(data.notes)
      paramIndex++
    }

    if (updates.length === 0) {
      return apiError("Aucune modification fournie")
    }

    updates.push("updated_at = NOW()")
    values.push(id, householdId)

    await query(`
      UPDATE children
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND household_id = $${paramIndex + 1}
    `, values)

    // Get updated child
    const child = await queryOne<ChildDetailResponse>(`
      SELECT
        c.id,
        c.first_name,
        c.birthdate::text,
        c.school_level,
        c.avatar_url,
        c.notes,
        c.is_active,
        COALESCE(pending.count, 0)::int as pending_tasks_count,
        COALESCE(completed.count, 0)::int as completed_tasks_count,
        0 as upcoming_vaccinations,
        c.created_at::text,
        c.updated_at::text
      FROM children c
      LEFT JOIN (
        SELECT child_id, COUNT(*) as count
        FROM tasks
        WHERE status = 'pending' AND household_id = $2
        GROUP BY child_id
      ) pending ON pending.child_id = c.id
      LEFT JOIN (
        SELECT child_id, COUNT(*) as count
        FROM tasks
        WHERE status = 'done' AND household_id = $2
        GROUP BY child_id
      ) completed ON completed.child_id = c.id
      WHERE c.id = $1
    `, [id, householdId])

    return apiSuccess(child)
  })
}

/**
 * DELETE /api/v1/children/[id]
 * Soft delete a child (mark as inactive)
 */
export async function DELETE(request: NextRequest, { params }: PageProps) {
  const { id } = await params

  return withAuth(request, async (userId, householdId) => {
    const result = await query<{ id: string }>(`
      UPDATE children
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND household_id = $2
      RETURNING id
    `, [id, householdId])

    if (result.length === 0) {
      return apiError("Enfant non trouvé", 404)
    }

    return apiSuccess({ deleted: true, id })
  })
}
