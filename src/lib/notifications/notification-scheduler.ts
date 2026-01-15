/**
 * Notification Scheduler
 *
 * Handles scheduling of notifications for task deadlines and reminders.
 * Features:
 * - Scheduled notification queue
 * - Priority-based processing
 * - Rate limiting per device
 * - Batch processing optimization
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type ScheduledNotificationStatus = "scheduled" | "pending" | "sent" | "cancelled" | "failed"
export type TriggerType = "deadline" | "reminder" | "recurring" | "instant" | "batch"

export const ScheduledNotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  taskId: z.string().optional(),
  householdId: z.string().optional(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.string()).optional(),
  scheduledFor: z.date(),
  triggerType: z.enum(["deadline", "reminder", "recurring", "instant", "batch"]),
  priority: z.number().min(1).max(10).default(5),
  status: z.enum(["scheduled", "pending", "sent", "cancelled", "failed"]),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  createdAt: z.date(),
  processedAt: z.date().optional(),
  error: z.string().optional(),
})

export type ScheduledNotification = z.infer<typeof ScheduledNotificationSchema>

export interface SchedulerConfig {
  maxConcurrent: number
  batchSize: number
  checkInterval: number // ms
  maxRetries: number
  rateLimitPerUser: number // notifications per hour
  rateLimitWindow: number // ms
}

export interface NotificationQueue {
  scheduled: Map<string, ScheduledNotification>
  pending: Map<string, ScheduledNotification>
  byUserId: Map<string, Set<string>>
  byTaskId: Map<string, Set<string>>
  rateLimits: Map<string, RateLimitEntry>
}

export interface RateLimitEntry {
  userId: string
  notificationCount: number
  windowStart: number
}

export interface ProcessResult {
  processed: number
  succeeded: number
  failed: number
  rateLimited: number
  notifications: ScheduledNotification[]
}

export interface ScheduleOptions {
  priority?: number
  maxRetries?: number
  data?: Record<string, string>
}

// =============================================================================
// QUEUE MANAGEMENT
// =============================================================================

export function createNotificationQueue(): NotificationQueue {
  return {
    scheduled: new Map(),
    pending: new Map(),
    byUserId: new Map(),
    byTaskId: new Map(),
    rateLimits: new Map(),
  }
}

export function createSchedulerConfig(
  options?: Partial<SchedulerConfig>
): SchedulerConfig {
  return {
    maxConcurrent: options?.maxConcurrent ?? 100,
    batchSize: options?.batchSize ?? 50,
    checkInterval: options?.checkInterval ?? 60000, // 1 minute
    maxRetries: options?.maxRetries ?? 3,
    rateLimitPerUser: options?.rateLimitPerUser ?? 10, // 10 notifications per hour
    rateLimitWindow: options?.rateLimitWindow ?? 3600000, // 1 hour
  }
}

// =============================================================================
// SCHEDULING
// =============================================================================

export function scheduleNotification(
  queue: NotificationQueue,
  userId: string,
  title: string,
  body: string,
  scheduledFor: Date,
  triggerType: TriggerType,
  options?: ScheduleOptions & { taskId?: string; householdId?: string }
): { queue: NotificationQueue; notification: ScheduledNotification } {
  const id = `sn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const notification: ScheduledNotification = {
    id,
    userId,
    taskId: options?.taskId,
    householdId: options?.householdId,
    title,
    body,
    data: options?.data,
    scheduledFor,
    triggerType,
    priority: options?.priority ?? 5,
    status: "scheduled",
    retryCount: 0,
    maxRetries: options?.maxRetries ?? 3,
    createdAt: new Date(),
  }

  const newScheduled = new Map(queue.scheduled)
  newScheduled.set(id, notification)

  const newByUserId = new Map(queue.byUserId)
  const userNotifications = new Set(newByUserId.get(userId) ?? [])
  userNotifications.add(id)
  newByUserId.set(userId, userNotifications)

  let newByTaskId = queue.byTaskId
  if (options?.taskId) {
    newByTaskId = new Map(queue.byTaskId)
    const taskNotifications = new Set(newByTaskId.get(options.taskId) ?? [])
    taskNotifications.add(id)
    newByTaskId.set(options.taskId, taskNotifications)
  }

  return {
    queue: {
      ...queue,
      scheduled: newScheduled,
      byUserId: newByUserId,
      byTaskId: newByTaskId,
    },
    notification,
  }
}

export function scheduleDeadlineReminder(
  queue: NotificationQueue,
  userId: string,
  taskId: string,
  taskName: string,
  deadline: Date,
  reminderMinutesBefore: number = 60
): { queue: NotificationQueue; notification: ScheduledNotification } {
  const scheduledFor = new Date(deadline.getTime() - reminderMinutesBefore * 60 * 1000)
  const timeDescription = getTimeDescription(reminderMinutesBefore)

  return scheduleNotification(
    queue,
    userId,
    `Rappel: ${taskName}`,
    `Cette tâche doit être terminée ${timeDescription}`,
    scheduledFor,
    "deadline",
    {
      taskId,
      priority: 7,
      data: { taskId, deadline: deadline.toISOString() },
    }
  )
}

export function scheduleRecurringReminder(
  queue: NotificationQueue,
  userId: string,
  taskId: string,
  title: string,
  body: string,
  nextOccurrence: Date,
  householdId?: string
): { queue: NotificationQueue; notification: ScheduledNotification } {
  return scheduleNotification(
    queue,
    userId,
    title,
    body,
    nextOccurrence,
    "recurring",
    {
      taskId,
      householdId,
      priority: 5,
      data: { taskId, recurring: "true" },
    }
  )
}

function getTimeDescription(minutes: number): string {
  if (minutes < 60) {
    return `dans ${minutes} minutes`
  }
  const hours = Math.round(minutes / 60)
  if (hours === 1) {
    return "dans 1 heure"
  }
  if (hours < 24) {
    return `dans ${hours} heures`
  }
  const days = Math.round(hours / 24)
  if (days === 1) {
    return "demain"
  }
  return `dans ${days} jours`
}

// =============================================================================
// CANCELLATION
// =============================================================================

export function cancelNotification(
  queue: NotificationQueue,
  notificationId: string
): NotificationQueue {
  const notification = queue.scheduled.get(notificationId) ?? queue.pending.get(notificationId)
  if (!notification) return queue

  const updatedNotification: ScheduledNotification = {
    ...notification,
    status: "cancelled",
    processedAt: new Date(),
  }

  const newScheduled = new Map(queue.scheduled)
  const newPending = new Map(queue.pending)

  if (queue.scheduled.has(notificationId)) {
    newScheduled.set(notificationId, updatedNotification)
  } else {
    newPending.set(notificationId, updatedNotification)
  }

  return {
    ...queue,
    scheduled: newScheduled,
    pending: newPending,
  }
}

export function cancelNotificationsForTask(
  queue: NotificationQueue,
  taskId: string
): NotificationQueue {
  const notificationIds = queue.byTaskId.get(taskId) ?? new Set()
  let updatedQueue = queue

  for (const notificationId of notificationIds) {
    updatedQueue = cancelNotification(updatedQueue, notificationId)
  }

  return updatedQueue
}

export function cancelNotificationsForUser(
  queue: NotificationQueue,
  userId: string
): NotificationQueue {
  const notificationIds = queue.byUserId.get(userId) ?? new Set()
  let updatedQueue = queue

  for (const notificationId of notificationIds) {
    updatedQueue = cancelNotification(updatedQueue, notificationId)
  }

  return updatedQueue
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export function checkRateLimit(
  queue: NotificationQueue,
  userId: string,
  config: SchedulerConfig
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = queue.rateLimits.get(userId)

  if (!entry || now - entry.windowStart > config.rateLimitWindow) {
    // No entry or window expired - full limit available
    return { allowed: true, remaining: config.rateLimitPerUser - 1 }
  }

  if (entry.notificationCount >= config.rateLimitPerUser) {
    return { allowed: false, remaining: 0 }
  }

  return {
    allowed: true,
    remaining: config.rateLimitPerUser - entry.notificationCount - 1,
  }
}

export function updateRateLimit(
  queue: NotificationQueue,
  userId: string,
  config: SchedulerConfig
): NotificationQueue {
  const now = Date.now()
  const entry = queue.rateLimits.get(userId)

  const newRateLimits = new Map(queue.rateLimits)

  if (!entry || now - entry.windowStart > config.rateLimitWindow) {
    // Start new window
    newRateLimits.set(userId, {
      userId,
      notificationCount: 1,
      windowStart: now,
    })
  } else {
    // Increment count
    newRateLimits.set(userId, {
      ...entry,
      notificationCount: entry.notificationCount + 1,
    })
  }

  return {
    ...queue,
    rateLimits: newRateLimits,
  }
}

// =============================================================================
// QUEUE PROCESSING
// =============================================================================

export function getDueNotifications(
  queue: NotificationQueue,
  now: Date = new Date()
): ScheduledNotification[] {
  const due: ScheduledNotification[] = []

  for (const notification of queue.scheduled.values()) {
    if (
      notification.status === "scheduled" &&
      notification.scheduledFor <= now
    ) {
      due.push(notification)
    }
  }

  // Sort by priority (higher first) then by scheduled time
  return due.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    return a.scheduledFor.getTime() - b.scheduledFor.getTime()
  })
}

export function moveToPending(
  queue: NotificationQueue,
  notificationIds: string[]
): NotificationQueue {
  const newScheduled = new Map(queue.scheduled)
  const newPending = new Map(queue.pending)

  for (const id of notificationIds) {
    const notification = newScheduled.get(id)
    if (notification) {
      const pendingNotification: ScheduledNotification = {
        ...notification,
        status: "pending",
      }
      newScheduled.delete(id)
      newPending.set(id, pendingNotification)
    }
  }

  return {
    ...queue,
    scheduled: newScheduled,
    pending: newPending,
  }
}

export function markSent(
  queue: NotificationQueue,
  notificationId: string
): NotificationQueue {
  const notification = queue.pending.get(notificationId)
  if (!notification) return queue

  const newPending = new Map(queue.pending)
  newPending.set(notificationId, {
    ...notification,
    status: "sent",
    processedAt: new Date(),
  })

  return {
    ...queue,
    pending: newPending,
  }
}

export function markFailed(
  queue: NotificationQueue,
  notificationId: string,
  error: string
): NotificationQueue {
  const notification = queue.pending.get(notificationId)
  if (!notification) return queue

  const newPending = new Map(queue.pending)
  const newScheduled = new Map(queue.scheduled)

  if (notification.retryCount < notification.maxRetries) {
    // Reschedule for retry
    const retryNotification: ScheduledNotification = {
      ...notification,
      status: "scheduled",
      retryCount: notification.retryCount + 1,
      scheduledFor: new Date(Date.now() + getRetryDelay(notification.retryCount)),
      error,
    }
    newPending.delete(notificationId)
    newScheduled.set(notificationId, retryNotification)
  } else {
    // Max retries reached - mark as failed
    newPending.set(notificationId, {
      ...notification,
      status: "failed",
      processedAt: new Date(),
      error,
    })
  }

  return {
    ...queue,
    scheduled: newScheduled,
    pending: newPending,
  }
}

function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 1min, 5min, 15min
  const delays = [60000, 300000, 900000]
  return delays[Math.min(retryCount, delays.length - 1)]!
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

export function processBatch(
  queue: NotificationQueue,
  config: SchedulerConfig,
  now: Date = new Date()
): { queue: NotificationQueue; toProcess: ScheduledNotification[] } {
  const due = getDueNotifications(queue, now)
  const toProcess: ScheduledNotification[] = []
  let updatedQueue = queue

  for (const notification of due) {
    if (toProcess.length >= config.batchSize) break

    const rateCheck = checkRateLimit(updatedQueue, notification.userId, config)
    if (!rateCheck.allowed) continue

    toProcess.push(notification)
    updatedQueue = updateRateLimit(updatedQueue, notification.userId, config)
  }

  // Move selected notifications to pending
  updatedQueue = moveToPending(updatedQueue, toProcess.map(n => n.id))

  return { queue: updatedQueue, toProcess }
}

export function getProcessingStats(queue: NotificationQueue): {
  scheduled: number
  pending: number
  total: number
  byStatus: Record<ScheduledNotificationStatus, number>
} {
  const byStatus: Record<ScheduledNotificationStatus, number> = {
    scheduled: 0,
    pending: 0,
    sent: 0,
    cancelled: 0,
    failed: 0,
  }

  for (const notification of queue.scheduled.values()) {
    byStatus[notification.status]++
  }

  for (const notification of queue.pending.values()) {
    byStatus[notification.status]++
  }

  return {
    scheduled: byStatus.scheduled,
    pending: byStatus.pending,
    total: queue.scheduled.size + queue.pending.size,
    byStatus,
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

export function cleanupProcessedNotifications(
  queue: NotificationQueue,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): NotificationQueue {
  const now = Date.now()
  const newPending = new Map<string, ScheduledNotification>()
  const newByUserId = new Map(queue.byUserId)
  const newByTaskId = new Map(queue.byTaskId)

  for (const [id, notification] of queue.pending) {
    if (
      notification.status === "sent" ||
      notification.status === "cancelled" ||
      notification.status === "failed"
    ) {
      const age = now - (notification.processedAt?.getTime() ?? notification.createdAt.getTime())
      if (age > maxAgeMs) {
        // Remove from indexes
        const userSet = newByUserId.get(notification.userId)
        if (userSet) {
          userSet.delete(id)
          if (userSet.size === 0) {
            newByUserId.delete(notification.userId)
          }
        }

        if (notification.taskId) {
          const taskSet = newByTaskId.get(notification.taskId)
          if (taskSet) {
            taskSet.delete(id)
            if (taskSet.size === 0) {
              newByTaskId.delete(notification.taskId)
            }
          }
        }

        continue
      }
    }
    newPending.set(id, notification)
  }

  return {
    ...queue,
    pending: newPending,
    byUserId: newByUserId,
    byTaskId: newByTaskId,
  }
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

export function getNotificationsForUser(
  queue: NotificationQueue,
  userId: string
): ScheduledNotification[] {
  const ids = queue.byUserId.get(userId) ?? new Set()
  const notifications: ScheduledNotification[] = []

  for (const id of ids) {
    const notification = queue.scheduled.get(id) ?? queue.pending.get(id)
    if (notification) {
      notifications.push(notification)
    }
  }

  return notifications.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
}

export function getNotificationsForTask(
  queue: NotificationQueue,
  taskId: string
): ScheduledNotification[] {
  const ids = queue.byTaskId.get(taskId) ?? new Set()
  const notifications: ScheduledNotification[] = []

  for (const id of ids) {
    const notification = queue.scheduled.get(id) ?? queue.pending.get(id)
    if (notification) {
      notifications.push(notification)
    }
  }

  return notifications
}

export function getUpcomingNotifications(
  queue: NotificationQueue,
  withinMs: number = 3600000 // 1 hour
): ScheduledNotification[] {
  const now = Date.now()
  const cutoff = now + withinMs
  const upcoming: ScheduledNotification[] = []

  for (const notification of queue.scheduled.values()) {
    if (
      notification.status === "scheduled" &&
      notification.scheduledFor.getTime() <= cutoff
    ) {
      upcoming.push(notification)
    }
  }

  return upcoming.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
}

export function getPendingCount(queue: NotificationQueue): number {
  return Array.from(queue.pending.values()).filter(n => n.status === "pending").length
}

export function getScheduledCount(queue: NotificationQueue): number {
  return Array.from(queue.scheduled.values()).filter(n => n.status === "scheduled").length
}
