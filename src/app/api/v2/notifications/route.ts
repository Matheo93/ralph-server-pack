/**
 * Notifications API v2
 *
 * Breaking changes from v1:
 * - Notification preferences split into categories
 * - camelCase response fields
 * - Extended notification types
 * - Cursor-based pagination
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import { addVersionHeaders, type APIVersion } from "@/lib/api/versioning"
import { validationError, notFound } from "@/lib/api/error-responses"

const API_VERSION: APIVersion = "v2"

// =============================================================================
// TYPES
// =============================================================================

interface NotificationV2Response {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  body: string
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  expiresAt: string | null
  actionUrl: string | null
  priority: "low" | "normal" | "high"
}

type NotificationType =
  | "task_assigned"
  | "task_reminder"
  | "task_completed"
  | "task_overdue"
  | "streak_at_risk"
  | "streak_achieved"
  | "load_imbalance"
  | "member_joined"
  | "member_left"
  | "child_birthday"
  | "weekly_summary"
  | "system_update"

type NotificationCategory = "tasks" | "streaks" | "household" | "insights" | "system"

interface NotificationPreferencesV2 {
  global: {
    enabled: boolean
    quietHoursStart: string | null // HH:mm
    quietHoursEnd: string | null
    channels: {
      push: boolean
      email: boolean
      inApp: boolean
    }
  }
  categories: {
    tasks: CategoryPreference
    streaks: CategoryPreference
    household: CategoryPreference
    insights: CategoryPreference
    system: CategoryPreference
  }
}

interface CategoryPreference {
  enabled: boolean
  push: boolean
  email: boolean
}

interface CursorPaginationMeta {
  cursor: string | null
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
  unreadCount: number
}

// =============================================================================
// SCHEMAS
// =============================================================================

const CategoryPreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
})

const UpdatePreferencesV2Schema = z.object({
  global: z.object({
    enabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    channels: z.object({
      push: z.boolean().optional(),
      email: z.boolean().optional(),
      inApp: z.boolean().optional(),
    }).optional(),
  }).optional(),
  categories: z.object({
    tasks: CategoryPreferenceSchema.optional(),
    streaks: CategoryPreferenceSchema.optional(),
    household: CategoryPreferenceSchema.optional(),
    insights: CategoryPreferenceSchema.optional(),
    system: CategoryPreferenceSchema.optional(),
  }).optional(),
})

const MarkReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  all: z.boolean().optional(),
  category: z.enum(["tasks", "streaks", "household", "insights", "system"]).optional(),
})

// =============================================================================
// HELPERS
// =============================================================================

function encodeCursor(id: string, createdAt: string): string {
  return Buffer.from(JSON.stringify({ id, createdAt })).toString("base64url")
}

function decodeCursor(cursor: string): { id: string; createdAt: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8")
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function mapToV2Response(row: Record<string, unknown>): NotificationV2Response {
  return {
    id: row["id"] as string,
    type: row["type"] as NotificationType,
    category: row["category"] as NotificationCategory,
    title: row["title"] as string,
    body: row["body"] as string,
    data: row["data"] as Record<string, unknown> | null,
    isRead: row["is_read"] as boolean,
    readAt: row["read_at"] as string | null,
    createdAt: row["created_at"] as string,
    expiresAt: row["expires_at"] as string | null,
    actionUrl: row["action_url"] as string | null,
    priority: row["priority"] as "low" | "normal" | "high",
  }
}

function getDefaultPreferences(): NotificationPreferencesV2 {
  return {
    global: {
      enabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      channels: {
        push: true,
        email: true,
        inApp: true,
      },
    },
    categories: {
      tasks: { enabled: true, push: true, email: false },
      streaks: { enabled: true, push: true, email: true },
      household: { enabled: true, push: true, email: true },
      insights: { enabled: true, push: false, email: true },
      system: { enabled: true, push: true, email: true },
    },
  }
}

// =============================================================================
// GET /api/v2/notifications - List notifications
// =============================================================================

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, _householdId) => {
    const searchParams = request.nextUrl.searchParams

    // Parse cursor pagination
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)

    // Parse filters
    const category = searchParams.get("category") as NotificationCategory | null
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const type = searchParams.get("type") as NotificationType | null

    // Build where clause
    let whereClause = "n.user_id = $1"
    const params: unknown[] = [userId]
    let paramIndex = 2

    if (category) {
      whereClause += ` AND n.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (unreadOnly) {
      whereClause += " AND n.is_read = false"
    }

    if (type) {
      whereClause += ` AND n.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    // Handle cursor
    if (cursor) {
      const decodedCursor = decodeCursor(cursor)
      if (decodedCursor) {
        whereClause += ` AND (n.created_at, n.id) < ($${paramIndex}, $${paramIndex + 1})`
        params.push(decodedCursor.createdAt, decodedCursor.id)
        paramIndex += 2
      }
    }

    // Get counts
    const [totalResult, unreadResult] = await Promise.all([
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM notifications n
        WHERE n.user_id = $1
      `, [userId]),
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM notifications n
        WHERE n.user_id = $1 AND n.is_read = false
      `, [userId]),
    ])

    // Get notifications
    const notifications = await query<Record<string, unknown>>(`
      SELECT
        n.id,
        n.type,
        n.category,
        n.title,
        n.body,
        n.data,
        n.is_read,
        n.read_at::text,
        n.created_at::text,
        n.expires_at::text,
        n.action_url,
        n.priority
      FROM notifications n
      WHERE ${whereClause}
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT $${paramIndex}
    `, [...params, limit + 1])

    // Determine if there are more results
    const hasMore = notifications.length > limit
    const resultNotifications = hasMore ? notifications.slice(0, limit) : notifications

    // Build cursors
    const lastNotification = resultNotifications[resultNotifications.length - 1]
    const nextCursor = hasMore && lastNotification
      ? encodeCursor(
          lastNotification["id"] as string,
          lastNotification["created_at"] as string
        )
      : null

    // Map to v2 response
    const v2Notifications = resultNotifications.map(mapToV2Response)

    const meta: CursorPaginationMeta = {
      cursor,
      nextCursor,
      hasMore,
      totalCount: totalResult?.count ?? 0,
      unreadCount: unreadResult?.count ?? 0,
    }

    const response = NextResponse.json({
      data: v2Notifications,
      meta,
    })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// POST /api/v2/notifications - Mark notifications as read
// =============================================================================

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, _householdId) => {
    const bodyResult = await parseBody(request, MarkReadSchema)
    if (!bodyResult.success) {
      return validationError({ message: bodyResult.error })
    }

    const { ids, all, category } = bodyResult.data

    let updatedCount = 0

    if (all) {
      // Mark all as read
      const result = await query<{ id: string }>(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND is_read = false
        RETURNING id
      `, [userId])
      updatedCount = result.length
    } else if (category) {
      // Mark category as read
      const result = await query<{ id: string }>(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND category = $2 AND is_read = false
        RETURNING id
      `, [userId, category])
      updatedCount = result.length
    } else if (ids && ids.length > 0) {
      // Mark specific notifications as read
      const result = await query<{ id: string }>(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = ANY($1) AND user_id = $2 AND is_read = false
        RETURNING id
      `, [ids, userId])
      updatedCount = result.length
    }

    const response = NextResponse.json({
      data: { markedAsRead: updatedCount },
    })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// DELETE /api/v2/notifications - Delete notifications
// =============================================================================

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId, _householdId) => {
    const searchParams = request.nextUrl.searchParams
    const ids = searchParams.get("ids")?.split(",")
    const olderThanDays = parseInt(searchParams.get("olderThanDays") ?? "0")
    const readOnly = searchParams.get("readOnly") === "true"

    let deletedCount = 0

    if (ids && ids.length > 0) {
      // Delete specific notifications
      const result = await query<{ id: string }>(`
        DELETE FROM notifications
        WHERE id = ANY($1) AND user_id = $2
        RETURNING id
      `, [ids, userId])
      deletedCount = result.length
    } else if (olderThanDays > 0) {
      // Delete old notifications
      let whereClause = `user_id = $1 AND created_at < NOW() - INTERVAL '${olderThanDays} days'`
      if (readOnly) {
        whereClause += " AND is_read = true"
      }
      const result = await query<{ id: string }>(`
        DELETE FROM notifications
        WHERE ${whereClause}
        RETURNING id
      `, [userId])
      deletedCount = result.length
    }

    const response = NextResponse.json({
      data: { deleted: deletedCount },
    })
    return addVersionHeaders(response, API_VERSION)
  })
}
