/**
 * Household API v1
 *
 * REST API for household information and members.
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

interface HouseholdResponse {
  id: string
  name: string
  country: string
  timezone: string
  streak_current: number
  streak_best: number
  created_at: string
  members: MemberResponse[]
  children_count: number
  pending_tasks_count: number
}

interface MemberResponse {
  user_id: string
  email: string
  name: string | null
  role: string
  is_active: boolean
  joined_at: string
}

const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  country: z.enum(["FR", "BE", "CH", "CA", "LU"]).optional(),
  timezone: z.string().max(50).optional(),
})

/**
 * GET /api/v1/household
 * Get current user's household with members
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Get household
    const household = await queryOne<{
      id: string
      name: string
      country: string
      timezone: string
      streak_current: number
      streak_best: number
      created_at: string
    }>(`
      SELECT
        id,
        name,
        country,
        timezone,
        streak_current,
        streak_best,
        created_at::text
      FROM households
      WHERE id = $1
    `, [householdId])

    if (!household) {
      return apiError("Foyer non trouvé", 404)
    }

    // Get members
    const members = await query<MemberResponse>(`
      SELECT
        hm.user_id,
        u.email,
        u.name,
        hm.role,
        hm.is_active,
        hm.created_at::text as joined_at
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = $1
      ORDER BY hm.role ASC, hm.created_at ASC
    `, [householdId])

    // Get counts
    const childrenCount = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM children
      WHERE household_id = $1 AND is_active = true
    `, [householdId])

    const pendingTasksCount = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE household_id = $1 AND status = 'pending'
    `, [householdId])

    const response: HouseholdResponse = {
      ...household,
      members,
      children_count: childrenCount?.count ?? 0,
      pending_tasks_count: pendingTasksCount?.count ?? 0,
    }

    return apiSuccess(response)
  })
}

/**
 * PUT /api/v1/household
 * Update household settings (admin only)
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Check if user is admin
    const membership = await queryOne<{ role: string }>(`
      SELECT role FROM household_members
      WHERE user_id = $1 AND household_id = $2 AND is_active = true
    `, [userId, householdId])

    if (membership?.role !== "admin") {
      return apiError("Seul l'administrateur peut modifier le foyer", 403)
    }

    const bodyResult = await parseBody(request, UpdateHouseholdSchema)
    if (bodyResult.error) {
      return apiError(bodyResult.error)
    }

    const data = bodyResult.data

    // Build update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(data.name)
      paramIndex++
    }
    if (data.country !== undefined) {
      updates.push(`country = $${paramIndex}`)
      values.push(data.country)
      paramIndex++
    }
    if (data.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex}`)
      values.push(data.timezone)
      paramIndex++
    }

    if (updates.length === 0) {
      return apiError("Aucune modification fournie")
    }

    updates.push("updated_at = NOW()")
    values.push(householdId)

    await query(`
      UPDATE households
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `, values)

    // Get updated household
    const household = await queryOne<{
      id: string
      name: string
      country: string
      timezone: string
      streak_current: number
      streak_best: number
      created_at: string
    }>(`
      SELECT
        id,
        name,
        country,
        timezone,
        streak_current,
        streak_best,
        created_at::text
      FROM households
      WHERE id = $1
    `, [householdId])

    return apiSuccess(household)
  })
}
