/**
 * Real-time Updates Service
 *
 * Provides real-time synchronization for household data using
 * Server-Sent Events (SSE) for browser compatibility.
 */

import { query, queryOne } from "@/lib/aws/database"
import { randomUUID } from "crypto"

// =============================================================================
// TYPES
// =============================================================================

export type RealtimeEventType =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted"
  | "notification_new"
  | "notification_read"
  | "balance_updated"
  | "streak_updated"
  | "child_updated"
  | "member_joined"
  | "member_left"
  | "household_updated"
  | "ping"

export interface RealtimeEvent {
  id: string
  type: RealtimeEventType
  householdId: string
  userId?: string
  data: Record<string, unknown>
  timestamp: string
}

export interface SSEConnection {
  id: string
  userId: string
  householdId: string
  controller: ReadableStreamDefaultController<Uint8Array>
  lastActivity: Date
  createdAt: Date
}

// =============================================================================
// IN-MEMORY CONNECTION STORE
// =============================================================================

// In production, this would be Redis or similar for multi-instance support
const connections = new Map<string, SSEConnection>()
const householdConnections = new Map<string, Set<string>>()

/**
 * Register a new SSE connection
 */
export function registerConnection(
  userId: string,
  householdId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): string {
  const connectionId = randomUUID()

  const connection: SSEConnection = {
    id: connectionId,
    userId,
    householdId,
    controller,
    lastActivity: new Date(),
    createdAt: new Date(),
  }

  connections.set(connectionId, connection)

  // Add to household index
  if (!householdConnections.has(householdId)) {
    householdConnections.set(householdId, new Set())
  }
  householdConnections.get(householdId)?.add(connectionId)

  return connectionId
}

/**
 * Remove an SSE connection
 */
export function removeConnection(connectionId: string): void {
  const connection = connections.get(connectionId)
  if (!connection) return

  // Remove from household index
  householdConnections.get(connection.householdId)?.delete(connectionId)
  if (householdConnections.get(connection.householdId)?.size === 0) {
    householdConnections.delete(connection.householdId)
  }

  connections.delete(connectionId)
}

/**
 * Get active connection count for a household
 */
export function getHouseholdConnectionCount(householdId: string): number {
  return householdConnections.get(householdId)?.size ?? 0
}

/**
 * Get all connection IDs for a user
 */
export function getUserConnections(userId: string): string[] {
  const userConnections: string[] = []
  for (const [id, conn] of connections) {
    if (conn.userId === userId) {
      userConnections.push(id)
    }
  }
  return userConnections
}

// =============================================================================
// BROADCAST FUNCTIONS
// =============================================================================

/**
 * Broadcast an event to all connections in a household
 */
export function broadcastToHousehold(
  householdId: string,
  event: Omit<RealtimeEvent, "id" | "timestamp">
): number {
  const connectionIds = householdConnections.get(householdId)
  if (!connectionIds || connectionIds.size === 0) {
    return 0
  }

  const fullEvent: RealtimeEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  }

  const eventData = formatSSEMessage(fullEvent)
  let sentCount = 0

  for (const connectionId of connectionIds) {
    const connection = connections.get(connectionId)
    if (connection) {
      try {
        connection.controller.enqueue(eventData)
        connection.lastActivity = new Date()
        sentCount++
      } catch {
        // Connection closed, remove it
        removeConnection(connectionId)
      }
    }
  }

  return sentCount
}

/**
 * Broadcast an event to a specific user (all their connections)
 */
export function broadcastToUser(
  userId: string,
  event: Omit<RealtimeEvent, "id" | "timestamp">
): number {
  const userConnectionIds = getUserConnections(userId)
  if (userConnectionIds.length === 0) {
    return 0
  }

  const fullEvent: RealtimeEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  }

  const eventData = formatSSEMessage(fullEvent)
  let sentCount = 0

  for (const connectionId of userConnectionIds) {
    const connection = connections.get(connectionId)
    if (connection) {
      try {
        connection.controller.enqueue(eventData)
        connection.lastActivity = new Date()
        sentCount++
      } catch {
        removeConnection(connectionId)
      }
    }
  }

  return sentCount
}

/**
 * Send event to a specific connection
 */
export function sendToConnection(
  connectionId: string,
  event: Omit<RealtimeEvent, "id" | "timestamp">
): boolean {
  const connection = connections.get(connectionId)
  if (!connection) return false

  const fullEvent: RealtimeEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  }

  try {
    connection.controller.enqueue(formatSSEMessage(fullEvent))
    connection.lastActivity = new Date()
    return true
  } catch {
    removeConnection(connectionId)
    return false
  }
}

// =============================================================================
// EVENT HELPERS
// =============================================================================

/**
 * Broadcast a task event
 */
export async function broadcastTaskEvent(
  type: "task_created" | "task_updated" | "task_completed" | "task_deleted",
  taskId: string,
  householdId: string,
  userId?: string,
  additionalData?: Record<string, unknown>
): Promise<number> {
  // Get task summary for the event
  const task = await queryOne<{
    id: string
    title: string
    status: string
    priority: string
    child_id: string | null
    child_name: string | null
    deadline: string | null
  }>(`
    SELECT
      t.id, t.title, t.status, t.priority,
      t.child_id, c.first_name as child_name,
      t.deadline::text
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    WHERE t.id = $1
  `, [taskId])

  return broadcastToHousehold(householdId, {
    type,
    householdId,
    userId,
    data: {
      task: task ?? { id: taskId },
      ...additionalData,
    },
  })
}

/**
 * Broadcast a notification event
 */
export function broadcastNotification(
  householdId: string,
  userId: string,
  notification: {
    id: string
    type: string
    title: string
    body?: string
  }
): number {
  return broadcastToHousehold(householdId, {
    type: "notification_new",
    householdId,
    userId,
    data: { notification },
  })
}

/**
 * Broadcast balance update
 */
export async function broadcastBalanceUpdate(
  householdId: string
): Promise<number> {
  // Get current balance for all members
  const balance = await query<{
    user_id: string
    name: string
    score: number
    tasks_completed: number
  }>(`
    SELECT
      u.id as user_id,
      u.name,
      COALESCE(SUM(tc.points_value), 0)::int as score,
      COUNT(t.id)::int as tasks_completed
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    LEFT JOIN tasks t ON t.completed_by = hm.user_id
      AND t.household_id = hm.household_id
      AND t.completed_at > NOW() - INTERVAL '7 days'
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY u.id, u.name
  `, [householdId])

  return broadcastToHousehold(householdId, {
    type: "balance_updated",
    householdId,
    data: { balance },
  })
}

/**
 * Broadcast streak update
 */
export async function broadcastStreakUpdate(
  householdId: string
): Promise<number> {
  const streak = await queryOne<{
    streak_current: number
    streak_best: number
    last_task_completed_at: string | null
  }>(`
    SELECT streak_current, streak_best, last_task_completed_at::text
    FROM households
    WHERE id = $1
  `, [householdId])

  return broadcastToHousehold(householdId, {
    type: "streak_updated",
    householdId,
    data: { streak: streak ?? { streak_current: 0, streak_best: 0 } },
  })
}

// =============================================================================
// SSE FORMATTING
// =============================================================================

/**
 * Format a RealtimeEvent as SSE message
 */
function formatSSEMessage(event: RealtimeEvent): Uint8Array {
  const data = `event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`
  return new TextEncoder().encode(data)
}

/**
 * Send a ping to keep connection alive
 */
export function sendPing(connectionId: string): boolean {
  const connection = connections.get(connectionId)
  if (!connection) return false

  try {
    const ping = new TextEncoder().encode(`: ping\n\n`)
    connection.controller.enqueue(ping)
    connection.lastActivity = new Date()
    return true
  } catch {
    removeConnection(connectionId)
    return false
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up stale connections (no activity for > 5 minutes)
 */
export function cleanupStaleConnections(): number {
  const staleThreshold = 5 * 60 * 1000 // 5 minutes
  const now = Date.now()
  let cleaned = 0

  for (const [id, connection] of connections) {
    if (now - connection.lastActivity.getTime() > staleThreshold) {
      try {
        connection.controller.close()
      } catch {
        // Already closed
      }
      removeConnection(id)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number
  householdsActive: number
  connectionsByHousehold: Record<string, number>
} {
  const connectionsByHousehold: Record<string, number> = {}
  for (const [householdId, connIds] of householdConnections) {
    connectionsByHousehold[householdId] = connIds.size
  }

  return {
    totalConnections: connections.size,
    householdsActive: householdConnections.size,
    connectionsByHousehold,
  }
}

// =============================================================================
// SUBSCRIPTION HELPERS
// =============================================================================

/**
 * Create an SSE response stream for a household subscription
 */
export function createSSEStream(
  userId: string,
  householdId: string,
  onClose?: () => void
): ReadableStream<Uint8Array> {
  let connectionId: string

  return new ReadableStream<Uint8Array>({
    start(controller) {
      connectionId = registerConnection(userId, householdId, controller)

      // Send initial connection event
      const connectEvent: RealtimeEvent = {
        id: randomUUID(),
        type: "ping",
        householdId,
        userId,
        data: {
          connectionId,
          message: "Connected to real-time updates",
        },
        timestamp: new Date().toISOString(),
      }
      controller.enqueue(formatSSEMessage(connectEvent))

      // Start ping interval
      const pingInterval = setInterval(() => {
        if (!sendPing(connectionId)) {
          clearInterval(pingInterval)
        }
      }, 30000) // 30 seconds

      // Cleanup on cancel
      return () => {
        clearInterval(pingInterval)
        removeConnection(connectionId)
        onClose?.()
      }
    },
    cancel() {
      removeConnection(connectionId)
      onClose?.()
    },
  })
}

// =============================================================================
// INTEGRATION WITH TASK ACTIONS
// =============================================================================

/**
 * Hook to call after task operations
 */
export const realtimeHooks = {
  async onTaskCreated(taskId: string, householdId: string, userId: string) {
    await broadcastTaskEvent("task_created", taskId, householdId, userId)
  },

  async onTaskUpdated(taskId: string, householdId: string, userId: string) {
    await broadcastTaskEvent("task_updated", taskId, householdId, userId)
  },

  async onTaskCompleted(taskId: string, householdId: string, userId: string) {
    await broadcastTaskEvent("task_completed", taskId, householdId, userId)
    await broadcastStreakUpdate(householdId)
    await broadcastBalanceUpdate(householdId)
  },

  async onTaskDeleted(taskId: string, householdId: string, userId: string) {
    await broadcastTaskEvent("task_deleted", taskId, householdId, userId)
  },
}
