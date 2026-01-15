/**
 * Children API v1
 *
 * REST API for children management.
 */

import { NextRequest } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  apiSuccess,
  apiError,
  withAuth,
  parseBody,
  parsePagination,
  paginationMeta,
} from "@/lib/api/utils"

interface ChildResponse {
  id: string
  first_name: string
  birthdate: string
  school_level: string | null
  avatar_url: string | null
  notes: string | null
  is_active: boolean
  pending_tasks_count: number
  created_at: string
  updated_at: string
}

const CreateChildSchema = z.object({
  first_name: z.string().min(1).max(100),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  school_level: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const UpdateChildSchema = CreateChildSchema.partial()

/**
 * GET /api/v1/children
 * List children in the household
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const searchParams = request.nextUrl.searchParams
    const { page, limit, offset } = parsePagination(searchParams)
    const includeInactive = searchParams.get("include_inactive") === "true"

    // Get total count
    const countResult = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM children
      WHERE household_id = $1 ${includeInactive ? "" : "AND is_active = true"}
    `, [householdId])
    const total = countResult?.count ?? 0

    // Get children with pending tasks count
    const children = await query<ChildResponse>(`
      SELECT
        c.id,
        c.first_name,
        c.birthdate::text,
        c.school_level,
        c.avatar_url,
        c.notes,
        c.is_active,
        COALESCE(pending.count, 0)::int as pending_tasks_count,
        c.created_at::text,
        c.updated_at::text
      FROM children c
      LEFT JOIN (
        SELECT child_id, COUNT(*) as count
        FROM tasks
        WHERE status = 'pending' AND household_id = $1
        GROUP BY child_id
      ) pending ON pending.child_id = c.id
      WHERE c.household_id = $1 ${includeInactive ? "" : "AND c.is_active = true"}
      ORDER BY c.first_name ASC
      LIMIT $2 OFFSET $3
    `, [householdId, limit, offset])

    return apiSuccess(children, paginationMeta(page, limit, total))
  })
}

/**
 * POST /api/v1/children
 * Create a new child
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const bodyResult = await parseBody(request, CreateChildSchema)
    if (bodyResult.error) {
      return apiError(bodyResult.error)
    }

    const data = bodyResult.data

    // Validate birthdate is in the past
    const birthdate = new Date(data.birthdate)
    if (birthdate > new Date()) {
      return apiError("La date de naissance doit être dans le passé")
    }

    // Create child
    const result = await query<{ id: string }>(`
      INSERT INTO children (
        household_id,
        first_name,
        birthdate,
        school_level,
        notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      householdId,
      data.first_name,
      data.birthdate,
      data.school_level ?? null,
      data.notes ?? null,
    ])

    if (result.length === 0) {
      return apiError("Erreur lors de la création", 500)
    }

    // Get created child
    const child = await queryOne<ChildResponse>(`
      SELECT
        id,
        first_name,
        birthdate::text,
        school_level,
        avatar_url,
        notes,
        is_active,
        0 as pending_tasks_count,
        created_at::text,
        updated_at::text
      FROM children
      WHERE id = $1
    `, [result[0]!.id])

    return apiSuccess(child)
  })
}
