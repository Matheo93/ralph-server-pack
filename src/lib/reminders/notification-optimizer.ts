/**
 * Notification Optimizer - Smart notification delivery optimization
 * Functional, immutable approach to notification timing and batching
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const EngagementMetricSchema = z.object({
  userId: z.string(),
  hourOfDay: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday
  openRate: z.number().min(0).max(1),
  responseRate: z.number().min(0).max(1),
  averageResponseTimeMinutes: z.number(),
  sampleSize: z.number(),
})
export type EngagementMetric = z.infer<typeof EngagementMetricSchema>

export const UserActivitySchema = z.object({
  userId: z.string(),
  lastActiveAt: z.date(),
  activeHours: z.array(z.number().min(0).max(23)), // Most active hours
  activeDays: z.array(z.number().min(0).max(6)), // Most active days
  averageSessionMinutes: z.number(),
  preferredChannels: z.array(z.enum(["push", "email", "sms", "in_app"])),
  deviceTypes: z.array(z.enum(["mobile", "desktop", "tablet"])),
})
export type UserActivity = z.infer<typeof UserActivitySchema>

export const DeliveryWindowSchema = z.object({
  start: z.number().min(0).max(23),
  end: z.number().min(0).max(23),
  weight: z.number().min(0).max(1), // Preference weight
})
export type DeliveryWindow = z.infer<typeof DeliveryWindowSchema>

export const OptimizationConfigSchema = z.object({
  // Delivery windows
  defaultDeliveryWindow: DeliveryWindowSchema,
  preferredDeliveryWindows: z.array(DeliveryWindowSchema),

  // Batching
  batchWindowMinutes: z.number().default(15),
  maxBatchSize: z.number().default(5),
  minBatchIntervalMinutes: z.number().default(60),

  // Rate limiting
  maxNotificationsPerHour: z.number().default(3),
  maxNotificationsPerDay: z.number().default(10),

  // Engagement thresholds
  minOpenRateForChannel: z.number().default(0.1),
  minResponseRateForTimeslot: z.number().default(0.05),

  // Cooling periods
  postInteractionCooldownMinutes: z.number().default(30),
  failedDeliveryCooldownMinutes: z.number().default(120),
})
export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  channel: z.enum(["push", "email", "sms", "in_app"]),
  content: z.object({
    title: z.string(),
    body: z.string(),
    metadata: z.record(z.string(), z.string()),
  }),
  scheduledAt: z.date(),
  originalScheduledAt: z.date(),
  batchId: z.string().nullable(),
  optimizationApplied: z.boolean(),
})
export type Notification = z.infer<typeof NotificationSchema>

export const OptimizationResultSchema = z.object({
  notification: NotificationSchema,
  originalTime: z.date(),
  optimizedTime: z.date(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
})
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_CONFIG: OptimizationConfig = {
  defaultDeliveryWindow: {
    start: 8,
    end: 21,
    weight: 0.5,
  },
  preferredDeliveryWindows: [
    { start: 9, end: 12, weight: 0.9 }, // Morning
    { start: 14, end: 16, weight: 0.7 }, // Afternoon
    { start: 18, end: 20, weight: 0.8 }, // Evening
  ],
  batchWindowMinutes: 15,
  maxBatchSize: 5,
  minBatchIntervalMinutes: 60,
  maxNotificationsPerHour: 3,
  maxNotificationsPerDay: 10,
  minOpenRateForChannel: 0.1,
  minResponseRateForTimeslot: 0.05,
  postInteractionCooldownMinutes: 30,
  failedDeliveryCooldownMinutes: 120,
}

// =============================================================================
// TIME OPTIMIZATION
// =============================================================================

/**
 * Check if time is within delivery window
 */
export function isWithinDeliveryWindow(
  time: Date,
  window: DeliveryWindow
): boolean {
  const hour = time.getHours()

  // Handle overnight windows (e.g., 22 to 6)
  if (window.start > window.end) {
    return hour >= window.start || hour < window.end
  }

  return hour >= window.start && hour < window.end
}

/**
 * Get best delivery window weight for a time
 */
export function getWindowWeight(
  time: Date,
  config: OptimizationConfig
): number {
  for (const window of config.preferredDeliveryWindows) {
    if (isWithinDeliveryWindow(time, window)) {
      return window.weight
    }
  }

  if (isWithinDeliveryWindow(time, config.defaultDeliveryWindow)) {
    return config.defaultDeliveryWindow.weight
  }

  return 0 // Outside all windows
}

/**
 * Find next time within a delivery window
 */
export function getNextWindowTime(
  from: Date,
  config: OptimizationConfig
): Date {
  const result = new Date(from)

  // Check preferred windows first (sorted by weight)
  const sortedWindows = [...config.preferredDeliveryWindows]
    .sort((a, b) => b.weight - a.weight)

  for (const window of sortedWindows) {
    const windowStart = new Date(result)
    windowStart.setHours(window.start, 0, 0, 0)

    // If window start is in the future today
    if (windowStart.getTime() > from.getTime()) {
      return windowStart
    }
  }

  // Check default window
  const defaultStart = new Date(result)
  defaultStart.setHours(config.defaultDeliveryWindow.start, 0, 0, 0)

  if (defaultStart.getTime() > from.getTime()) {
    return defaultStart
  }

  // Next day, first preferred window
  const nextDay = new Date(result)
  nextDay.setDate(nextDay.getDate() + 1)

  const firstWindow = sortedWindows[0] ?? config.defaultDeliveryWindow
  nextDay.setHours(firstWindow.start, 0, 0, 0)

  return nextDay
}

// =============================================================================
// ENGAGEMENT-BASED OPTIMIZATION
// =============================================================================

/**
 * Calculate engagement score for a time slot
 */
export function calculateEngagementScore(
  time: Date,
  metrics: EngagementMetric[]
): number {
  const hour = time.getHours()
  const day = time.getDay()

  // Find matching metrics
  const matching = metrics.filter(
    (m) => m.hourOfDay === hour && m.dayOfWeek === day
  )

  if (matching.length === 0) {
    return 0.5 // Default score when no data
  }

  // Weighted average by sample size
  let totalWeight = 0
  let weightedSum = 0

  for (const metric of matching) {
    const score = (metric.openRate + metric.responseRate) / 2
    weightedSum += score * metric.sampleSize
    totalWeight += metric.sampleSize
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0.5
}

/**
 * Find best time slot based on engagement
 */
export function findBestTimeSlot(
  from: Date,
  to: Date,
  metrics: EngagementMetric[],
  config: OptimizationConfig
): { time: Date; score: number } {
  let bestTime = from
  let bestScore = -1

  const current = new Date(from)

  while (current.getTime() <= to.getTime()) {
    // Only consider times within delivery windows
    const windowWeight = getWindowWeight(current, config)
    if (windowWeight > 0) {
      const engagementScore = calculateEngagementScore(current, metrics)
      const combinedScore = engagementScore * windowWeight

      if (combinedScore > bestScore) {
        bestScore = combinedScore
        bestTime = new Date(current)
      }
    }

    // Move to next hour
    current.setHours(current.getHours() + 1)
  }

  return { time: bestTime, score: bestScore }
}

// =============================================================================
// USER ACTIVITY OPTIMIZATION
// =============================================================================

/**
 * Check if user is likely active at time
 */
export function isUserLikelyActive(
  time: Date,
  activity: UserActivity
): boolean {
  const hour = time.getHours()
  const day = time.getDay()

  const isActiveHour = activity.activeHours.includes(hour)
  const isActiveDay = activity.activeDays.includes(day)

  return isActiveHour && isActiveDay
}

/**
 * Get optimal send time for user
 */
export function getOptimalTimeForUser(
  proposedTime: Date,
  activity: UserActivity,
  metrics: EngagementMetric[],
  config: OptimizationConfig
): { time: Date; confidence: number; reason: string } {
  // Check if proposed time is optimal
  const proposedWindowWeight = getWindowWeight(proposedTime, config)
  const proposedEngagement = calculateEngagementScore(proposedTime, metrics)
  const proposedUserActive = isUserLikelyActive(proposedTime, activity)

  if (proposedWindowWeight > 0.7 && proposedEngagement > 0.6 && proposedUserActive) {
    return {
      time: proposedTime,
      confidence: 0.9,
      reason: "Heure proposée optimale",
    }
  }

  // Find better time within next 24 hours
  const searchEnd = new Date(proposedTime.getTime() + 24 * 60 * 60 * 1000)
  const { time: bestTime, score: bestScore } = findBestTimeSlot(
    proposedTime,
    searchEnd,
    metrics,
    config
  )

  // Check if user is likely active at best time
  const userActive = isUserLikelyActive(bestTime, activity)
  const confidence = bestScore * (userActive ? 1 : 0.7)

  let reason = "Optimisé selon l'engagement"
  if (!proposedUserActive && userActive) {
    reason = "Décalé vers les heures d'activité"
  } else if (proposedWindowWeight < 0.3) {
    reason = "Déplacé dans la fenêtre de livraison"
  }

  return { time: bestTime, confidence, reason }
}

// =============================================================================
// BATCHING
// =============================================================================

export interface NotificationBatch {
  id: string
  userId: string
  notifications: Notification[]
  scheduledAt: Date
  priority: Notification["priority"]
}

/**
 * Group notifications into batches
 */
export function createBatches(
  notifications: Notification[],
  config: OptimizationConfig
): NotificationBatch[] {
  const batches: NotificationBatch[] = []
  const byUser = new Map<string, Notification[]>()

  // Group by user
  for (const notif of notifications) {
    const existing = byUser.get(notif.userId) ?? []
    existing.push(notif)
    byUser.set(notif.userId, existing)
  }

  // Create batches per user
  for (const [userId, userNotifs] of byUser) {
    // Sort by scheduled time
    const sorted = [...userNotifs].sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
    )

    let currentBatch: Notification[] = []
    let batchStart: Date | null = null

    for (const notif of sorted) {
      // Urgent notifications don't batch
      if (notif.priority === "urgent") {
        if (currentBatch.length > 0) {
          batches.push(createBatchFromNotifications(currentBatch, batchStart!))
          currentBatch = []
          batchStart = null
        }
        batches.push(createBatchFromNotifications([notif], notif.scheduledAt))
        continue
      }

      if (batchStart === null) {
        batchStart = notif.scheduledAt
        currentBatch = [notif]
        continue
      }

      const timeDiff = notif.scheduledAt.getTime() - batchStart.getTime()
      const withinWindow = timeDiff <= config.batchWindowMinutes * 60 * 1000

      if (withinWindow && currentBatch.length < config.maxBatchSize) {
        currentBatch.push(notif)
      } else {
        // Start new batch
        batches.push(createBatchFromNotifications(currentBatch, batchStart))
        currentBatch = [notif]
        batchStart = notif.scheduledAt
      }
    }

    // Don't forget last batch
    if (currentBatch.length > 0 && batchStart) {
      batches.push(createBatchFromNotifications(currentBatch, batchStart))
    }
  }

  return batches
}

function createBatchFromNotifications(
  notifications: Notification[],
  scheduledAt: Date
): NotificationBatch {
  const highestPriority = notifications.reduce<Notification["priority"]>(
    (highest, notif) => {
      const order = { low: 0, medium: 1, high: 2, urgent: 3 }
      return order[notif.priority] > order[highest] ? notif.priority : highest
    },
    "low"
  )

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // Update notifications with batch ID
  const updatedNotifs = notifications.map((n) => ({
    ...n,
    batchId,
    scheduledAt, // All in batch share same time
  }))

  return {
    id: batchId,
    userId: notifications[0]!.userId,
    notifications: updatedNotifs,
    scheduledAt,
    priority: highestPriority,
  }
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export interface RateLimitState {
  userId: string
  hourlyCount: number
  dailyCount: number
  lastSentAt: Date | null
  lastInteractionAt: Date | null
  lastFailedAt: Date | null
}

/**
 * Create initial rate limit state
 */
export function createRateLimitState(userId: string): RateLimitState {
  return {
    userId,
    hourlyCount: 0,
    dailyCount: 0,
    lastSentAt: null,
    lastInteractionAt: null,
    lastFailedAt: null,
  }
}

/**
 * Check if notification can be sent
 */
export function canSendNotification(
  state: RateLimitState,
  config: OptimizationConfig,
  now: Date = new Date()
): { allowed: boolean; reason?: string; nextAllowed?: Date } {
  // Check hourly limit
  if (state.hourlyCount >= config.maxNotificationsPerHour) {
    const nextHour = new Date(now)
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    return {
      allowed: false,
      reason: "Limite horaire atteinte",
      nextAllowed: nextHour,
    }
  }

  // Check daily limit
  if (state.dailyCount >= config.maxNotificationsPerDay) {
    const nextDay = new Date(now)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(config.defaultDeliveryWindow.start, 0, 0, 0)
    return {
      allowed: false,
      reason: "Limite quotidienne atteinte",
      nextAllowed: nextDay,
    }
  }

  // Check post-interaction cooldown
  if (state.lastInteractionAt) {
    const cooldownEnd = new Date(
      state.lastInteractionAt.getTime() + config.postInteractionCooldownMinutes * 60 * 1000
    )
    if (now.getTime() < cooldownEnd.getTime()) {
      return {
        allowed: false,
        reason: "En période de cooldown post-interaction",
        nextAllowed: cooldownEnd,
      }
    }
  }

  // Check failed delivery cooldown
  if (state.lastFailedAt) {
    const cooldownEnd = new Date(
      state.lastFailedAt.getTime() + config.failedDeliveryCooldownMinutes * 60 * 1000
    )
    if (now.getTime() < cooldownEnd.getTime()) {
      return {
        allowed: false,
        reason: "En période de cooldown après échec",
        nextAllowed: cooldownEnd,
      }
    }
  }

  return { allowed: true }
}

/**
 * Update rate limit state after sending
 */
export function recordNotificationSent(
  state: RateLimitState,
  now: Date = new Date()
): RateLimitState {
  return {
    ...state,
    hourlyCount: state.hourlyCount + 1,
    dailyCount: state.dailyCount + 1,
    lastSentAt: now,
  }
}

/**
 * Update rate limit state after user interaction
 */
export function recordUserInteraction(
  state: RateLimitState,
  now: Date = new Date()
): RateLimitState {
  return {
    ...state,
    lastInteractionAt: now,
  }
}

/**
 * Update rate limit state after failed delivery
 */
export function recordFailedDelivery(
  state: RateLimitState,
  now: Date = new Date()
): RateLimitState {
  return {
    ...state,
    lastFailedAt: now,
  }
}

/**
 * Reset hourly counts
 */
export function resetHourlyCount(state: RateLimitState): RateLimitState {
  return {
    ...state,
    hourlyCount: 0,
  }
}

/**
 * Reset daily counts
 */
export function resetDailyCount(state: RateLimitState): RateLimitState {
  return {
    ...state,
    hourlyCount: 0,
    dailyCount: 0,
  }
}

// =============================================================================
// CHANNEL OPTIMIZATION
// =============================================================================

/**
 * Select best channel for notification
 */
export function selectBestChannel(
  channels: Notification["channel"][],
  activity: UserActivity,
  metrics: EngagementMetric[],
  config: OptimizationConfig
): { channel: Notification["channel"]; confidence: number } {
  // Filter by user's preferred channels
  const available = channels.filter(
    (c) => activity.preferredChannels.includes(c)
  )

  if (available.length === 0) {
    return { channel: channels[0] ?? "push", confidence: 0.3 }
  }

  // Calculate engagement score per channel
  const channelScores = available.map((channel) => {
    const channelMetrics = metrics.filter(
      (m) => m.userId === activity.userId // Filter by user
    )

    const avgOpenRate = channelMetrics.length > 0
      ? channelMetrics.reduce((sum, m) => sum + m.openRate, 0) / channelMetrics.length
      : 0.5

    // Check minimum threshold
    if (avgOpenRate < config.minOpenRateForChannel) {
      return { channel, score: 0 }
    }

    return { channel, score: avgOpenRate }
  })

  // Sort by score and return best
  const sorted = channelScores.sort((a, b) => b.score - a.score)
  const best = sorted[0]!

  return {
    channel: best.channel,
    confidence: best.score,
  }
}

// =============================================================================
// FULL OPTIMIZATION
// =============================================================================

/**
 * Optimize a single notification
 */
export function optimizeNotification(
  notification: Notification,
  activity: UserActivity,
  metrics: EngagementMetric[],
  rateLimitState: RateLimitState,
  config: OptimizationConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): OptimizationResult {
  // Check rate limits first
  const rateLimitCheck = canSendNotification(rateLimitState, config, now)

  if (!rateLimitCheck.allowed && rateLimitCheck.nextAllowed) {
    return {
      notification: {
        ...notification,
        scheduledAt: rateLimitCheck.nextAllowed,
        optimizationApplied: true,
      },
      originalTime: notification.scheduledAt,
      optimizedTime: rateLimitCheck.nextAllowed,
      reason: rateLimitCheck.reason ?? "Limite atteinte",
      confidence: 0.5,
    }
  }

  // For urgent notifications, only apply rate limiting
  if (notification.priority === "urgent") {
    return {
      notification: {
        ...notification,
        optimizationApplied: false,
      },
      originalTime: notification.scheduledAt,
      optimizedTime: notification.scheduledAt,
      reason: "Notification urgente - pas d'optimisation",
      confidence: 1.0,
    }
  }

  // Find optimal time
  const { time: optimalTime, confidence, reason } = getOptimalTimeForUser(
    notification.scheduledAt,
    activity,
    metrics,
    config
  )

  // Select best channel
  const channelResult = selectBestChannel(
    [notification.channel],
    activity,
    metrics,
    config
  )

  return {
    notification: {
      ...notification,
      scheduledAt: optimalTime,
      channel: channelResult.channel,
      optimizationApplied: true,
    },
    originalTime: notification.scheduledAt,
    optimizedTime: optimalTime,
    reason,
    confidence: (confidence + channelResult.confidence) / 2,
  }
}

/**
 * Optimize batch of notifications
 */
export function optimizeBatch(
  notifications: Notification[],
  activityMap: Map<string, UserActivity>,
  metricsMap: Map<string, EngagementMetric[]>,
  rateLimitMap: Map<string, RateLimitState>,
  config: OptimizationConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): {
  results: OptimizationResult[]
  batches: NotificationBatch[]
} {
  const results: OptimizationResult[] = []

  // Optimize each notification
  for (const notif of notifications) {
    const activity = activityMap.get(notif.userId) ?? {
      userId: notif.userId,
      lastActiveAt: now,
      activeHours: [9, 10, 11, 14, 15, 18, 19],
      activeDays: [1, 2, 3, 4, 5],
      averageSessionMinutes: 15,
      preferredChannels: ["push", "in_app"],
      deviceTypes: ["mobile"],
    }

    const metrics = metricsMap.get(notif.userId) ?? []
    const rateLimit = rateLimitMap.get(notif.userId) ?? createRateLimitState(notif.userId)

    const result = optimizeNotification(
      notif,
      activity,
      metrics,
      rateLimit,
      config,
      now
    )

    results.push(result)
  }

  // Create batches from optimized notifications
  const optimizedNotifs = results.map((r) => r.notification)
  const batches = createBatches(optimizedNotifs, config)

  return { results, batches }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const notificationOptimizer = {
  // Config
  DEFAULT_CONFIG,

  // Time optimization
  isWithinDeliveryWindow,
  getWindowWeight,
  getNextWindowTime,

  // Engagement
  calculateEngagementScore,
  findBestTimeSlot,

  // User activity
  isUserLikelyActive,
  getOptimalTimeForUser,

  // Batching
  createBatches,

  // Rate limiting
  createRateLimitState,
  canSendNotification,
  recordNotificationSent,
  recordUserInteraction,
  recordFailedDelivery,
  resetHourlyCount,
  resetDailyCount,

  // Channel
  selectBestChannel,

  // Full optimization
  optimizeNotification,
  optimizeBatch,
}
