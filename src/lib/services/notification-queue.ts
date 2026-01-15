/**
 * Notification Queue Service
 *
 * Provides queuing and retry mechanism for push notifications.
 * Handles failed notifications with exponential backoff.
 */

import { query, queryOne, insert } from "@/lib/aws/database"
import { sendMultiplePush, isFirebaseConfigured } from "@/lib/firebase"
import type { NotificationPayload, DataPayload } from "@/lib/firebase/messaging"

// =============================================================================
// TYPES
// =============================================================================

export interface QueuedNotification {
  id: string
  userId: string
  householdId: string | null
  type: string
  title: string
  body: string
  data: DataPayload | null
  tokens: string[]
  retryCount: number
  maxRetries: number
  nextRetryAt: Date | null
  status: "pending" | "sent" | "failed" | "expired"
  createdAt: Date
  sentAt: Date | null
  errorMessage: string | null
}

export interface QueueOptions {
  maxRetries?: number
  priority?: "high" | "normal" | "low"
  expiresAt?: Date
  aggregationKey?: string
}

interface NotificationResult {
  success: boolean
  sent: number
  failed: number
  invalidTokens: string[]
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_RETRIES = 3
const RETRY_DELAYS_MS = [
  1 * 60 * 1000,      // 1 minute
  5 * 60 * 1000,      // 5 minutes
  30 * 60 * 1000,     // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
]

// =============================================================================
// QUEUE NOTIFICATION
// =============================================================================

/**
 * Add a notification to the queue for delivery
 */
export async function queueNotification(
  userId: string,
  notification: NotificationPayload,
  data?: DataPayload,
  options: QueueOptions = {}
): Promise<string | null> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    priority = "normal",
    expiresAt,
    aggregationKey,
  } = options

  // Get user's device tokens
  const tokens = await getUserEnabledTokens(userId)

  if (tokens.length === 0) {
    // No tokens to send to
    return null
  }

  // Check for duplicate if aggregation key provided
  if (aggregationKey) {
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM notification_queue
      WHERE aggregation_key = $1 AND status = 'pending'
    `, [aggregationKey])

    if (existing) {
      return existing.id
    }
  }

  const result = await insert<{ id: string }>("notification_queue", {
    user_id: userId,
    type: data?.["type"] ?? "general",
    title: notification.title,
    body: notification.body,
    data: data ? JSON.stringify(data) : null,
    tokens: JSON.stringify(tokens),
    retry_count: 0,
    max_retries: maxRetries,
    next_retry_at: new Date().toISOString(),
    status: "pending",
    priority,
    expires_at: expiresAt?.toISOString() ?? null,
    aggregation_key: aggregationKey ?? null,
    created_at: new Date().toISOString(),
  })

  return result?.id ?? null
}

/**
 * Add a notification to the queue for a household (all members)
 */
export async function queueHouseholdNotification(
  householdId: string,
  notification: NotificationPayload,
  data?: DataPayload,
  options: QueueOptions = {}
): Promise<string[]> {
  // Get all household member IDs
  const members = await query<{ user_id: string }>(`
    SELECT user_id FROM household_members
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  const queuedIds: string[] = []

  for (const member of members) {
    const id = await queueNotification(member.user_id, notification, data, {
      ...options,
      aggregationKey: options.aggregationKey
        ? `${options.aggregationKey}_${member.user_id}`
        : undefined,
    })
    if (id) {
      queuedIds.push(id)
    }
  }

  return queuedIds
}

// =============================================================================
// PROCESS QUEUE
// =============================================================================

/**
 * Process pending notifications in the queue
 * Should be called periodically by a cron job
 */
export async function processNotificationQueue(): Promise<{
  processed: number
  sent: number
  failed: number
  retrying: number
  expired: number
}> {
  if (!isFirebaseConfigured()) {
    return { processed: 0, sent: 0, failed: 0, retrying: 0, expired: 0 }
  }

  let processed = 0
  let sent = 0
  let failed = 0
  let retrying = 0
  let expired = 0

  // Get pending notifications ready for delivery
  const pending = await query<{
    id: string
    user_id: string
    type: string
    title: string
    body: string
    data: string | null
    tokens: string
    retry_count: number
    max_retries: number
    expires_at: string | null
  }>(`
    SELECT id, user_id, type, title, body, data, tokens,
           retry_count, max_retries, expires_at::text
    FROM notification_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      created_at ASC
    LIMIT 100
  `)

  for (const notif of pending) {
    processed++

    // Check if expired
    if (notif.expires_at && new Date(notif.expires_at) < new Date()) {
      await markNotificationExpired(notif.id)
      expired++
      continue
    }

    const tokens = JSON.parse(notif.tokens) as string[]
    const data = notif.data ? (JSON.parse(notif.data) as DataPayload) : undefined

    // Attempt to send
    const result = await sendNotificationWithRetry(
      notif.id,
      tokens,
      { title: notif.title, body: notif.body },
      data,
      notif.retry_count,
      notif.max_retries
    )

    if (result.success) {
      sent++
    } else if (result.retrying) {
      retrying++
    } else {
      failed++
    }
  }

  return { processed, sent, failed, retrying, expired }
}

// =============================================================================
// SEND WITH RETRY
// =============================================================================

async function sendNotificationWithRetry(
  notificationId: string,
  tokens: string[],
  notification: NotificationPayload,
  data?: DataPayload,
  retryCount: number = 0,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<{ success: boolean; retrying: boolean }> {
  try {
    const result = await sendMultiplePush(tokens, notification, data)

    // Remove invalid tokens from future deliveries
    if (result.invalidTokens.length > 0) {
      await cleanupInvalidTokens(result.invalidTokens)
      // Update the notification's token list
      const validTokens = tokens.filter((t) => !result.invalidTokens.includes(t))
      await query(`
        UPDATE notification_queue
        SET tokens = $1
        WHERE id = $2
      `, [JSON.stringify(validTokens), notificationId])
    }

    if (result.successCount > 0) {
      // At least some deliveries succeeded
      await markNotificationSent(notificationId)
      return { success: true, retrying: false }
    }

    // All deliveries failed
    if (retryCount >= maxRetries) {
      await markNotificationFailed(notificationId, "Max retries exceeded")
      return { success: false, retrying: false }
    }

    // Schedule retry with exponential backoff
    await scheduleRetry(notificationId, retryCount + 1)
    return { success: false, retrying: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (retryCount >= maxRetries) {
      await markNotificationFailed(notificationId, errorMessage)
      return { success: false, retrying: false }
    }

    await scheduleRetry(notificationId, retryCount + 1, errorMessage)
    return { success: false, retrying: true }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUserEnabledTokens(userId: string): Promise<string[]> {
  const tokens = await query<{ token: string }>(`
    SELECT token FROM device_tokens
    WHERE user_id = $1 AND enabled = true
    ORDER BY last_used DESC
  `, [userId])

  return tokens.map((t) => t.token)
}

async function cleanupInvalidTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return

  const placeholders = tokens.map((_, i) => `$${i + 1}`).join(", ")
  await query(`
    DELETE FROM device_tokens
    WHERE token IN (${placeholders})
  `, tokens)
}

async function markNotificationSent(id: string): Promise<void> {
  await query(`
    UPDATE notification_queue
    SET status = 'sent', sent_at = NOW()
    WHERE id = $1
  `, [id])
}

async function markNotificationFailed(id: string, errorMessage: string): Promise<void> {
  await query(`
    UPDATE notification_queue
    SET status = 'failed', error_message = $2
    WHERE id = $1
  `, [id, errorMessage])
}

async function markNotificationExpired(id: string): Promise<void> {
  await query(`
    UPDATE notification_queue
    SET status = 'expired'
    WHERE id = $1
  `, [id])
}

async function scheduleRetry(
  id: string,
  newRetryCount: number,
  errorMessage?: string
): Promise<void> {
  const delayMs = RETRY_DELAYS_MS[Math.min(newRetryCount - 1, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!
  const nextRetryAt = new Date(Date.now() + delayMs)

  await query(`
    UPDATE notification_queue
    SET retry_count = $2, next_retry_at = $3, error_message = $4
    WHERE id = $1
  `, [id, newRetryCount, nextRetryAt.toISOString(), errorMessage ?? null])
}

// =============================================================================
// QUEUE MANAGEMENT
// =============================================================================

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number
  sent: number
  failed: number
  expired: number
  retrying: number
}> {
  const stats = await queryOne<{
    pending: number
    sent: number
    failed: number
    expired: number
    retrying: number
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending' AND retry_count = 0)::int as pending,
      COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
      COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
      COUNT(*) FILTER (WHERE status = 'expired')::int as expired,
      COUNT(*) FILTER (WHERE status = 'pending' AND retry_count > 0)::int as retrying
    FROM notification_queue
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `)

  return stats ?? { pending: 0, sent: 0, failed: 0, expired: 0, retrying: 0 }
}

/**
 * Clean up old notifications from queue
 */
export async function cleanupOldNotifications(daysToKeep: number = 7): Promise<number> {
  const result = await query<{ id: string }>(`
    DELETE FROM notification_queue
    WHERE created_at < NOW() - INTERVAL '1 day' * $1
      AND status IN ('sent', 'failed', 'expired')
    RETURNING id
  `, [daysToKeep])

  return result.length
}

/**
 * Cancel a queued notification
 */
export async function cancelQueuedNotification(id: string): Promise<boolean> {
  const result = await query<{ id: string }>(`
    DELETE FROM notification_queue
    WHERE id = $1 AND status = 'pending'
    RETURNING id
  `, [id])

  return result.length > 0
}

/**
 * Cancel all queued notifications for a user
 */
export async function cancelUserNotifications(
  userId: string,
  type?: string
): Promise<number> {
  let result: { id: string }[]

  if (type) {
    result = await query<{ id: string }>(`
      DELETE FROM notification_queue
      WHERE user_id = $1 AND type = $2 AND status = 'pending'
      RETURNING id
    `, [userId, type])
  } else {
    result = await query<{ id: string }>(`
      DELETE FROM notification_queue
      WHERE user_id = $1 AND status = 'pending'
      RETURNING id
    `, [userId])
  }

  return result.length
}
