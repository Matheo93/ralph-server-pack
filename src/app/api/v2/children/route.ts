/**
 * Children API v2
 *
 * Breaking changes from v1:
 * - 'birthday' field renamed to 'birthDate' with ISO 8601 format
 * - camelCase response fields (firstName, schoolLevel, avatarUrl, pendingTasksCount)
 * - Cursor-based pagination instead of offset-based
 * - Extended child profile with age calculation and upcoming events
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import { addVersionHeaders, type APIVersion } from "@/lib/api/versioning"
import { validationError, notFound, internalError } from "@/lib/api/error-responses"

const API_VERSION: APIVersion = "v2"

// =============================================================================
// TYPES
// =============================================================================

interface ChildV2Response {
  id: string
  firstName: string // v2: camelCase
  birthDate: string // v2: renamed from birthdate, ISO 8601 format
  age: number // v2: calculated field
  schoolLevel: string | null // v2: camelCase
  avatarUrl: string | null // v2: camelCase
  notes: string | null
  isActive: boolean // v2: camelCase
  pendingTasksCount: number // v2: camelCase
  upcomingEvents: UpcomingEvent[] // v2: new field
  createdAt: string // v2: camelCase
  updatedAt: string // v2: camelCase
}

interface UpcomingEvent {
  type: "birthday" | "task_deadline" | "school_event"
  title: string
  date: string
  daysUntil: number
}

interface CursorPaginationMeta {
  cursor: string | null
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
}

// =============================================================================
// SCHEMAS
// =============================================================================

const CreateChildV2Schema = z.object({
  firstName: z.string().min(1).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO 8601 date
  schoolLevel: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const UpdateChildV2Schema = CreateChildV2Schema.partial()

// =============================================================================
// HELPERS
// =============================================================================

function encodeCursor(id: string, sortValues: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify({ id, ...sortValues })).toString("base64url")
}

function decodeCursor(cursor: string): { id: string; [key: string]: unknown } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8")
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getUpcomingEvents(
  birthDate: string,
  firstName: string,
  pendingTasks: Array<{ title: string; deadline: string | null }>
): UpcomingEvent[] {
  const events: UpcomingEvent[] = []
  const today = new Date()

  // Check for upcoming birthday
  const birth = new Date(birthDate)
  const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (nextBirthday < today) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1)
  }
  const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilBirthday <= 30) {
    events.push({
      type: "birthday",
      title: `Anniversaire de ${firstName}`,
      date: nextBirthday.toISOString().split("T")[0]!,
      daysUntil: daysUntilBirthday,
    })
  }

  // Check for upcoming task deadlines
  for (const task of pendingTasks) {
    if (task.deadline) {
      const deadline = new Date(task.deadline)
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil >= 0 && daysUntil <= 7) {
        events.push({
          type: "task_deadline",
          title: task.title,
          date: task.deadline,
          daysUntil,
        })
      }
    }
  }

  // Sort by daysUntil
  events.sort((a, b) => a.daysUntil - b.daysUntil)

  return events.slice(0, 5) // Max 5 events
}

function mapToV2Response(
  row: Record<string, unknown>,
  upcomingEvents: UpcomingEvent[] = []
): ChildV2Response {
  const birthDate = row["birthdate"] as string
  return {
    id: row["id"] as string,
    firstName: row["first_name"] as string,
    birthDate,
    age: calculateAge(birthDate),
    schoolLevel: row["school_level"] as string | null,
    avatarUrl: row["avatar_url"] as string | null,
    notes: row["notes"] as string | null,
    isActive: row["is_active"] as boolean,
    pendingTasksCount: row["pending_tasks_count"] as number,
    upcomingEvents,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  }
}

// =============================================================================
// GET /api/v2/children - List children with cursor pagination
// =============================================================================

export async function GET(request: NextRequest) {
  return withAuth(request, async (_userId, householdId) => {
    const searchParams = request.nextUrl.searchParams

    // Parse cursor pagination
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)
    const includeInactive = searchParams.get("includeInactive") === "true"
    const includeEvents = searchParams.get("includeEvents") !== "false" // Default true

    // Build where clause
    let whereClause = "c.household_id = $1"
    const params: unknown[] = [householdId]
    let paramIndex = 2

    if (!includeInactive) {
      whereClause += " AND c.is_active = true"
    }

    // Handle cursor
    if (cursor) {
      const decodedCursor = decodeCursor(cursor)
      if (decodedCursor) {
        whereClause += ` AND (c.first_name, c.id) > ($${paramIndex}, $${paramIndex + 1})`
        params.push(decodedCursor["firstName"], decodedCursor.id)
        paramIndex += 2
      }
    }

    // Get total count
    const countResult = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM children c
      WHERE c.household_id = $1 ${includeInactive ? "" : "AND c.is_active = true"}
    `, [householdId])
    const totalCount = countResult?.count ?? 0

    // Get children with pending tasks count
    const children = await query<Record<string, unknown>>(`
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
      WHERE ${whereClause}
      ORDER BY c.first_name ASC, c.id ASC
      LIMIT $${paramIndex}
    `, [...params, limit + 1])

    // Determine if there are more results
    const hasMore = children.length > limit
    const resultChildren = hasMore ? children.slice(0, limit) : children

    // Get upcoming events for each child if requested
    const v2Children: ChildV2Response[] = []
    for (const child of resultChildren) {
      let events: UpcomingEvent[] = []
      if (includeEvents) {
        const tasks = await query<{ title: string; deadline: string | null }>(`
          SELECT title, deadline::text
          FROM tasks
          WHERE child_id = $1 AND status = 'pending' AND deadline IS NOT NULL
          ORDER BY deadline ASC
          LIMIT 10
        `, [child["id"]])
        events = getUpcomingEvents(
          child["birthdate"] as string,
          child["first_name"] as string,
          tasks
        )
      }
      v2Children.push(mapToV2Response(child, events))
    }

    // Build cursors
    const lastChild = resultChildren[resultChildren.length - 1]
    const nextCursor = hasMore && lastChild
      ? encodeCursor(lastChild["id"] as string, { firstName: lastChild["first_name"] })
      : null

    const meta: CursorPaginationMeta = {
      cursor,
      nextCursor,
      hasMore,
      totalCount,
    }

    const response = NextResponse.json({
      data: v2Children,
      meta,
    })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// POST /api/v2/children - Create child
// =============================================================================

export async function POST(request: NextRequest) {
  return withAuth(request, async (_userId, householdId) => {
    const bodyResult = await parseBody(request, CreateChildV2Schema)
    if (!bodyResult.success) {
      return validationError({ message: bodyResult.error })
    }

    const data = bodyResult.data

    // Validate birthDate is in the past
    const birthDate = new Date(data.birthDate)
    if (birthDate > new Date()) {
      return validationError("birthDate must be in the past")
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
      data.firstName,
      data.birthDate,
      data.schoolLevel ?? null,
      data.notes ?? null,
    ])

    if (result.length === 0) {
      return internalError()
    }

    // Get created child
    const child = await queryOne<Record<string, unknown>>(`
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

    const v2Child = child ? mapToV2Response(child, []) : null
    const response = NextResponse.json({ data: v2Child }, { status: 201 })
    return addVersionHeaders(response, API_VERSION)
  })
}
