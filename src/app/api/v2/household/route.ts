/**
 * Household API v2
 *
 * Breaking changes from v1:
 * - Members moved to separate endpoint /api/v2/household/members
 * - camelCase response fields
 * - Extended stats and metrics
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

interface HouseholdV2Response {
  id: string
  name: string
  country: string
  timezone: string
  streak: {
    current: number
    best: number
    lastValidated: string | null
  }
  stats: {
    childrenCount: number
    membersCount: number
    pendingTasksCount: number
    completedTasksThisWeek: number
    averageTasksPerDay: number
  }
  subscription: {
    plan: "free" | "premium" | "family"
    validUntil: string | null
  }
  settings: {
    notificationsEnabled: boolean
    weekStartsOn: "monday" | "sunday"
    language: string
  }
  createdAt: string
  updatedAt: string
  _links: {
    members: string
    children: string
    tasks: string
  }
}

// =============================================================================
// SCHEMAS
// =============================================================================

const UpdateHouseholdV2Schema = z.object({
  name: z.string().min(1).max(100).optional(),
  country: z.enum(["FR", "BE", "CH", "CA", "LU", "US", "UK", "DE", "ES", "IT"]).optional(),
  timezone: z.string().max(50).optional(),
  settings: z.object({
    notificationsEnabled: z.boolean().optional(),
    weekStartsOn: z.enum(["monday", "sunday"]).optional(),
    language: z.enum(["fr", "en", "es", "de"]).optional(),
  }).optional(),
})

// =============================================================================
// GET /api/v2/household - Get household info (without members)
// =============================================================================

export async function GET(request: NextRequest) {
  return withAuth(request, async (_userId, householdId) => {
    // Get household with extended info
    const household = await queryOne<Record<string, unknown>>(`
      SELECT
        h.id,
        h.name,
        h.country,
        h.timezone,
        h.streak_current,
        h.streak_best,
        h.streak_last_validated::text,
        h.subscription_plan,
        h.subscription_valid_until::text,
        h.settings,
        h.created_at::text,
        h.updated_at::text
      FROM households h
      WHERE h.id = $1
    `, [householdId])

    if (!household) {
      return notFound("household")
    }

    // Get stats
    const [childrenCount, membersCount, pendingCount, completedThisWeek] = await Promise.all([
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM children
        WHERE household_id = $1 AND is_active = true
      `, [householdId]),
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM household_members
        WHERE household_id = $1 AND is_active = true
      `, [householdId]),
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE household_id = $1 AND status = 'pending'
      `, [householdId]),
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE household_id = $1
          AND status = 'done'
          AND completed_at >= NOW() - INTERVAL '7 days'
      `, [householdId]),
    ])

    // Calculate average tasks per day (last 30 days)
    const avgTasks = await queryOne<{ avg: number }>(`
      SELECT COALESCE(AVG(daily_count), 0)::numeric(10,2) as avg
      FROM (
        SELECT DATE(completed_at) as day, COUNT(*) as daily_count
        FROM tasks
        WHERE household_id = $1
          AND status = 'done'
          AND completed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(completed_at)
      ) daily
    `, [householdId])

    // Parse settings
    const settings = household["settings"] as Record<string, unknown> | null ?? {}

    const response: HouseholdV2Response = {
      id: household["id"] as string,
      name: household["name"] as string,
      country: household["country"] as string,
      timezone: household["timezone"] as string,
      streak: {
        current: household["streak_current"] as number,
        best: household["streak_best"] as number,
        lastValidated: household["streak_last_validated"] as string | null,
      },
      stats: {
        childrenCount: childrenCount?.count ?? 0,
        membersCount: membersCount?.count ?? 0,
        pendingTasksCount: pendingCount?.count ?? 0,
        completedTasksThisWeek: completedThisWeek?.count ?? 0,
        averageTasksPerDay: avgTasks?.avg ?? 0,
      },
      subscription: {
        plan: (household["subscription_plan"] as "free" | "premium" | "family") ?? "free",
        validUntil: household["subscription_valid_until"] as string | null,
      },
      settings: {
        notificationsEnabled: settings["notificationsEnabled"] as boolean ?? true,
        weekStartsOn: settings["weekStartsOn"] as "monday" | "sunday" ?? "monday",
        language: settings["language"] as string ?? "fr",
      },
      createdAt: household["created_at"] as string,
      updatedAt: household["updated_at"] as string,
      _links: {
        members: `/api/v2/household/members`,
        children: `/api/v2/children`,
        tasks: `/api/v2/tasks`,
      },
    }

    const httpResponse = NextResponse.json({ data: response })
    return addVersionHeaders(httpResponse, API_VERSION)
  })
}

// =============================================================================
// PUT /api/v2/household - Update household (admin only)
// =============================================================================

export async function PUT(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Check if user is admin
    const membership = await queryOne<{ role: string }>(`
      SELECT role FROM household_members
      WHERE user_id = $1 AND household_id = $2 AND is_active = true
    `, [userId, householdId])

    if (membership?.role !== "admin") {
      return forbidden()
    }

    const bodyResult = await parseBody(request, UpdateHouseholdV2Schema)
    if (!bodyResult.success) {
      return validationError({ message: bodyResult.error })
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
    if (data.settings !== undefined) {
      // Merge settings
      const currentHousehold = await queryOne<{ settings: Record<string, unknown> | null }>(`
        SELECT settings FROM households WHERE id = $1
      `, [householdId])
      const currentSettings = currentHousehold?.settings ?? {}
      const newSettings = { ...currentSettings, ...data.settings }
      updates.push(`settings = $${paramIndex}`)
      values.push(JSON.stringify(newSettings))
      paramIndex++
    }

    if (updates.length === 0) {
      return validationError({ message: "No updates provided" })
    }

    updates.push("updated_at = NOW()")
    values.push(householdId)

    await query(`
      UPDATE households
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `, values)

    // Return updated household - call GET
    return GET(request)
  })
}

// =============================================================================
// PATCH /api/v2/household - Partial update
// =============================================================================

export async function PATCH(request: NextRequest) {
  return PUT(request)
}
