/**
 * Sync API v1
 *
 * Offline sync support for mobile app.
 * Handles delta sync, conflict resolution, and batch updates.
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

// Sync response types
interface SyncResponse {
  server_timestamp: string
  tasks: TaskSyncItem[]
  children: ChildSyncItem[]
  household: HouseholdSyncItem | null
  deleted_task_ids: string[]
  conflicts: ConflictItem[]
}

interface TaskSyncItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  is_critical: boolean
  deadline: string | null
  completed_at: string | null
  assigned_to: string | null
  child_id: string | null
  category_id: string | null
  load_weight: number
  updated_at: string
}

interface ChildSyncItem {
  id: string
  first_name: string
  birthdate: string
  school_level: string | null
  is_active: boolean
  updated_at: string
}

interface HouseholdSyncItem {
  id: string
  name: string
  country: string
  timezone: string
  streak_current: number
  streak_best: number
  updated_at: string
}

interface ConflictItem {
  entity_type: "task" | "child"
  entity_id: string
  local_version: unknown
  server_version: unknown
  resolution: "server_wins" | "client_wins" | "manual"
}

// Sync request schemas
const SyncPullSchema = z.object({
  last_sync: z.string().datetime().nullable(),
})

const SyncPushSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().uuid().optional(),
    local_id: z.string().optional(),
    title: z.string().min(1).max(255),
    description: z.string().max(1000).nullable().optional(),
    status: z.enum(["pending", "done", "cancelled"]),
    priority: z.enum(["low", "normal", "high", "critical"]),
    is_critical: z.boolean().optional(),
    deadline: z.string().datetime().nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    child_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    updated_at: z.string().datetime(),
    deleted: z.boolean().optional(),
  })).optional(),
  task_completions: z.array(z.object({
    task_id: z.string().uuid(),
    completed_at: z.string().datetime(),
  })).optional(),
})

/**
 * GET /api/v1/sync
 * Pull changes since last sync (delta sync)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const lastSync = request.nextUrl.searchParams.get("last_sync")
    const lastSyncDate = lastSync ? new Date(lastSync) : null

    const serverTimestamp = new Date().toISOString()

    // Get updated tasks
    let tasks: TaskSyncItem[]
    if (lastSyncDate) {
      tasks = await query<TaskSyncItem>(`
        SELECT
          id, title, description, status, priority, is_critical,
          deadline::text, completed_at::text, assigned_to, child_id,
          category_id, load_weight, updated_at::text
        FROM tasks
        WHERE household_id = $1 AND updated_at > $2 AND status != 'cancelled'
        ORDER BY updated_at DESC
        LIMIT 500
      `, [householdId, lastSyncDate.toISOString()])
    } else {
      // Full sync - get all active tasks
      tasks = await query<TaskSyncItem>(`
        SELECT
          id, title, description, status, priority, is_critical,
          deadline::text, completed_at::text, assigned_to, child_id,
          category_id, load_weight, updated_at::text
        FROM tasks
        WHERE household_id = $1 AND status != 'cancelled'
        ORDER BY updated_at DESC
        LIMIT 1000
      `, [householdId])
    }

    // Get deleted task IDs (tasks set to cancelled since last sync)
    let deletedTaskIds: string[] = []
    if (lastSyncDate) {
      const deleted = await query<{ id: string }>(`
        SELECT id FROM tasks
        WHERE household_id = $1 AND status = 'cancelled' AND updated_at > $2
      `, [householdId, lastSyncDate.toISOString()])
      deletedTaskIds = deleted.map(t => t.id)
    }

    // Get updated children
    let children: ChildSyncItem[]
    if (lastSyncDate) {
      children = await query<ChildSyncItem>(`
        SELECT
          id, first_name, birthdate::text, school_level, is_active, updated_at::text
        FROM children
        WHERE household_id = $1 AND updated_at > $2
        ORDER BY updated_at DESC
      `, [householdId, lastSyncDate.toISOString()])
    } else {
      children = await query<ChildSyncItem>(`
        SELECT
          id, first_name, birthdate::text, school_level, is_active, updated_at::text
        FROM children
        WHERE household_id = $1
        ORDER BY first_name ASC
      `, [householdId])
    }

    // Get household if updated
    let household: HouseholdSyncItem | null = null
    if (lastSyncDate) {
      household = await queryOne<HouseholdSyncItem>(`
        SELECT id, name, country, timezone, streak_current, streak_best, updated_at::text
        FROM households
        WHERE id = $1 AND updated_at > $2
      `, [householdId, lastSyncDate.toISOString()])
    } else {
      household = await queryOne<HouseholdSyncItem>(`
        SELECT id, name, country, timezone, streak_current, streak_best, updated_at::text
        FROM households
        WHERE id = $1
      `, [householdId])
    }

    const response: SyncResponse = {
      server_timestamp: serverTimestamp,
      tasks,
      children,
      household,
      deleted_task_ids: deletedTaskIds,
      conflicts: [],
    }

    return apiSuccess(response)
  })
}

/**
 * POST /api/v1/sync
 * Push local changes to server
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const bodyResult = await parseBody(request, SyncPushSchema)
    if (!bodyResult.success) {
      return apiError(bodyResult.error)
    }

    const data = bodyResult.data
    const conflicts: ConflictItem[] = []
    const createdTaskIds: Record<string, string> = {} // local_id -> server_id mapping

    // Process task updates
    if (data.tasks && data.tasks.length > 0) {
      for (const task of data.tasks) {
        if (task.deleted && task.id) {
          // Delete task
          await query(`
            UPDATE tasks SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1 AND household_id = $2
          `, [task.id, householdId])
          continue
        }

        if (task.id) {
          // Update existing task - check for conflicts
          const existing = await queryOne<{ updated_at: string }>(`
            SELECT updated_at::text FROM tasks WHERE id = $1 AND household_id = $2
          `, [task.id, householdId])

          if (existing) {
            const serverUpdated = new Date(existing.updated_at)
            const clientUpdated = new Date(task.updated_at)

            if (serverUpdated > clientUpdated) {
              // Server has newer version - conflict
              const serverVersion = await queryOne<TaskSyncItem>(`
                SELECT id, title, description, status, priority, is_critical,
                       deadline::text, completed_at::text, assigned_to, child_id,
                       category_id, load_weight, updated_at::text
                FROM tasks WHERE id = $1
              `, [task.id])

              conflicts.push({
                entity_type: "task",
                entity_id: task.id,
                local_version: task,
                server_version: serverVersion,
                resolution: "server_wins", // Default: server wins
              })
              continue
            }
          }

          // Update task
          await query(`
            UPDATE tasks SET
              title = $1,
              description = $2,
              status = $3,
              priority = $4,
              is_critical = $5,
              deadline = $6,
              assigned_to = $7,
              child_id = $8,
              category_id = $9,
              completed_at = CASE WHEN $3 = 'done' THEN NOW() ELSE NULL END,
              updated_at = NOW()
            WHERE id = $10 AND household_id = $11
          `, [
            task.title,
            task.description ?? null,
            task.status,
            task.priority,
            task.is_critical ?? false,
            task.deadline ?? null,
            task.assigned_to ?? null,
            task.child_id ?? null,
            task.category_id ?? null,
            task.id,
            householdId,
          ])
        } else if (task.local_id) {
          // Create new task
          const result = await query<{ id: string }>(`
            INSERT INTO tasks (
              household_id, title, description, status, priority, is_critical,
              deadline, assigned_to, child_id, category_id, created_by, load_weight
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [
            householdId,
            task.title,
            task.description ?? null,
            task.status,
            task.priority,
            task.is_critical ?? false,
            task.deadline ?? null,
            task.assigned_to ?? null,
            task.child_id ?? null,
            task.category_id ?? null,
            userId,
            task.is_critical ? 5 : 3,
          ])

          if (result.length > 0) {
            createdTaskIds[task.local_id] = result[0]!.id
          }
        }
      }
    }

    // Process task completions
    if (data.task_completions && data.task_completions.length > 0) {
      for (const completion of data.task_completions) {
        await query(`
          UPDATE tasks SET
            status = 'done',
            completed_at = $1,
            updated_at = NOW()
          WHERE id = $2 AND household_id = $3 AND status = 'pending'
        `, [completion.completed_at, completion.task_id, householdId])
      }
    }

    return apiSuccess({
      synced_at: new Date().toISOString(),
      created_task_ids: createdTaskIds,
      conflicts,
      tasks_synced: data.tasks?.length ?? 0,
      completions_synced: data.task_completions?.length ?? 0,
    })
  })
}
