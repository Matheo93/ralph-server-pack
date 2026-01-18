/**
 * Web Push Service using VAPID
 * Provides push notifications for browsers that support the Web Push API
 * Works independently of Firebase for maximum compatibility
 */

import webpush from "web-push"
import { z } from "zod"

// VAPID keys configuration
// Generate new keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env["VAPID_PUBLIC_KEY"] || ""
const VAPID_PRIVATE_KEY = process.env["VAPID_PRIVATE_KEY"] || ""
const VAPID_SUBJECT = process.env["VAPID_SUBJECT"] || "mailto:support@familyload.com"

/**
 * Check if Web Push is configured
 */
export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null
}

/**
 * Initialize web-push with VAPID details
 */
let initialized = false
function initializeWebPush(): boolean {
  if (initialized) return true
  if (!isWebPushConfigured()) return false

  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )
    initialized = true
    return true
  } catch (error) {
    console.error("Failed to initialize web-push:", error)
    return false
  }
}

/**
 * Web Push subscription schema
 */
export const WebPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export type WebPushSubscription = z.infer<typeof WebPushSubscriptionSchema>

/**
 * Notification payload for web push
 */
export interface WebPushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, string>
  requireInteraction?: boolean
  silent?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Result of a web push send attempt
 */
export interface WebPushResult {
  success: boolean
  statusCode?: number
  error?: string
  expired?: boolean
}

/**
 * Send a web push notification to a subscription
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<WebPushResult> {
  if (!initializeWebPush()) {
    return {
      success: false,
      error: "Web Push not configured",
    }
  }

  try {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-72.png",
      tag: payload.tag,
      data: payload.data || {},
      requireInteraction: payload.requireInteraction ?? false,
      silent: payload.silent ?? false,
      actions: payload.actions || [],
    })

    const result = await webpush.sendNotification(subscription, pushPayload, {
      TTL: 86400, // 24 hours
      urgency: "normal",
    })

    return {
      success: true,
      statusCode: result.statusCode,
    }
  } catch (error) {
    const webPushError = error as { statusCode?: number; body?: string }
    const statusCode = webPushError.statusCode
    const errorMessage = webPushError.body || (error instanceof Error ? error.message : "Unknown error")

    // 404 or 410 means subscription is expired/invalid
    const expired = statusCode === 404 || statusCode === 410

    return {
      success: false,
      statusCode,
      error: errorMessage,
      expired,
    }
  }
}

/**
 * Send web push to multiple subscriptions
 */
export async function sendWebPushToMany(
  subscriptions: WebPushSubscription[],
  payload: WebPushPayload
): Promise<{
  successCount: number
  failureCount: number
  expiredSubscriptions: WebPushSubscription[]
  results: WebPushResult[]
}> {
  if (!initializeWebPush()) {
    return {
      successCount: 0,
      failureCount: subscriptions.length,
      expiredSubscriptions: [],
      results: subscriptions.map(() => ({
        success: false,
        error: "Web Push not configured",
      })),
    }
  }

  const results: WebPushResult[] = []
  const expiredSubscriptions: WebPushSubscription[] = []
  let successCount = 0
  let failureCount = 0

  for (const subscription of subscriptions) {
    const result = await sendWebPush(subscription, payload)
    results.push(result)

    if (result.success) {
      successCount++
    } else {
      failureCount++
      if (result.expired) {
        expiredSubscriptions.push(subscription)
      }
    }
  }

  return {
    successCount,
    failureCount,
    expiredSubscriptions,
    results,
  }
}

/**
 * Send calendar reminder notification
 */
export async function sendCalendarReminderPush(
  subscription: WebPushSubscription,
  eventTitle: string,
  eventTime: string,
  eventId: string,
  location?: string
): Promise<WebPushResult> {
  let body = `Commence à ${eventTime}`
  if (location) {
    body += ` - ${location}`
  }

  return sendWebPush(subscription, {
    title: `📅 ${eventTitle}`,
    body,
    tag: `calendar-${eventId}`,
    data: {
      type: "calendar_reminder",
      eventId,
      link: `/calendar?event=${eventId}`,
    },
    requireInteraction: true,
    actions: [
      {
        action: "view",
        title: "Voir",
      },
      {
        action: "dismiss",
        title: "OK",
      },
    ],
  })
}
