/**
 * Tasks API v1
 *
 * REST API for tasks management, designed for mobile Flutter app.
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

// Task response type
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

// Validation schemas
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  deadline: z.string().datetime().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  child_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  is_critical: z.boolean().optional().default(false),
})

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(["pending", "done", "cancelled"]).optional(),
})

const FilterSchema = z.object({
  status: z.enum(["pending", "done", "cancelled", "all"]).optional(),
  child_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

/**
 * GET /api/v1/tasks
 * List tasks with filtering and pagination
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const searchParams = request.nextUrl.searchParams
    const { page, limit, offset } = parsePagination(searchParams)

    // Parse filters
    const status = searchParams.get("status") ?? "all"
    const childId = searchParams.get("child_id")
    const assignedTo = searchParams.get("assigned_to")
    const categoryId = searchParams.get("category_id")
    const fromDate = searchParams.get("from_date")
    const toDate = searchParams.get("to_date")

    // Build query
    let whereClause = "t.household_id = $1"
    const params: unknown[] = [householdId]
    let paramIndex = 2

    if (status !== "all") {
      whereClause += ` AND t.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (childId) {
      whereClause += ` AND t.child_id = $${paramIndex}`
      params.push(childId)
      paramIndex++
    }

    if (assignedTo) {
      whereClause += ` AND t.assigned_to = $${paramIndex}`
      params.push(assignedTo)
      paramIndex++
    }

    if (categoryId) {
      whereClause += ` AND t.category_id = $${paramIndex}`
      params.push(categoryId)
      paramIndex++
    }

    if (fromDate) {
      whereClause += ` AND (t.deadline >= $${paramIndex} OR t.created_at >= $${paramIndex})`
      params.push(fromDate)
      paramIndex++
    }

    if (toDate) {
      whereClause += ` AND (t.deadline <= $${paramIndex} OR t.created_at <= $${paramIndex})`
      params.push(toDate)
      paramIndex++
    }

    // Get total count
    const countResult = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM tasks t
      WHERE ${whereClause}
    `, params)
    const total = countResult?.count ?? 0

    // Get tasks
    const tasks = await query<TaskResponse>(`
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
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
        t.is_critical DESC,
        CASE t.priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END,
        t.deadline ASC NULLS LAST,
        t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset])

    return apiSuccess(tasks, paginationMeta(page, limit, total))
  })
}

/**
 * POST /api/v1/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const bodyResult = await parseBody(request, CreateTaskSchema)
    if (!bodyResult.success) {
      return apiError(bodyResult.error)
    }

    const data = bodyResult.data

    // Validate child belongs to household
    if (data.child_id) {
      const child = await queryOne<{ id: string }>(`
        SELECT id FROM children
        WHERE id = $1 AND household_id = $2 AND is_active = true
      `, [data.child_id, householdId])

      if (!child) {
        return apiError("Enfant non trouvé", 404)
      }
    }

    // Validate assigned_to belongs to household
    if (data.assigned_to) {
      const member = await queryOne<{ user_id: string }>(`
        SELECT user_id FROM household_members
        WHERE user_id = $1 AND household_id = $2 AND is_active = true
      `, [data.assigned_to, householdId])

      if (!member) {
        return apiError("Membre non trouvé", 404)
      }
    }

    // Create task
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
      data.priority,
      data.deadline ?? null,
      data.assigned_to ?? null,
      data.child_id ?? null,
      data.category_id ?? null,
      data.is_critical,
      userId,
      data.is_critical ? 5 : 3, // Default weight
    ])

    if (result.length === 0) {
      return apiError("Erreur lors de la création", 500)
    }

    // Get created task
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
    `, [result[0]!.id])

    return apiSuccess(task)
  })
}
