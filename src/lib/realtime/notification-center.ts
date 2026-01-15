/**
 * Notification Center Service
 *
 * Manages real-time notifications:
 * - Real-time notification delivery
 * - Priority queuing
 * - Delivery confirmation
 * - Notification preferences
 */

// =============================================================================
// TYPES
// =============================================================================

export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_reminder"
  | "task_overdue"
  | "member_joined"
  | "member_left"
  | "mention"
  | "comment"
  | "achievement"
  | "system"
  | "custom"

export type NotificationChannel = "push" | "email" | "sms" | "in_app" | "websocket"
export type NotificationPriority = "low" | "normal" | "high" | "urgent"
export type DeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  priority: NotificationPriority
  targetMember: string
  targetHousehold?: string
  channels: NotificationChannel[]
  actions?: NotificationAction[]
  icon?: string
  image?: string
  link?: string
  groupId?: string
  expiresAt?: Date
  createdAt: Date
  scheduledFor?: Date
}

export interface NotificationAction {
  id: string
  label: string
  action: string
  style?: "default" | "primary" | "destructive"
}

export interface NotificationDelivery {
  notificationId: string
  channel: NotificationChannel
  status: DeliveryStatus
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  failureReason?: string
  retryCount: number
  metadata?: Record<string, unknown>
}

export interface NotificationPreferences {
  memberId: string
  enabled: boolean
  channels: ChannelPreferences
  types: TypePreferences
  quietHours: QuietHours
  frequency: FrequencyLimits
}

export interface ChannelPreferences {
  push: boolean
  email: boolean
  sms: boolean
  inApp: boolean
}

export interface TypePreferences {
  [key: string]: {
    enabled: boolean
    channels: NotificationChannel[]
    priority?: NotificationPriority
  }
}

export interface QuietHours {
  enabled: boolean
  start: string // HH:mm
  end: string // HH:mm
  timezone: string
  exceptions: NotificationType[] // Types that bypass quiet hours
}

export interface FrequencyLimits {
  maxPerHour: number
  maxPerDay: number
  groupingWindow: number // seconds
}

export interface NotificationGroup {
  id: string
  type: NotificationType
  notifications: string[] // notification IDs
  summary: string
  count: number
  lastUpdated: Date
}

export interface NotificationQueue {
  pending: QueuedNotification[]
  processing: string[] // notification IDs
  maxConcurrent: number
  rateLimitPerSecond: number
}

export interface QueuedNotification {
  notification: Notification
  addedAt: Date
  attempts: number
  nextAttempt?: Date
  priority: number // 1-10
}

export interface NotificationStats {
  sent: number
  delivered: number
  read: number
  failed: number
  byType: Record<NotificationType, number>
  byChannel: Record<NotificationChannel, number>
  avgDeliveryTime: number
}

// =============================================================================
// NOTIFICATION CREATION
// =============================================================================

/**
 * Create a notification
 */
export function createNotification(
  type: NotificationType,
  title: string,
  body: string,
  targetMember: string,
  options: {
    data?: Record<string, unknown>
    priority?: NotificationPriority
    channels?: NotificationChannel[]
    actions?: NotificationAction[]
    icon?: string
    image?: string
    link?: string
    groupId?: string
    expiresInMs?: number
    scheduleForDate?: Date
    targetHousehold?: string
  } = {}
): Notification {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    body,
    data: options.data,
    priority: options.priority ?? "normal",
    targetMember,
    targetHousehold: options.targetHousehold,
    channels: options.channels ?? ["in_app", "push"],
    actions: options.actions,
    icon: options.icon,
    image: options.image,
    link: options.link,
    groupId: options.groupId,
    expiresAt: options.expiresInMs
      ? new Date(Date.now() + options.expiresInMs)
      : undefined,
    createdAt: new Date(),
    scheduledFor: options.scheduleForDate,
  }
}

/**
 * Create task assigned notification
 */
export function createTaskAssignedNotification(
  targetMember: string,
  taskId: string,
  taskTitle: string,
  assignerName: string,
  householdId: string
): Notification {
  return createNotification(
    "task_assigned",
    "New Task Assigned",
    `${assignerName} assigned you: ${taskTitle}`,
    targetMember,
    {
      data: { taskId, assignerName },
      priority: "high",
      link: `/tasks/${taskId}`,
      targetHousehold: householdId,
      actions: [
        { id: "view", label: "View Task", action: "view_task", style: "primary" },
        { id: "later", label: "Later", action: "dismiss" },
      ],
    }
  )
}

/**
 * Create task reminder notification
 */
export function createTaskReminderNotification(
  targetMember: string,
  taskId: string,
  taskTitle: string,
  dueIn: string,
  householdId: string
): Notification {
  return createNotification(
    "task_reminder",
    "Task Reminder",
    `"${taskTitle}" is due ${dueIn}`,
    targetMember,
    {
      data: { taskId, dueIn },
      priority: "high",
      link: `/tasks/${taskId}`,
      targetHousehold: householdId,
      icon: "clock",
    }
  )
}

/**
 * Create task overdue notification
 */
export function createTaskOverdueNotification(
  targetMember: string,
  taskId: string,
  taskTitle: string,
  overdueBy: string,
  householdId: string
): Notification {
  return createNotification(
    "task_overdue",
    "Task Overdue",
    `"${taskTitle}" is overdue by ${overdueBy}`,
    targetMember,
    {
      data: { taskId, overdueBy },
      priority: "urgent",
      link: `/tasks/${taskId}`,
      targetHousehold: householdId,
      icon: "alert",
    }
  )
}

/**
 * Create mention notification
 */
export function createMentionNotification(
  targetMember: string,
  mentionerName: string,
  context: string,
  link: string,
  householdId: string
): Notification {
  return createNotification(
    "mention",
    `${mentionerName} mentioned you`,
    context,
    targetMember,
    {
      data: { mentionerName },
      priority: "normal",
      link,
      targetHousehold: householdId,
    }
  )
}

/**
 * Create achievement notification
 */
export function createAchievementNotification(
  targetMember: string,
  achievementName: string,
  description: string,
  icon?: string
): Notification {
  return createNotification(
    "achievement",
    "Achievement Unlocked!",
    `You earned: ${achievementName}`,
    targetMember,
    {
      data: { achievementName, description },
      priority: "normal",
      icon: icon ?? "trophy",
    }
  )
}

// =============================================================================
// DELIVERY TRACKING
// =============================================================================

/**
 * Create delivery record
 */
export function createDeliveryRecord(
  notificationId: string,
  channel: NotificationChannel
): NotificationDelivery {
  return {
    notificationId,
    channel,
    status: "pending",
    retryCount: 0,
  }
}

/**
 * Mark as sent
 */
export function markAsSent(delivery: NotificationDelivery): NotificationDelivery {
  return {
    ...delivery,
    status: "sent",
    sentAt: new Date(),
  }
}

/**
 * Mark as delivered
 */
export function markAsDelivered(delivery: NotificationDelivery): NotificationDelivery {
  return {
    ...delivery,
    status: "delivered",
    deliveredAt: new Date(),
  }
}

/**
 * Mark as read
 */
export function markAsRead(delivery: NotificationDelivery): NotificationDelivery {
  return {
    ...delivery,
    status: "read",
    readAt: new Date(),
  }
}

/**
 * Mark as failed
 */
export function markAsFailed(
  delivery: NotificationDelivery,
  reason: string
): NotificationDelivery {
  return {
    ...delivery,
    status: "failed",
    failureReason: reason,
  }
}

/**
 * Increment retry count
 */
export function incrementRetryCount(delivery: NotificationDelivery): NotificationDelivery {
  return {
    ...delivery,
    retryCount: delivery.retryCount + 1,
  }
}

// =============================================================================
// PREFERENCES MANAGEMENT
// =============================================================================

/**
 * Create default preferences
 */
export function createDefaultPreferences(memberId: string): NotificationPreferences {
  return {
    memberId,
    enabled: true,
    channels: {
      push: true,
      email: true,
      sms: false,
      inApp: true,
    },
    types: {
      task_assigned: { enabled: true, channels: ["push", "in_app"] },
      task_completed: { enabled: true, channels: ["in_app"] },
      task_reminder: { enabled: true, channels: ["push", "in_app"] },
      task_overdue: { enabled: true, channels: ["push", "email", "in_app"] },
      member_joined: { enabled: true, channels: ["in_app"] },
      member_left: { enabled: true, channels: ["in_app"] },
      mention: { enabled: true, channels: ["push", "in_app"] },
      comment: { enabled: true, channels: ["in_app"] },
      achievement: { enabled: true, channels: ["push", "in_app"] },
      system: { enabled: true, channels: ["in_app"] },
      custom: { enabled: true, channels: ["in_app"] },
    },
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
      exceptions: ["task_overdue"], // Urgent notifications bypass quiet hours
    },
    frequency: {
      maxPerHour: 20,
      maxPerDay: 100,
      groupingWindow: 300, // 5 minutes
    },
  }
}

/**
 * Update channel preferences
 */
export function updateChannelPreferences(
  prefs: NotificationPreferences,
  channel: NotificationChannel,
  enabled: boolean
): NotificationPreferences {
  const channelKey = channel === "in_app" ? "inApp" : channel
  return {
    ...prefs,
    channels: {
      ...prefs.channels,
      [channelKey]: enabled,
    },
  }
}

/**
 * Update type preferences
 */
export function updateTypePreferences(
  prefs: NotificationPreferences,
  type: NotificationType,
  settings: Partial<TypePreferences[string]>
): NotificationPreferences {
  const existing = prefs.types[type] ?? { enabled: true, channels: ["in_app"] }
  return {
    ...prefs,
    types: {
      ...prefs.types,
      [type]: {
        enabled: existing.enabled,
        channels: existing.channels,
        priority: existing.priority,
        ...settings,
      },
    },
  }
}

/**
 * Check if notification type is enabled
 */
export function isTypeEnabled(
  prefs: NotificationPreferences,
  type: NotificationType
): boolean {
  if (!prefs.enabled) return false
  return prefs.types[type]?.enabled ?? true
}

/**
 * Get enabled channels for notification type
 */
export function getEnabledChannels(
  prefs: NotificationPreferences,
  type: NotificationType
): NotificationChannel[] {
  if (!prefs.enabled) return []

  const typeSettings = prefs.types[type]
  if (!typeSettings?.enabled) return []

  return typeSettings.channels.filter(channel => {
    const channelKey = channel === "in_app" ? "inApp" : channel
    return prefs.channels[channelKey as keyof ChannelPreferences]
  })
}

/**
 * Check if in quiet hours
 */
export function isInQuietHours(prefs: NotificationPreferences, now: Date = new Date()): boolean {
  if (!prefs.quietHours.enabled) return false

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes

  const [startHours, startMinutes] = prefs.quietHours.start.split(":").map(Number)
  const [endHours, endMinutes] = prefs.quietHours.end.split(":").map(Number)

  const startTime = (startHours ?? 0) * 60 + (startMinutes ?? 0)
  const endTime = (endHours ?? 0) * 60 + (endMinutes ?? 0)

  if (startTime < endTime) {
    // Normal range (e.g., 22:00 to 08:00 next day = false for this branch)
    return currentTime >= startTime && currentTime < endTime
  } else {
    // Overnight range (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime < endTime
  }
}

/**
 * Should send notification
 */
export function shouldSendNotification(
  notification: Notification,
  prefs: NotificationPreferences
): boolean {
  // Check if enabled
  if (!prefs.enabled) return false

  // Check type preference
  if (!isTypeEnabled(prefs, notification.type)) return false

  // Check quiet hours (unless exception)
  if (
    isInQuietHours(prefs) &&
    !prefs.quietHours.exceptions.includes(notification.type)
  ) {
    return false
  }

  return true
}

// =============================================================================
// QUEUE MANAGEMENT
// =============================================================================

/**
 * Create notification queue
 */
export function createNotificationQueue(
  maxConcurrent: number = 10,
  rateLimitPerSecond: number = 50
): NotificationQueue {
  return {
    pending: [],
    processing: [],
    maxConcurrent,
    rateLimitPerSecond,
  }
}

/**
 * Add to queue
 */
export function addToQueue(
  queue: NotificationQueue,
  notification: Notification
): NotificationQueue {
  const priorityScore = getPriorityScore(notification.priority)

  const queued: QueuedNotification = {
    notification,
    addedAt: new Date(),
    attempts: 0,
    priority: priorityScore,
  }

  // Insert in priority order
  const newPending = [...queue.pending]
  const insertIndex = newPending.findIndex(q => q.priority < priorityScore)

  if (insertIndex === -1) {
    newPending.push(queued)
  } else {
    newPending.splice(insertIndex, 0, queued)
  }

  return {
    ...queue,
    pending: newPending,
  }
}

/**
 * Get priority score
 */
function getPriorityScore(priority: NotificationPriority): number {
  const scores: Record<NotificationPriority, number> = {
    urgent: 10,
    high: 7,
    normal: 5,
    low: 2,
  }
  return scores[priority]
}

/**
 * Get next from queue
 */
export function getNextFromQueue(
  queue: NotificationQueue
): { notification: Notification | null; queue: NotificationQueue } {
  if (queue.pending.length === 0) {
    return { notification: null, queue }
  }

  if (queue.processing.length >= queue.maxConcurrent) {
    return { notification: null, queue }
  }

  const [next, ...rest] = queue.pending

  return {
    notification: next!.notification,
    queue: {
      ...queue,
      pending: rest,
      processing: [...queue.processing, next!.notification.id],
    },
  }
}

/**
 * Mark processing complete
 */
export function markProcessingComplete(
  queue: NotificationQueue,
  notificationId: string
): NotificationQueue {
  return {
    ...queue,
    processing: queue.processing.filter(id => id !== notificationId),
  }
}

/**
 * Requeue failed notification
 */
export function requeueFailed(
  queue: NotificationQueue,
  notification: Notification,
  delay: number = 5000
): NotificationQueue {
  const existingIndex = queue.pending.findIndex(
    q => q.notification.id === notification.id
  )

  const newPending = existingIndex >= 0
    ? queue.pending
    : [
        ...queue.pending,
        {
          notification,
          addedAt: new Date(),
          attempts: 1,
          nextAttempt: new Date(Date.now() + delay),
          priority: getPriorityScore(notification.priority) - 1, // Lower priority on retry
        },
      ]

  return {
    ...queue,
    pending: newPending,
    processing: queue.processing.filter(id => id !== notification.id),
  }
}

// =============================================================================
// GROUPING
// =============================================================================

/**
 * Create notification group
 */
export function createNotificationGroup(
  type: NotificationType,
  notification: Notification
): NotificationGroup {
  return {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    notifications: [notification.id],
    summary: notification.title,
    count: 1,
    lastUpdated: new Date(),
  }
}

/**
 * Add to group
 */
export function addToGroup(
  group: NotificationGroup,
  notification: Notification
): NotificationGroup {
  return {
    ...group,
    notifications: [...group.notifications, notification.id],
    count: group.count + 1,
    summary: `${group.count + 1} ${group.type.replace("_", " ")} notifications`,
    lastUpdated: new Date(),
  }
}

/**
 * Should group notifications
 */
export function shouldGroup(
  existing: NotificationGroup,
  notification: Notification,
  windowSeconds: number
): boolean {
  if (existing.type !== notification.type) return false

  const elapsed = Date.now() - existing.lastUpdated.getTime()
  return elapsed < windowSeconds * 1000
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Create notification stats
 */
export function createNotificationStats(): NotificationStats {
  return {
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    byType: {
      task_assigned: 0,
      task_completed: 0,
      task_reminder: 0,
      task_overdue: 0,
      member_joined: 0,
      member_left: 0,
      mention: 0,
      comment: 0,
      achievement: 0,
      system: 0,
      custom: 0,
    },
    byChannel: {
      push: 0,
      email: 0,
      sms: 0,
      in_app: 0,
      websocket: 0,
    },
    avgDeliveryTime: 0,
  }
}

/**
 * Record notification sent
 */
export function recordSent(
  stats: NotificationStats,
  notification: Notification,
  channel: NotificationChannel
): NotificationStats {
  return {
    ...stats,
    sent: stats.sent + 1,
    byType: {
      ...stats.byType,
      [notification.type]: stats.byType[notification.type] + 1,
    },
    byChannel: {
      ...stats.byChannel,
      [channel]: stats.byChannel[channel] + 1,
    },
  }
}

/**
 * Record notification delivered
 */
export function recordDelivered(
  stats: NotificationStats,
  deliveryTimeMs: number
): NotificationStats {
  const newAvg = stats.delivered > 0
    ? (stats.avgDeliveryTime * stats.delivered + deliveryTimeMs) / (stats.delivered + 1)
    : deliveryTimeMs

  return {
    ...stats,
    delivered: stats.delivered + 1,
    avgDeliveryTime: Math.round(newAvg),
  }
}

/**
 * Record notification read
 */
export function recordRead(stats: NotificationStats): NotificationStats {
  return {
    ...stats,
    read: stats.read + 1,
  }
}

/**
 * Record notification failed
 */
export function recordFailed(stats: NotificationStats): NotificationStats {
  return {
    ...stats,
    failed: stats.failed + 1,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if notification is expired
 */
export function isExpired(notification: Notification): boolean {
  if (!notification.expiresAt) return false
  return new Date() > notification.expiresAt
}

/**
 * Check if notification is scheduled for future
 */
export function isScheduledForFuture(notification: Notification): boolean {
  if (!notification.scheduledFor) return false
  return notification.scheduledFor > new Date()
}

/**
 * Get notification age in milliseconds
 */
export function getAge(notification: Notification): number {
  return Date.now() - notification.createdAt.getTime()
}

/**
 * Format notification for display
 */
export function formatNotificationForDisplay(notification: Notification): {
  title: string
  body: string
  time: string
} {
  const age = getAge(notification)
  let time: string

  if (age < 60000) {
    time = "Just now"
  } else if (age < 3600000) {
    time = `${Math.floor(age / 60000)}m ago`
  } else if (age < 86400000) {
    time = `${Math.floor(age / 3600000)}h ago`
  } else {
    time = `${Math.floor(age / 86400000)}d ago`
  }

  return {
    title: notification.title,
    body: notification.body,
    time,
  }
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    low: "#6b7280",
    normal: "#3b82f6",
    high: "#f97316",
    urgent: "#ef4444",
  }
  return colors[priority]
}
