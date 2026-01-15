/**
 * Event Broadcaster Service
 *
 * Handles real-time event broadcasting:
 * - Task updates broadcast
 * - Household notifications
 * - Presence indicators
 * - Event filtering and routing
 */

import {
  type WebSocketMessage,
  createMessage,
  serializeMessage,
} from "./websocket-manager"

// =============================================================================
// TYPES
// =============================================================================

export type EventCategory = "task" | "household" | "member" | "notification" | "presence" | "system"
export type EventPriority = "low" | "normal" | "high" | "urgent"
export type PresenceStatus = "online" | "away" | "busy" | "offline"

export interface BroadcastEvent {
  id: string
  category: EventCategory
  type: string
  payload: unknown
  priority: EventPriority
  targetRooms: string[]
  targetMembers?: string[]
  excludeMembers?: string[]
  timestamp: Date
  expiresAt?: Date
  requiresAck: boolean
  metadata: Record<string, unknown>
}

export interface TaskEvent {
  taskId: string
  householdId: string
  action: "created" | "updated" | "deleted" | "assigned" | "completed" | "commented"
  task?: TaskSnapshot
  changes?: TaskChanges
  actor: string
  actorName: string
}

export interface TaskSnapshot {
  id: string
  title: string
  status: string
  assignedTo?: string
  dueDate?: string
  priority: number
}

export interface TaskChanges {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface HouseholdEvent {
  householdId: string
  action: "member_joined" | "member_left" | "settings_updated" | "invite_sent"
  memberId?: string
  memberName?: string
  changes?: Record<string, unknown>
}

export interface PresenceEvent {
  memberId: string
  memberName: string
  householdId: string
  status: PresenceStatus
  lastSeen?: Date
  device?: string
  location?: string
}

export interface NotificationEvent {
  id: string
  type: "reminder" | "mention" | "update" | "alert" | "achievement"
  title: string
  body: string
  targetMember: string
  link?: string
  actions?: NotificationAction[]
  sound?: boolean
  badge?: boolean
}

export interface NotificationAction {
  id: string
  label: string
  action: string
}

export interface EventSubscription {
  id: string
  memberId: string
  categories: EventCategory[]
  filters: EventFilter[]
  createdAt: Date
}

export interface EventFilter {
  field: string
  operator: "eq" | "ne" | "in" | "contains" | "gt" | "lt"
  value: unknown
}

export interface EventDelivery {
  eventId: string
  targetId: string
  delivered: boolean
  deliveredAt?: Date
  acknowledged: boolean
  acknowledgedAt?: Date
  retryCount: number
}

export interface BroadcastStats {
  totalBroadcasts: number
  byCategory: Record<EventCategory, number>
  byPriority: Record<EventPriority, number>
  deliveryRate: number
  avgDeliveryTime: number
}

// =============================================================================
// EVENT CREATION
// =============================================================================

/**
 * Create a broadcast event
 */
export function createBroadcastEvent(
  category: EventCategory,
  type: string,
  payload: unknown,
  options: {
    targetRooms?: string[]
    targetMembers?: string[]
    excludeMembers?: string[]
    priority?: EventPriority
    requiresAck?: boolean
    expiresInMs?: number
    metadata?: Record<string, unknown>
  } = {}
): BroadcastEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category,
    type,
    payload,
    priority: options.priority ?? "normal",
    targetRooms: options.targetRooms ?? [],
    targetMembers: options.targetMembers,
    excludeMembers: options.excludeMembers,
    timestamp: new Date(),
    expiresAt: options.expiresInMs
      ? new Date(Date.now() + options.expiresInMs)
      : undefined,
    requiresAck: options.requiresAck ?? false,
    metadata: options.metadata ?? {},
  }
}

/**
 * Create task event
 */
export function createTaskEvent(
  householdId: string,
  action: TaskEvent["action"],
  taskId: string,
  actor: string,
  actorName: string,
  task?: TaskSnapshot,
  changes?: TaskChanges
): BroadcastEvent {
  const payload: TaskEvent = {
    taskId,
    householdId,
    action,
    task,
    changes,
    actor,
    actorName,
  }

  const priority: EventPriority = action === "completed" ? "high" : "normal"

  return createBroadcastEvent("task", `task.${action}`, payload, {
    targetRooms: [`household:${householdId}`],
    priority,
    requiresAck: action === "assigned",
  })
}

/**
 * Create household event
 */
export function createHouseholdEvent(
  householdId: string,
  action: HouseholdEvent["action"],
  memberId?: string,
  memberName?: string,
  changes?: Record<string, unknown>
): BroadcastEvent {
  const payload: HouseholdEvent = {
    householdId,
    action,
    memberId,
    memberName,
    changes,
  }

  return createBroadcastEvent("household", `household.${action}`, payload, {
    targetRooms: [`household:${householdId}`],
    priority: action === "member_joined" || action === "member_left" ? "high" : "normal",
  })
}

/**
 * Create presence event
 */
export function createPresenceEvent(
  memberId: string,
  memberName: string,
  householdId: string,
  status: PresenceStatus,
  device?: string
): BroadcastEvent {
  const payload: PresenceEvent = {
    memberId,
    memberName,
    householdId,
    status,
    lastSeen: status === "offline" ? new Date() : undefined,
    device,
  }

  return createBroadcastEvent("presence", `presence.${status}`, payload, {
    targetRooms: [`household:${householdId}`],
    excludeMembers: [memberId], // Don't send to self
    priority: "low",
  })
}

/**
 * Create notification event
 */
export function createNotificationEvent(
  type: NotificationEvent["type"],
  title: string,
  body: string,
  targetMember: string,
  options: {
    link?: string
    actions?: NotificationAction[]
    sound?: boolean
    badge?: boolean
  } = {}
): BroadcastEvent {
  const payload: NotificationEvent = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    body,
    targetMember,
    link: options.link,
    actions: options.actions,
    sound: options.sound ?? true,
    badge: options.badge ?? true,
  }

  const priority: EventPriority = type === "alert" ? "urgent" : type === "reminder" ? "high" : "normal"

  return createBroadcastEvent("notification", `notification.${type}`, payload, {
    targetMembers: [targetMember],
    priority,
    requiresAck: type === "reminder" || type === "alert",
  })
}

// =============================================================================
// EVENT FILTERING
// =============================================================================

/**
 * Apply filter to event
 */
export function applyFilter(event: BroadcastEvent, filter: EventFilter): boolean {
  const value = getNestedValue(event, filter.field)

  switch (filter.operator) {
    case "eq":
      return value === filter.value
    case "ne":
      return value !== filter.value
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value)
    case "contains":
      return typeof value === "string" && value.includes(String(filter.value))
    case "gt":
      return typeof value === "number" && value > (filter.value as number)
    case "lt":
      return typeof value === "number" && value < (filter.value as number)
    default:
      return true
  }
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Check if event matches subscription
 */
export function matchesSubscription(
  event: BroadcastEvent,
  subscription: EventSubscription
): boolean {
  // Check category
  if (!subscription.categories.includes(event.category)) {
    return false
  }

  // Check all filters
  for (const filter of subscription.filters) {
    if (!applyFilter(event, filter)) {
      return false
    }
  }

  return true
}

/**
 * Filter events for a member
 */
export function filterEventsForMember(
  events: BroadcastEvent[],
  memberId: string,
  subscription?: EventSubscription
): BroadcastEvent[] {
  return events.filter(event => {
    // Check if member is excluded
    if (event.excludeMembers?.includes(memberId)) {
      return false
    }

    // Check if event targets specific members
    if (event.targetMembers && !event.targetMembers.includes(memberId)) {
      return false
    }

    // Check subscription filters
    if (subscription && !matchesSubscription(event, subscription)) {
      return false
    }

    return true
  })
}

// =============================================================================
// EVENT ROUTING
// =============================================================================

export interface EventRouter {
  subscriptions: Map<string, EventSubscription>
  memberRooms: Map<string, Set<string>> // memberId -> roomIds
}

/**
 * Create event router
 */
export function createEventRouter(): EventRouter {
  return {
    subscriptions: new Map(),
    memberRooms: new Map(),
  }
}

/**
 * Add subscription
 */
export function addSubscription(
  router: EventRouter,
  subscription: EventSubscription
): EventRouter {
  const newSubscriptions = new Map(router.subscriptions)
  newSubscriptions.set(subscription.memberId, subscription)

  return {
    ...router,
    subscriptions: newSubscriptions,
  }
}

/**
 * Remove subscription
 */
export function removeSubscription(
  router: EventRouter,
  memberId: string
): EventRouter {
  const newSubscriptions = new Map(router.subscriptions)
  newSubscriptions.delete(memberId)

  return {
    ...router,
    subscriptions: newSubscriptions,
  }
}

/**
 * Add member to room
 */
export function addMemberToRouterRoom(
  router: EventRouter,
  memberId: string,
  roomId: string
): EventRouter {
  const existingRooms = router.memberRooms.get(memberId) ?? new Set()
  const newRooms = new Set(existingRooms)
  newRooms.add(roomId)

  const newMemberRooms = new Map(router.memberRooms)
  newMemberRooms.set(memberId, newRooms)

  return {
    ...router,
    memberRooms: newMemberRooms,
  }
}

/**
 * Remove member from room
 */
export function removeMemberFromRouterRoom(
  router: EventRouter,
  memberId: string,
  roomId: string
): EventRouter {
  const existingRooms = router.memberRooms.get(memberId)
  if (!existingRooms) return router

  const newRooms = new Set(existingRooms)
  newRooms.delete(roomId)

  const newMemberRooms = new Map(router.memberRooms)
  if (newRooms.size === 0) {
    newMemberRooms.delete(memberId)
  } else {
    newMemberRooms.set(memberId, newRooms)
  }

  return {
    ...router,
    memberRooms: newMemberRooms,
  }
}

/**
 * Get target members for event
 */
export function getTargetMembers(
  router: EventRouter,
  event: BroadcastEvent
): string[] {
  const members = new Set<string>()

  // Direct targets
  if (event.targetMembers) {
    event.targetMembers.forEach(m => members.add(m))
  }

  // Room targets
  for (const roomId of event.targetRooms) {
    router.memberRooms.forEach((rooms, memberId) => {
      if (rooms.has(roomId)) {
        members.add(memberId)
      }
    })
  }

  // Remove excluded
  if (event.excludeMembers) {
    event.excludeMembers.forEach(m => members.delete(m))
  }

  // Filter by subscription
  return Array.from(members).filter(memberId => {
    const subscription = router.subscriptions.get(memberId)
    if (!subscription) return true // No subscription = receive all
    return matchesSubscription(event, subscription)
  })
}

// =============================================================================
// MESSAGE CONVERSION
// =============================================================================

/**
 * Convert broadcast event to WebSocket message
 */
export function eventToMessage(event: BroadcastEvent): WebSocketMessage {
  return createMessage(
    "event",
    event.type,
    {
      id: event.id,
      category: event.category,
      payload: event.payload,
      timestamp: event.timestamp.toISOString(),
      requiresAck: event.requiresAck,
    },
    event.targetRooms[0] // Primary channel
  )
}

/**
 * Serialize event for transmission
 */
export function serializeEvent(event: BroadcastEvent): string {
  const message = eventToMessage(event)
  return serializeMessage(message)
}

// =============================================================================
// DELIVERY TRACKING
// =============================================================================

/**
 * Create delivery record
 */
export function createDeliveryRecord(
  eventId: string,
  targetId: string
): EventDelivery {
  return {
    eventId,
    targetId,
    delivered: false,
    acknowledged: false,
    retryCount: 0,
  }
}

/**
 * Mark as delivered
 */
export function markDelivered(delivery: EventDelivery): EventDelivery {
  return {
    ...delivery,
    delivered: true,
    deliveredAt: new Date(),
  }
}

/**
 * Mark as acknowledged
 */
export function markAcknowledged(delivery: EventDelivery): EventDelivery {
  return {
    ...delivery,
    acknowledged: true,
    acknowledgedAt: new Date(),
  }
}

/**
 * Increment retry count
 */
export function incrementRetry(delivery: EventDelivery): EventDelivery {
  return {
    ...delivery,
    retryCount: delivery.retryCount + 1,
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Create broadcast stats
 */
export function createBroadcastStats(): BroadcastStats {
  return {
    totalBroadcasts: 0,
    byCategory: {
      task: 0,
      household: 0,
      member: 0,
      notification: 0,
      presence: 0,
      system: 0,
    },
    byPriority: {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    },
    deliveryRate: 100,
    avgDeliveryTime: 0,
  }
}

/**
 * Record broadcast
 */
export function recordBroadcast(
  stats: BroadcastStats,
  event: BroadcastEvent
): BroadcastStats {
  return {
    ...stats,
    totalBroadcasts: stats.totalBroadcasts + 1,
    byCategory: {
      ...stats.byCategory,
      [event.category]: stats.byCategory[event.category] + 1,
    },
    byPriority: {
      ...stats.byPriority,
      [event.priority]: stats.byPriority[event.priority] + 1,
    },
  }
}

/**
 * Update delivery metrics
 */
export function updateDeliveryMetrics(
  stats: BroadcastStats,
  deliveryTime: number,
  success: boolean
): BroadcastStats {
  const successCount = success ? 1 : 0
  const newRate = (stats.deliveryRate * stats.totalBroadcasts + successCount * 100) /
    (stats.totalBroadcasts + 1)

  const newAvgTime = stats.avgDeliveryTime > 0
    ? (stats.avgDeliveryTime * 0.9 + deliveryTime * 0.1)
    : deliveryTime

  return {
    ...stats,
    deliveryRate: Math.round(newRate * 100) / 100,
    avgDeliveryTime: Math.round(newAvgTime),
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if event is expired
 */
export function isEventExpired(event: BroadcastEvent): boolean {
  if (!event.expiresAt) return false
  return new Date() > event.expiresAt
}

/**
 * Get event age in milliseconds
 */
export function getEventAge(event: BroadcastEvent): number {
  return Date.now() - event.timestamp.getTime()
}

/**
 * Sort events by priority
 */
export function sortByPriority(events: BroadcastEvent[]): BroadcastEvent[] {
  const priorityOrder: Record<EventPriority, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  }

  return [...events].sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
  )
}

/**
 * Group events by category
 */
export function groupByCategory(
  events: BroadcastEvent[]
): Record<EventCategory, BroadcastEvent[]> {
  const grouped: Record<EventCategory, BroadcastEvent[]> = {
    task: [],
    household: [],
    member: [],
    notification: [],
    presence: [],
    system: [],
  }

  for (const event of events) {
    grouped[event.category].push(event)
  }

  return grouped
}

/**
 * Create household room ID
 */
export function createHouseholdRoomId(householdId: string): string {
  return `household:${householdId}`
}

/**
 * Create member room ID
 */
export function createMemberRoomId(memberId: string): string {
  return `member:${memberId}`
}

/**
 * Parse room ID
 */
export function parseRoomId(roomId: string): { type: string; id: string } | null {
  const parts = roomId.split(":")
  if (parts.length !== 2) return null
  return { type: parts[0]!, id: parts[1]! }
}
