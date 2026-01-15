/**
 * Mobile Offline Sync API (Enhanced)
 *
 * GET: Get sync status and pending changes count
 * POST: Perform full sync operation with compression and delta sync
 * PUT: Push local changes to server with conflict resolution
 *
 * Features:
 * - Response compression (gzip/brotli)
 * - Battery-aware sync strategies
 * - Network-adaptive payload sizing
 * - Incremental/delta sync support
 * - Enhanced conflict resolution
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  apiSuccess,
  apiError,
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import {
  getSyncStatus,
  recordSyncTimestamp,
  getLastSyncTimestamp,
  checkMobileRateLimit,
  batchCreateTasks,
  batchCompleteTasks,
  SyncRequestSchema,
} from "@/lib/services/mobile-api"
import {
  createCompressedResponse,
  getCompressionPreferences,
  calculateDelta,
} from "@/lib/mobile/response-compression"
import {
  parseBatteryStatus,
  getSyncConfig,
  addBatteryAwareHeaders,
} from "@/lib/mobile/battery-aware-sync"
import {
  parseNetworkStatus,
  getAdaptivePayloadConfig,
  addConnectivityHeaders,
} from "@/lib/mobile/connectivity-handler"

// =============================================================================
// TYPES
// =============================================================================

interface TaskSyncItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  is_critical: boolean
  deadline: string | null
  completed_at: string | null
  completed_by: string | null
  assigned_to: string | null
  child_id: string | null
  category_id: string | null
  load_weight: number
  created_at: string
  updated_at: string
}

interface ChildSyncItem {
  id: string
  first_name: string
  birthdate: string
  school_level: string | null
  is_active: boolean
  created_at: string
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

interface CategorySyncItem {
  id: string
  name_fr: string
  name_en: string
  icon: string
  color: string
  points_value: number
}

// =============================================================================
// SCHEMAS
// =============================================================================

const SyncPushSchema = z.object({
  deviceId: z.string().max(100).optional(),
  tasks: z.array(z.object({
    localId: z.string(),
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    description: z.string().max(1000).nullable().optional(),
    status: z.enum(["pending", "done", "cancelled", "postponed"]),
    priority: z.enum(["low", "normal", "high", "critical"]),
    isCritical: z.boolean().optional(),
    deadline: z.string().datetime().nullable().optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    childId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    updatedAt: z.string().datetime(),
    deleted: z.boolean().optional(),
  })).optional(),
  completions: z.array(z.object({
    taskId: z.string().uuid(),
    completedAt: z.string().datetime(),
  })).optional(),
})

// Enhanced sync request with delta support
const IncrementalSyncSchema = SyncRequestSchema.extend({
  lastKnownTaskIds: z.array(z.string().uuid()).optional(),
  lastKnownChildIds: z.array(z.string().uuid()).optional(),
  useDeltaSync: z.boolean().optional().default(true),
  maxPayloadSize: z.number().optional(),
})

// =============================================================================
// GET /api/mobile/sync
// =============================================================================

/**
 * GET /api/mobile/sync
 * Get sync status and pending changes count
 * Enhanced with battery and network awareness
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const deviceId = request.nextUrl.searchParams.get("device_id") ?? "default"
    const lastSync = request.nextUrl.searchParams.get("last_sync")

    // Parse device context
    const batteryStatus = parseBatteryStatus(request.headers)
    const networkStatus = parseNetworkStatus(request.headers)
    const syncConfig = getSyncConfig(batteryStatus)
    const payloadConfig = getAdaptivePayloadConfig(networkStatus)

    // Get last sync timestamp from cache or param
    const lastSyncTimestamp = lastSync ?? getLastSyncTimestamp(userId, deviceId)

    const syncStatus = await getSyncStatus(userId, householdId, lastSyncTimestamp)

    const responseData = {
      lastSyncAt: syncStatus.lastSyncAt,
      pendingChanges: syncStatus.pendingChanges,
      serverVersion: syncStatus.serverVersion,
      requiresFullSync: syncStatus.requiresFullSync,
      // New: Include recommended sync configuration
      syncConfig: {
        strategy: syncConfig.strategy,
        syncInterval: syncConfig.syncInterval,
        maxPayloadSize: Math.min(syncConfig.maxPayloadSize, payloadConfig.maxPayloadSize),
        enableBackgroundSync: syncConfig.enableBackgroundSync,
        enablePush: syncConfig.enablePush,
        batchSize: syncConfig.batchSize,
      },
      networkQuality: networkStatus.quality,
      batteryLevel: batteryStatus.batteryLevel,
    }

    // Use compression for response
    const compressionPrefs = getCompressionPreferences(request)
    const response = createCompressedResponse(
      { success: true, data: responseData },
      request.headers.get("Accept-Encoding"),
      compressionPrefs
    )

    // Add context headers
    addBatteryAwareHeaders(response.headers, batteryStatus, syncConfig)
    addConnectivityHeaders(response.headers, networkStatus, payloadConfig)

    return response
  })
}

// =============================================================================
// POST /api/mobile/sync
// =============================================================================

/**
 * POST /api/mobile/sync
 * Pull all data for full or delta sync
 * Enhanced with compression and incremental sync
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Parse device context
    const batteryStatus = parseBatteryStatus(request.headers)
    const networkStatus = parseNetworkStatus(request.headers)
    const syncConfig = getSyncConfig(batteryStatus)
    const payloadConfig = getAdaptivePayloadConfig(networkStatus)

    // Rate limit
    const rateLimit = checkMobileRateLimit(userId, "/api/mobile/sync")
    if (!rateLimit.allowed) {
      const response = apiError("Trop de requêtes. Réessayez plus tard.", 429)
      response.headers.set("X-RateLimit-Remaining", "0")
      response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)))
      return response
    }

    const bodyResult = await parseBody(request, IncrementalSyncSchema)
    if (!bodyResult.success) {
      return apiError(bodyResult.error)
    }

    const {
      lastSyncTimestamp,
      deviceId,
      includeDeleted,
      lastKnownTaskIds,
      lastKnownChildIds,
      useDeltaSync,
      maxPayloadSize,
    } = bodyResult.data

    // Determine effective max payload size
    const effectiveMaxPayload = Math.min(
      maxPayloadSize ?? Infinity,
      syncConfig.maxPayloadSize,
      payloadConfig.maxPayloadSize
    )

    const serverTimestamp = new Date().toISOString()

    // Get tasks
    let tasks: TaskSyncItem[]
    if (lastSyncTimestamp) {
      tasks = await query<TaskSyncItem>(`
        SELECT
          id, title, description, status, priority, is_critical,
          deadline::text, completed_at::text, completed_by,
          assigned_to, child_id, category_id, load_weight,
          created_at::text, updated_at::text
        FROM tasks
        WHERE household_id = $1
          AND updated_at > $2
          ${includeDeleted ? "" : "AND status != 'cancelled'"}
        ORDER BY updated_at DESC
        LIMIT 500
      `, [householdId, lastSyncTimestamp])
    } else {
      tasks = await query<TaskSyncItem>(`
        SELECT
          id, title, description, status, priority, is_critical,
          deadline::text, completed_at::text, completed_by,
          assigned_to, child_id, category_id, load_weight,
          created_at::text, updated_at::text
        FROM tasks
        WHERE household_id = $1
          ${includeDeleted ? "" : "AND status != 'cancelled'"}
        ORDER BY updated_at DESC
        LIMIT 1000
      `, [householdId])
    }

    // Get deleted task IDs
    let deletedTaskIds: string[] = []
    if (lastSyncTimestamp) {
      const deleted = await query<{ id: string }>(`
        SELECT id FROM tasks
        WHERE household_id = $1
          AND status = 'cancelled'
          AND updated_at > $2
      `, [householdId, lastSyncTimestamp])
      deletedTaskIds = deleted.map(t => t.id)
    }

    // Get children
    let children: ChildSyncItem[]
    if (lastSyncTimestamp) {
      children = await query<ChildSyncItem>(`
        SELECT
          id, first_name, birthdate::text, school_level, is_active,
          created_at::text, updated_at::text
        FROM children
        WHERE household_id = $1 AND updated_at > $2
        ORDER BY updated_at DESC
      `, [householdId, lastSyncTimestamp])
    } else {
      children = await query<ChildSyncItem>(`
        SELECT
          id, first_name, birthdate::text, school_level, is_active,
          created_at::text, updated_at::text
        FROM children
        WHERE household_id = $1
        ORDER BY first_name ASC
      `, [householdId])
    }

    // Get household
    const household = await queryOne<HouseholdSyncItem>(`
      SELECT
        id, name, country, timezone, streak_current, streak_best,
        updated_at::text
      FROM households
      WHERE id = $1
    `, [householdId])

    // Get categories (always full list as they rarely change)
    const categories = await query<CategorySyncItem>(`
      SELECT id, name_fr, name_en, icon, color, points_value
      FROM task_categories
      ORDER BY name_fr ASC
    `)

    // Get household members
    const members = await query<{
      user_id: string
      name: string | null
      email: string
      role: string
      avatar_url: string | null
    }>(`
      SELECT
        hm.user_id, u.name, u.email, hm.role, u.avatar_url
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = $1 AND hm.is_active = true
    `, [householdId])

    // Record sync timestamp
    if (deviceId) {
      recordSyncTimestamp(userId, deviceId, serverTimestamp)
    }

    // Calculate delta if requested and possible
    let syncData: {
      tasks: TaskSyncItem[]
      children: ChildSyncItem[]
      household: HouseholdSyncItem | null
      categories: CategorySyncItem[]
      members: Array<{
        user_id: string
        name: string | null
        email: string
        role: string
        avatar_url: string | null
      }>
      deletedTaskIds: string[]
      delta?: {
        createdTasks: TaskSyncItem[]
        updatedTasks: TaskSyncItem[]
        createdChildren: ChildSyncItem[]
        updatedChildren: ChildSyncItem[]
      }
    }

    if (useDeltaSync && lastSyncTimestamp && (lastKnownTaskIds || lastKnownChildIds)) {
      // Use delta sync
      const taskDelta = calculateDelta(
        tasks.map(t => ({ ...t, id: t.id, updatedAt: t.updated_at })),
        lastSyncTimestamp,
        lastKnownTaskIds ?? []
      )

      const childDelta = calculateDelta(
        children.map(c => ({ ...c, id: c.id, updatedAt: c.updated_at })),
        lastSyncTimestamp,
        lastKnownChildIds ?? []
      )

      syncData = {
        tasks: [], // Empty for delta sync
        children: [],
        household,
        categories,
        members,
        deletedTaskIds: [...deletedTaskIds, ...taskDelta.deleted],
        delta: {
          createdTasks: taskDelta.created as unknown as TaskSyncItem[],
          updatedTasks: taskDelta.updated as unknown as TaskSyncItem[],
          createdChildren: childDelta.created as unknown as ChildSyncItem[],
          updatedChildren: childDelta.updated as unknown as ChildSyncItem[],
        },
      }
    } else {
      syncData = {
        tasks,
        children,
        household,
        categories,
        members,
        deletedTaskIds,
      }
    }

    const responsePayload = {
      success: true,
      data: {
        serverTimestamp,
        isFullSync: !lastSyncTimestamp,
        isDeltaSync: useDeltaSync && !!lastSyncTimestamp,
        ...syncData,
        counts: {
          tasks: syncData.delta
            ? syncData.delta.createdTasks.length + syncData.delta.updatedTasks.length
            : tasks.length,
          children: syncData.delta
            ? syncData.delta.createdChildren.length + syncData.delta.updatedChildren.length
            : children.length,
          categories: categories.length,
          members: members.length,
          deletedTasks: syncData.deletedTaskIds.length,
        },
        syncConfig: {
          strategy: syncConfig.strategy,
          nextSyncIn: syncConfig.syncInterval,
        },
      },
    }

    // Use compression for response
    const compressionPrefs = getCompressionPreferences(request)
    const response = createCompressedResponse(
      responsePayload,
      request.headers.get("Accept-Encoding"),
      compressionPrefs
    )

    // Add context headers
    addBatteryAwareHeaders(response.headers, batteryStatus, syncConfig)
    addConnectivityHeaders(response.headers, networkStatus, payloadConfig)

    return response
  })
}

// =============================================================================
// PUT /api/mobile/sync
// =============================================================================

/**
 * PUT /api/mobile/sync
 * Push local changes to server
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Rate limit
    const rateLimit = checkMobileRateLimit(userId, "/api/mobile/sync")
    if (!rateLimit.allowed) {
      const response = apiError("Trop de requêtes. Réessayez plus tard.", 429)
      response.headers.set("X-RateLimit-Remaining", "0")
      response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)))
      return response
    }

    const bodyResult = await parseBody(request, SyncPushSchema)
    if (!bodyResult.success) {
      return apiError(bodyResult.error)
    }

    const { deviceId, tasks, completions } = bodyResult.data
    const serverTimestamp = new Date().toISOString()

    const createdTaskIds: Record<string, string> = {}
    const updatedTaskIds: string[] = []
    const conflicts: Array<{
      taskId: string
      localId?: string
      reason: string
    }> = []

    // Process new tasks
    const newTasks = tasks?.filter(t => !t.id && t.localId) ?? []
    if (newTasks.length > 0) {
      const idMap = await batchCreateTasks(userId, householdId, newTasks.map(t => ({
        localId: t.localId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        isCritical: t.isCritical,
        deadline: t.deadline,
        childId: t.childId,
        categoryId: t.categoryId,
      })))

      for (const [localId, serverId] of idMap) {
        createdTaskIds[localId] = serverId
      }
    }

    // Process task updates
    const taskUpdates = tasks?.filter(t => t.id) ?? []
    for (const task of taskUpdates) {
      if (!task.id) continue

      if (task.deleted) {
        // Delete task
        await query(`
          UPDATE tasks
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = $1 AND household_id = $2
        `, [task.id, householdId])
        updatedTaskIds.push(task.id)
        continue
      }

      // Check for conflicts
      const existing = await queryOne<{ updated_at: string }>(`
        SELECT updated_at::text FROM tasks WHERE id = $1 AND household_id = $2
      `, [task.id, householdId])

      if (existing) {
        const serverUpdated = new Date(existing.updated_at)
        const clientUpdated = new Date(task.updatedAt)

        if (serverUpdated > clientUpdated) {
          // Server has newer version - conflict
          conflicts.push({
            taskId: task.id,
            localId: task.localId,
            reason: "Server has newer version",
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
          updated_at = NOW()
        WHERE id = $10 AND household_id = $11
      `, [
        task.title,
        task.description ?? null,
        task.status,
        task.priority,
        task.isCritical ?? false,
        task.deadline ?? null,
        task.assignedTo ?? null,
        task.childId ?? null,
        task.categoryId ?? null,
        task.id,
        householdId,
      ])

      updatedTaskIds.push(task.id)
    }

    // Process completions
    const completionResults = { completed: [] as string[], failed: [] as string[] }
    if (completions && completions.length > 0) {
      const result = await batchCompleteTasks(
        userId,
        householdId,
        completions.map(c => c.taskId)
      )
      completionResults.completed = result.completed
      completionResults.failed = result.failed
    }

    // Record sync timestamp
    if (deviceId) {
      recordSyncTimestamp(userId, deviceId, serverTimestamp)
    }

    // Parse device context for response headers
    const batteryStatus = parseBatteryStatus(request.headers)
    const networkStatus = parseNetworkStatus(request.headers)
    const syncConfig = getSyncConfig(batteryStatus)
    const payloadConfig = getAdaptivePayloadConfig(networkStatus)

    const responsePayload = {
      success: true,
      data: {
        serverTimestamp,
        createdTaskIds,
        updatedTaskIds,
        completedTaskIds: completionResults.completed,
        failedCompletions: completionResults.failed,
        conflicts,
        summary: {
          tasksCreated: Object.keys(createdTaskIds).length,
          tasksUpdated: updatedTaskIds.length,
          tasksCompleted: completionResults.completed.length,
          conflicts: conflicts.length,
        },
        syncConfig: {
          strategy: syncConfig.strategy,
          nextSyncIn: syncConfig.syncInterval,
        },
      },
    }

    // Use compression for response
    const compressionPrefs = getCompressionPreferences(request)
    const response = createCompressedResponse(
      responsePayload,
      request.headers.get("Accept-Encoding"),
      compressionPrefs
    )

    // Add context headers
    addBatteryAwareHeaders(response.headers, batteryStatus, syncConfig)
    addConnectivityHeaders(response.headers, networkStatus, payloadConfig)

    return response
  })
}
