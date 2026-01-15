/**
 * Tasks API v2
 *
 * Breaking changes from v1:
 * - Cursor-based pagination instead of offset-based
 * - Advanced filtering with multiple operators
 * - Sorting with multiple fields
 * - Field selection support
 * - Bulk operations support
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import { addVersionHeaders, type APIVersion } from "@/lib/api/versioning"
import { createErrorResponse, validationError, notFound, internalError } from "@/lib/api/error-responses"

const API_VERSION: APIVersion = "v2"

// =============================================================================
// TYPES
// =============================================================================

interface TaskV2Response {
  id: string
  title: string
  description: string | null
  status: "pending" | "done" | "cancelled"
  priority: "low" | "normal" | "high" | "urgent" // v2: 'urgent' instead of 'critical'
  isCritical: boolean // v2: camelCase
  deadline: string | null
  completedAt: string | null // v2: camelCase
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
  loadWeight: number // v2: camelCase
  createdAt: string // v2: camelCase
  updatedAt: string // v2: camelCase
  createdBy: string
}

interface CursorPaginationMeta {
  cursor: string | null
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount: number
}

// =============================================================================
// SCHEMAS
// =============================================================================

const PriorityV2Schema = z.enum(["low", "normal", "high", "urgent"])

const CreateTaskV2Schema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  priority: PriorityV2Schema.default("normal"),
  deadline: z.string().datetime().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  childId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isCritical: z.boolean().optional().default(false),
})

const UpdateTaskV2Schema = CreateTaskV2Schema.partial().extend({
  status: z.enum(["pending", "done", "cancelled"]).optional(),
})

const FilterOperator = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"])

const FilterV2Schema = z.object({
  status: z.object({
    op: FilterOperator.default("eq"),
    value: z.union([
      z.enum(["pending", "done", "cancelled"]),
      z.array(z.enum(["pending", "done", "cancelled"])),
    ]),
  }).optional(),
  priority: z.object({
    op: FilterOperator.default("eq"),
    value: z.union([
      PriorityV2Schema,
      z.array(PriorityV2Schema),
    ]),
  }).optional(),
  childId: z.object({
    op: z.enum(["eq", "neq", "in"]).default("eq"),
    value: z.union([z.string().uuid(), z.array(z.string().uuid())]),
  }).optional(),
  assignedTo: z.object({
    op: z.enum(["eq", "neq", "in"]).default("eq"),
    value: z.union([z.string().uuid(), z.array(z.string().uuid())]),
  }).optional(),
  categoryId: z.object({
    op: z.enum(["eq", "neq", "in"]).default("eq"),
    value: z.union([z.string().uuid(), z.array(z.string().uuid())]),
  }).optional(),
  deadline: z.object({
    op: z.enum(["gt", "gte", "lt", "lte"]).default("lte"),
    value: z.string().datetime(),
  }).optional(),
  createdAt: z.object({
    op: z.enum(["gt", "gte", "lt", "lte"]).default("gte"),
    value: z.string().datetime(),
  }).optional(),
  isCritical: z.object({
    op: z.literal("eq").default("eq"),
    value: z.boolean(),
  }).optional(),
  search: z.string().min(1).max(100).optional(),
}).optional()

const SortFieldV2 = z.enum([
  "createdAt",
  "updatedAt",
  "deadline",
  "priority",
  "title",
  "status",
])

const SortV2Schema = z.array(z.object({
  field: SortFieldV2,
  order: z.enum(["asc", "desc"]).default("asc"),
})).max(3).optional()

const BulkUpdateV2Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: UpdateTaskV2Schema,
})

const BulkDeleteV2Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

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

function buildFilterClause(
  filter: z.infer<typeof FilterV2Schema>,
  startIndex: number
): { clause: string; params: unknown[]; nextIndex: number } {
  if (!filter) {
    return { clause: "", params: [], nextIndex: startIndex }
  }

  const clauses: string[] = []
  const params: unknown[] = []
  let idx = startIndex

  // Status filter
  if (filter.status) {
    const { op, value } = filter.status
    if (op === "in" && Array.isArray(value)) {
      clauses.push(`t.status = ANY($${idx})`)
      params.push(value)
    } else if (op === "neq") {
      clauses.push(`t.status != $${idx}`)
      params.push(value)
    } else {
      clauses.push(`t.status = $${idx}`)
      params.push(value)
    }
    idx++
  }

  // Priority filter
  if (filter.priority) {
    const { op, value } = filter.priority
    if (op === "in" && Array.isArray(value)) {
      clauses.push(`t.priority = ANY($${idx})`)
      params.push(value)
    } else if (op === "neq") {
      clauses.push(`t.priority != $${idx}`)
      params.push(value)
    } else {
      clauses.push(`t.priority = $${idx}`)
      params.push(value)
    }
    idx++
  }

  // Child ID filter
  if (filter.childId) {
    const { op, value } = filter.childId
    if (op === "in" && Array.isArray(value)) {
      clauses.push(`t.child_id = ANY($${idx})`)
      params.push(value)
    } else if (op === "neq") {
      clauses.push(`(t.child_id IS NULL OR t.child_id != $${idx})`)
      params.push(value)
    } else {
      clauses.push(`t.child_id = $${idx}`)
      params.push(value)
    }
    idx++
  }

  // Assigned To filter
  if (filter.assignedTo) {
    const { op, value } = filter.assignedTo
    if (op === "in" && Array.isArray(value)) {
      clauses.push(`t.assigned_to = ANY($${idx})`)
      params.push(value)
    } else if (op === "neq") {
      clauses.push(`(t.assigned_to IS NULL OR t.assigned_to != $${idx})`)
      params.push(value)
    } else {
      clauses.push(`t.assigned_to = $${idx}`)
      params.push(value)
    }
    idx++
  }

  // Category ID filter
  if (filter.categoryId) {
    const { op, value } = filter.categoryId
    if (op === "in" && Array.isArray(value)) {
      clauses.push(`t.category_id = ANY($${idx})`)
      params.push(value)
    } else if (op === "neq") {
      clauses.push(`(t.category_id IS NULL OR t.category_id != $${idx})`)
      params.push(value)
    } else {
      clauses.push(`t.category_id = $${idx}`)
      params.push(value)
    }
    idx++
  }

  // Deadline filter
  if (filter.deadline) {
    const { op, value } = filter.deadline
    const operator = op === "gt" ? ">" : op === "gte" ? ">=" : op === "lt" ? "<" : "<="
    clauses.push(`t.deadline ${operator} $${idx}`)
    params.push(value)
    idx++
  }

  // Created At filter
  if (filter.createdAt) {
    const { op, value } = filter.createdAt
    const operator = op === "gt" ? ">" : op === "gte" ? ">=" : op === "lt" ? "<" : "<="
    clauses.push(`t.created_at ${operator} $${idx}`)
    params.push(value)
    idx++
  }

  // Is Critical filter
  if (filter.isCritical) {
    clauses.push(`t.is_critical = $${idx}`)
    params.push(filter.isCritical.value)
    idx++
  }

  // Search filter (title/description)
  if (filter.search) {
    clauses.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`)
    params.push(`%${filter.search}%`)
    idx++
  }

  return {
    clause: clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "",
    params,
    nextIndex: idx,
  }
}

function buildSortClause(sort: z.infer<typeof SortV2Schema>): string {
  if (!sort || sort.length === 0) {
    return `ORDER BY t.is_critical DESC,
            CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END,
            t.deadline ASC NULLS LAST, t.created_at DESC`
  }

  const fieldMap: Record<string, string> = {
    createdAt: "t.created_at",
    updatedAt: "t.updated_at",
    deadline: "t.deadline",
    priority: `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END`,
    title: "t.title",
    status: `CASE t.status WHEN 'pending' THEN 0 WHEN 'done' THEN 1 WHEN 'cancelled' THEN 2 END`,
  }

  const sortClauses = sort.map(s => {
    const field = fieldMap[s.field] || `t.${s.field}`
    const nullsLast = ["deadline", "updatedAt"].includes(s.field) ? " NULLS LAST" : ""
    return `${field} ${s.order.toUpperCase()}${nullsLast}`
  })

  return `ORDER BY ${sortClauses.join(", ")}`
}

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
  // Map v1 'critical' to v2 'urgent'
  if (priority === "critical") return "urgent"
  return priority as "low" | "normal" | "high" | "urgent"
}

function mapPriorityFromV2(priority: "low" | "normal" | "high" | "urgent"): string {
  // Map v2 'urgent' to internal 'critical'
  if (priority === "urgent") return "critical"
  return priority
}

// =============================================================================
// GET /api/v2/tasks - List tasks with cursor pagination
// =============================================================================

export async function GET(request: NextRequest) {
  return withAuth(request, async (_userId, householdId) => {
    const searchParams = request.nextUrl.searchParams

    // Parse cursor pagination
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)

    // Parse filter from query string
    const filterParam = searchParams.get("filter")
    let filter: z.infer<typeof FilterV2Schema> = undefined
    if (filterParam) {
      try {
        const parsed = JSON.parse(filterParam)
        const result = FilterV2Schema.safeParse(parsed)
        if (result.success) {
          filter = result.data
        }
      } catch {
        // Ignore parse errors, use no filter
      }
    }

    // Parse simple filter params (backwards compatible)
    if (!filter) {
      const status = searchParams.get("status")
      const priority = searchParams.get("priority")
      const childId = searchParams.get("childId")
      const assignedTo = searchParams.get("assignedTo")
      const search = searchParams.get("search")

      if (status || priority || childId || assignedTo || search) {
        filter = {}
        if (status && ["pending", "done", "cancelled"].includes(status)) {
          filter.status = { op: "eq", value: status as "pending" | "done" | "cancelled" }
        }
        if (priority && ["low", "normal", "high", "urgent"].includes(priority)) {
          filter.priority = { op: "eq", value: priority as "low" | "normal" | "high" | "urgent" }
        }
        if (childId) {
          filter.childId = { op: "eq", value: childId }
        }
        if (assignedTo) {
          filter.assignedTo = { op: "eq", value: assignedTo }
        }
        if (search) {
          filter.search = search
        }
      }
    }

    // Parse sort
    const sortParam = searchParams.get("sort")
    let sort: z.infer<typeof SortV2Schema> = undefined
    if (sortParam) {
      try {
        const parsed = JSON.parse(sortParam)
        const result = SortV2Schema.safeParse(parsed)
        if (result.success) {
          sort = result.data
        }
      } catch {
        // Ignore parse errors, use default sort
      }
    }

    // Build query
    let whereClause = "t.household_id = $1"
    const params: unknown[] = [householdId]
    let paramIndex = 2

    // Apply filter
    const filterResult = buildFilterClause(filter, paramIndex)
    whereClause += filterResult.clause
    params.push(...filterResult.params)
    paramIndex = filterResult.nextIndex

    // Handle cursor
    let cursorClause = ""
    if (cursor) {
      const decodedCursor = decodeCursor(cursor)
      if (decodedCursor) {
        cursorClause = ` AND (t.created_at, t.id) < ($${paramIndex}, $${paramIndex + 1})`
        params.push(decodedCursor["createdAt"], decodedCursor.id)
        paramIndex += 2
      }
    }

    // Get total count
    const countResult = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM tasks t
      WHERE ${whereClause}
    `, params.slice(0, filterResult.nextIndex))
    const totalCount = countResult?.count ?? 0

    // Build sort clause
    const sortClause = buildSortClause(sort)

    // Get tasks
    const tasks = await query<Record<string, unknown>>(`
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
      WHERE ${whereClause}${cursorClause}
      ${sortClause}
      LIMIT $${paramIndex}
    `, [...params, limit + 1])

    // Determine if there are more results
    const hasMore = tasks.length > limit
    const resultTasks = hasMore ? tasks.slice(0, limit) : tasks

    // Build cursors
    const lastTask = resultTasks[resultTasks.length - 1]
    const nextCursor = hasMore && lastTask
      ? encodeCursor(lastTask["id"] as string, { createdAt: lastTask["created_at"] })
      : null

    // Map to v2 response format
    const v2Tasks = resultTasks.map(mapToV2Response)

    const meta: CursorPaginationMeta = {
      cursor,
      nextCursor,
      prevCursor: null, // TODO: Implement prev cursor
      hasMore,
      totalCount,
    }

    const response = NextResponse.json({
      data: v2Tasks,
      meta,
    })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// POST /api/v2/tasks - Create task
// =============================================================================

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const bodyResult = await parseBody(request, CreateTaskV2Schema)
    if (!bodyResult.success) {
      return validationError(bodyResult.error)
    }

    const data = bodyResult.data

    // Validate child belongs to household
    if (data.childId) {
      const child = await queryOne<{ id: string }>(`
        SELECT id FROM children
        WHERE id = $1 AND household_id = $2 AND is_active = true
      `, [data.childId, householdId])

      if (!child) {
        return notFound("child")
      }
    }

    // Validate assigned_to belongs to household
    if (data.assignedTo) {
      const member = await queryOne<{ user_id: string }>(`
        SELECT user_id FROM household_members
        WHERE user_id = $1 AND household_id = $2 AND is_active = true
      `, [data.assignedTo, householdId])

      if (!member) {
        return notFound("member")
      }
    }

    // Create task (map v2 priority to internal)
    const result = await query<{ id: string }>(`
      INSERT INTO tasks (
        household_id,
        title,
        description,
        priority,
        deadline,
        assigned_to,
        child_id,
        category_id,
        is_critical,
        created_by,
        load_weight
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      householdId,
      data.title,
      data.description ?? null,
      mapPriorityFromV2(data.priority),
      data.deadline ?? null,
      data.assignedTo ?? null,
      data.childId ?? null,
      data.categoryId ?? null,
      data.isCritical,
      userId,
      data.isCritical ? 5 : 3,
    ])

    if (result.length === 0) {
      return internalError()
    }

    // Get created task
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
    `, [result[0]!.id])

    const v2Task = task ? mapToV2Response(task) : null

    const response = NextResponse.json({ data: v2Task }, { status: 201 })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// PATCH /api/v2/tasks - Bulk update
// =============================================================================

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const bodyResult = await parseBody(request, BulkUpdateV2Schema)
    if (!bodyResult.success) {
      return validationError(bodyResult.error)
    }

    const { ids, update } = bodyResult.data

    // Verify all tasks belong to household
    const tasksCheck = await query<{ id: string }>(`
      SELECT id FROM tasks
      WHERE id = ANY($1) AND household_id = $2
    `, [ids, householdId])

    if (tasksCheck.length !== ids.length) {
      return createErrorResponse("resource_not_found", "en", {
        message: "Some tasks not found or not accessible",
      })
    }

    // Build update
    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (update.title !== undefined) {
      updates.push(`title = $${idx}`)
      values.push(update.title)
      idx++
    }
    if (update.description !== undefined) {
      updates.push(`description = $${idx}`)
      values.push(update.description)
      idx++
    }
    if (update.priority !== undefined) {
      updates.push(`priority = $${idx}`)
      values.push(mapPriorityFromV2(update.priority))
      idx++
    }
    if (update.status !== undefined) {
      updates.push(`status = $${idx}`)
      values.push(update.status)
      idx++
      if (update.status === "done") {
        updates.push(`completed_at = NOW()`)
        updates.push(`completed_by = $${idx}`)
        values.push(userId)
        idx++
      }
    }
    if (update.deadline !== undefined) {
      updates.push(`deadline = $${idx}`)
      values.push(update.deadline)
      idx++
    }
    if (update.assignedTo !== undefined) {
      updates.push(`assigned_to = $${idx}`)
      values.push(update.assignedTo)
      idx++
    }
    if (update.childId !== undefined) {
      updates.push(`child_id = $${idx}`)
      values.push(update.childId)
      idx++
    }
    if (update.categoryId !== undefined) {
      updates.push(`category_id = $${idx}`)
      values.push(update.categoryId)
      idx++
    }
    if (update.isCritical !== undefined) {
      updates.push(`is_critical = $${idx}`)
      values.push(update.isCritical)
      idx++
    }

    updates.push("updated_at = NOW()")

    if (updates.length === 1) {
      return validationError("No updates provided")
    }

    await query(`
      UPDATE tasks
      SET ${updates.join(", ")}
      WHERE id = ANY($${idx})
    `, [...values, ids])

    const response = NextResponse.json({
      data: { updated: ids.length },
      meta: { ids },
    })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// DELETE /api/v2/tasks - Bulk delete
// =============================================================================

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (_userId, householdId) => {
    const bodyResult = await parseBody(request, BulkDeleteV2Schema)
    if (!bodyResult.success) {
      return validationError(bodyResult.error)
    }

    const { ids } = bodyResult.data

    // Delete tasks (only from this household)
    const result = await query<{ id: string }>(`
      DELETE FROM tasks
      WHERE id = ANY($1) AND household_id = $2
      RETURNING id
    `, [ids, householdId])

    const response = NextResponse.json({
      data: { deleted: result.length },
      meta: { ids: result.map(r => r.id) },
    })
    return addVersionHeaders(response, API_VERSION)
  })
}
