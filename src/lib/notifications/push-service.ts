/**
 * Push Notification Service
 *
 * Handles push notifications via Firebase Cloud Messaging (FCM) and APNs.
 * Features:
 * - Device token management
 * - Multi-platform notification sending (iOS/Android/Web)
 * - Notification payload building
 * - Batch sending support
 * - Delivery tracking
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type Platform = "ios" | "android" | "web"
export type NotificationPriority = "low" | "normal" | "high" | "urgent"
export type NotificationStatus = "pending" | "sent" | "delivered" | "failed" | "expired"

export const DeviceTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  platform: z.enum(["ios", "android", "web"]),
  createdAt: z.date(),
  lastUsedAt: z.date(),
  isValid: z.boolean(),
  deviceInfo: z.object({
    model: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }).optional(),
})

export type DeviceToken = z.infer<typeof DeviceTokenSchema>

export interface NotificationPayload {
  title: string
  body: string
  imageUrl?: string
  icon?: string
  badge?: number
  sound?: string
  clickAction?: string
  data?: Record<string, string>
}

export interface NotificationOptions {
  priority: NotificationPriority
  ttl?: number // Time-to-live in seconds
  collapseKey?: string // Group notifications
  dryRun?: boolean
  analyticsLabel?: string
}

export interface PushNotification {
  id: string
  userId: string
  payload: NotificationPayload
  options: NotificationOptions
  targetTokens: string[]
  status: NotificationStatus
  createdAt: Date
  sentAt?: Date
  deliveredAt?: Date
  error?: string
  platform?: Platform
}

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  token: string
  platform: Platform
}

export interface BatchSendResult {
  totalSent: number
  successCount: number
  failureCount: number
  results: SendResult[]
}

export interface FCMConfig {
  projectId: string
  privateKey: string
  clientEmail: string
}

export interface APNsConfig {
  teamId: string
  keyId: string
  privateKey: string
  bundleId: string
  production: boolean
}

export interface PushServiceConfig {
  fcm?: FCMConfig
  apns?: APNsConfig
  defaultTtl: number
  maxRetries: number
  batchSize: number
}

export interface DeviceTokenStore {
  tokens: Map<string, DeviceToken>
  byUserId: Map<string, Set<string>>
  byPlatform: Map<Platform, Set<string>>
}

// =============================================================================
// DEVICE TOKEN MANAGEMENT
// =============================================================================

export function createDeviceTokenStore(): DeviceTokenStore {
  return {
    tokens: new Map(),
    byUserId: new Map(),
    byPlatform: new Map([
      ["ios", new Set()],
      ["android", new Set()],
      ["web", new Set()],
    ]),
  }
}

export function registerDeviceToken(
  store: DeviceTokenStore,
  userId: string,
  token: string,
  platform: Platform,
  deviceInfo?: DeviceToken["deviceInfo"]
): DeviceTokenStore {
  const id = `dt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const now = new Date()

  const deviceToken: DeviceToken = {
    id,
    userId,
    token,
    platform,
    createdAt: now,
    lastUsedAt: now,
    isValid: true,
    deviceInfo,
  }

  const newTokens = new Map(store.tokens)
  newTokens.set(token, deviceToken)

  const newByUserId = new Map(store.byUserId)
  const userTokens = new Set(newByUserId.get(userId) ?? [])
  userTokens.add(token)
  newByUserId.set(userId, userTokens)

  const newByPlatform = new Map(store.byPlatform)
  const platformTokens = new Set(newByPlatform.get(platform) ?? [])
  platformTokens.add(token)
  newByPlatform.set(platform, platformTokens)

  return {
    tokens: newTokens,
    byUserId: newByUserId,
    byPlatform: newByPlatform,
  }
}

export function unregisterDeviceToken(
  store: DeviceTokenStore,
  token: string
): DeviceTokenStore {
  const deviceToken = store.tokens.get(token)
  if (!deviceToken) return store

  const newTokens = new Map(store.tokens)
  newTokens.delete(token)

  const newByUserId = new Map(store.byUserId)
  const userTokens = new Set(newByUserId.get(deviceToken.userId) ?? [])
  userTokens.delete(token)
  if (userTokens.size === 0) {
    newByUserId.delete(deviceToken.userId)
  } else {
    newByUserId.set(deviceToken.userId, userTokens)
  }

  const newByPlatform = new Map(store.byPlatform)
  const platformTokens = new Set(newByPlatform.get(deviceToken.platform) ?? [])
  platformTokens.delete(token)
  newByPlatform.set(deviceToken.platform, platformTokens)

  return {
    tokens: newTokens,
    byUserId: newByUserId,
    byPlatform: newByPlatform,
  }
}

export function markTokenInvalid(
  store: DeviceTokenStore,
  token: string
): DeviceTokenStore {
  const deviceToken = store.tokens.get(token)
  if (!deviceToken) return store

  const newTokens = new Map(store.tokens)
  newTokens.set(token, { ...deviceToken, isValid: false })

  return {
    ...store,
    tokens: newTokens,
  }
}

export function updateTokenLastUsed(
  store: DeviceTokenStore,
  token: string
): DeviceTokenStore {
  const deviceToken = store.tokens.get(token)
  if (!deviceToken) return store

  const newTokens = new Map(store.tokens)
  newTokens.set(token, { ...deviceToken, lastUsedAt: new Date() })

  return {
    ...store,
    tokens: newTokens,
  }
}

export function getTokensForUser(store: DeviceTokenStore, userId: string): DeviceToken[] {
  const tokenIds = store.byUserId.get(userId) ?? new Set()
  return Array.from(tokenIds)
    .map(token => store.tokens.get(token))
    .filter((t): t is DeviceToken => t !== undefined && t.isValid)
}

export function getTokensForPlatform(store: DeviceTokenStore, platform: Platform): DeviceToken[] {
  const tokenIds = store.byPlatform.get(platform) ?? new Set()
  return Array.from(tokenIds)
    .map(token => store.tokens.get(token))
    .filter((t): t is DeviceToken => t !== undefined && t.isValid)
}

export function cleanupExpiredTokens(
  store: DeviceTokenStore,
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): DeviceTokenStore {
  const now = Date.now()
  let newStore = store

  for (const [token, deviceToken] of store.tokens) {
    const age = now - deviceToken.lastUsedAt.getTime()
    if (age > maxAgeMs || !deviceToken.isValid) {
      newStore = unregisterDeviceToken(newStore, token)
    }
  }

  return newStore
}

// =============================================================================
// NOTIFICATION PAYLOAD BUILDING
// =============================================================================

export function createNotificationPayload(
  title: string,
  body: string,
  options?: Partial<Omit<NotificationPayload, "title" | "body">>
): NotificationPayload {
  return {
    title,
    body,
    ...options,
  }
}

export function createPushNotification(
  userId: string,
  payload: NotificationPayload,
  options?: Partial<NotificationOptions>
): PushNotification {
  return {
    id: `pn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    payload,
    options: {
      priority: options?.priority ?? "normal",
      ttl: options?.ttl ?? 86400, // 24 hours default
      collapseKey: options?.collapseKey,
      dryRun: options?.dryRun ?? false,
      analyticsLabel: options?.analyticsLabel,
    },
    targetTokens: [],
    status: "pending",
    createdAt: new Date(),
  }
}

export function addTargetTokens(
  notification: PushNotification,
  tokens: string[]
): PushNotification {
  return {
    ...notification,
    targetTokens: [...notification.targetTokens, ...tokens],
  }
}

// =============================================================================
// FCM PAYLOAD FORMATTING
// =============================================================================

export interface FCMMessage {
  token: string
  notification: {
    title: string
    body: string
    image?: string
  }
  android?: {
    priority: "normal" | "high"
    ttl: string
    notification: {
      icon?: string
      color?: string
      sound?: string
      clickAction?: string
    }
    collapseKey?: string
  }
  webpush?: {
    notification: {
      icon?: string
      badge?: string
    }
    fcmOptions: {
      link?: string
    }
  }
  data?: Record<string, string>
}

export function buildFCMMessage(
  token: string,
  payload: NotificationPayload,
  options: NotificationOptions,
  platform: Platform
): FCMMessage {
  const message: FCMMessage = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
      image: payload.imageUrl,
    },
    data: payload.data,
  }

  if (platform === "android") {
    message.android = {
      priority: options.priority === "urgent" || options.priority === "high" ? "high" : "normal",
      ttl: `${options.ttl ?? 86400}s`,
      notification: {
        icon: payload.icon,
        sound: payload.sound ?? "default",
        clickAction: payload.clickAction,
      },
      collapseKey: options.collapseKey,
    }
  }

  if (platform === "web") {
    message.webpush = {
      notification: {
        icon: payload.icon,
        badge: payload.badge?.toString(),
      },
      fcmOptions: {
        link: payload.clickAction,
      },
    }
  }

  return message
}

// =============================================================================
// APNs PAYLOAD FORMATTING
// =============================================================================

export interface APNsPayload {
  aps: {
    alert: {
      title: string
      body: string
    }
    badge?: number
    sound?: string
    "mutable-content"?: number
    "content-available"?: number
    category?: string
    "thread-id"?: string
  }
  [key: string]: unknown
}

export function buildAPNsPayload(
  payload: NotificationPayload,
  options: NotificationOptions
): APNsPayload {
  const apnsPayload: APNsPayload = {
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
      },
      badge: payload.badge,
      sound: payload.sound ?? "default",
      "mutable-content": 1,
    },
  }

  if (options.collapseKey) {
    apnsPayload.aps["thread-id"] = options.collapseKey
  }

  // Add custom data
  if (payload.data) {
    for (const [key, value] of Object.entries(payload.data)) {
      apnsPayload[key] = value
    }
  }

  return apnsPayload
}

export function getAPNsPriority(priority: NotificationPriority): number {
  switch (priority) {
    case "urgent":
    case "high":
      return 10
    case "normal":
      return 5
    case "low":
      return 1
  }
}

// =============================================================================
// NOTIFICATION SENDING (MOCK IMPLEMENTATION)
// =============================================================================

export async function sendFCMNotification(
  message: FCMMessage,
  _config: FCMConfig
): Promise<SendResult> {
  // In production, this would use the Firebase Admin SDK
  // For now, we simulate the send
  await simulateNetworkDelay()

  const success = Math.random() > 0.05 // 95% success rate

  return {
    success,
    messageId: success ? `fcm_${Date.now()}` : undefined,
    error: success ? undefined : "FCM delivery failed",
    token: message.token,
    platform: message.android ? "android" : "web",
  }
}

export async function sendAPNsNotification(
  token: string,
  payload: APNsPayload,
  _priority: number,
  _ttl: number,
  _config: APNsConfig
): Promise<SendResult> {
  // In production, this would use the APNs HTTP/2 API
  await simulateNetworkDelay()

  const success = Math.random() > 0.05 // 95% success rate

  return {
    success,
    messageId: success ? `apns_${Date.now()}` : undefined,
    error: success ? undefined : "APNs delivery failed",
    token,
    platform: "ios",
  }
}

async function simulateNetworkDelay(): Promise<void> {
  const delay = 50 + Math.random() * 100
  return new Promise(resolve => setTimeout(resolve, delay))
}

// =============================================================================
// BATCH SENDING
// =============================================================================

export async function sendNotification(
  notification: PushNotification,
  store: DeviceTokenStore,
  config: PushServiceConfig
): Promise<BatchSendResult> {
  const tokens = getTokensForUser(store, notification.userId)

  if (tokens.length === 0) {
    return {
      totalSent: 0,
      successCount: 0,
      failureCount: 0,
      results: [],
    }
  }

  const results: SendResult[] = []

  for (const deviceToken of tokens) {
    let result: SendResult

    if (deviceToken.platform === "ios" && config.apns) {
      const apnsPayload = buildAPNsPayload(notification.payload, notification.options)
      const priority = getAPNsPriority(notification.options.priority)
      result = await sendAPNsNotification(
        deviceToken.token,
        apnsPayload,
        priority,
        notification.options.ttl ?? 86400,
        config.apns
      )
    } else if (config.fcm) {
      const fcmMessage = buildFCMMessage(
        deviceToken.token,
        notification.payload,
        notification.options,
        deviceToken.platform
      )
      result = await sendFCMNotification(fcmMessage, config.fcm)
    } else {
      result = {
        success: false,
        error: "No push service configured for platform",
        token: deviceToken.token,
        platform: deviceToken.platform,
      }
    }

    results.push(result)
  }

  return {
    totalSent: results.length,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    results,
  }
}

export async function sendBatchNotifications(
  notifications: PushNotification[],
  store: DeviceTokenStore,
  config: PushServiceConfig
): Promise<Map<string, BatchSendResult>> {
  const results = new Map<string, BatchSendResult>()

  // Process in batches
  for (let i = 0; i < notifications.length; i += config.batchSize) {
    const batch = notifications.slice(i, i + config.batchSize)

    await Promise.all(
      batch.map(async notification => {
        const result = await sendNotification(notification, store, config)
        results.set(notification.id, result)
      })
    )
  }

  return results
}

// =============================================================================
// NOTIFICATION HISTORY & TRACKING
// =============================================================================

export interface NotificationHistory {
  notifications: Map<string, PushNotification>
  byUserId: Map<string, string[]>
  stats: {
    totalSent: number
    totalDelivered: number
    totalFailed: number
  }
}

export function createNotificationHistory(): NotificationHistory {
  return {
    notifications: new Map(),
    byUserId: new Map(),
    stats: {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
    },
  }
}

export function recordNotification(
  history: NotificationHistory,
  notification: PushNotification,
  result: BatchSendResult
): NotificationHistory {
  const updatedNotification: PushNotification = {
    ...notification,
    status: result.failureCount === 0 ? "sent" : result.successCount > 0 ? "sent" : "failed",
    sentAt: new Date(),
    error: result.results.find(r => !r.success)?.error,
  }

  const newNotifications = new Map(history.notifications)
  newNotifications.set(notification.id, updatedNotification)

  const newByUserId = new Map(history.byUserId)
  const userNotifications = [...(newByUserId.get(notification.userId) ?? []), notification.id]
  newByUserId.set(notification.userId, userNotifications)

  return {
    notifications: newNotifications,
    byUserId: newByUserId,
    stats: {
      totalSent: history.stats.totalSent + result.successCount,
      totalDelivered: history.stats.totalDelivered,
      totalFailed: history.stats.totalFailed + result.failureCount,
    },
  }
}

export function markDelivered(
  history: NotificationHistory,
  notificationId: string
): NotificationHistory {
  const notification = history.notifications.get(notificationId)
  if (!notification) return history

  const newNotifications = new Map(history.notifications)
  newNotifications.set(notificationId, {
    ...notification,
    status: "delivered",
    deliveredAt: new Date(),
  })

  return {
    ...history,
    notifications: newNotifications,
    stats: {
      ...history.stats,
      totalDelivered: history.stats.totalDelivered + 1,
    },
  }
}

export function getNotificationsForUser(
  history: NotificationHistory,
  userId: string,
  limit: number = 50
): PushNotification[] {
  const notificationIds = history.byUserId.get(userId) ?? []
  return notificationIds
    .slice(-limit)
    .map(id => history.notifications.get(id))
    .filter((n): n is PushNotification => n !== undefined)
    .reverse()
}

// =============================================================================
// HELPERS
// =============================================================================

export function createPushServiceConfig(
  fcm?: FCMConfig,
  apns?: APNsConfig
): PushServiceConfig {
  return {
    fcm,
    apns,
    defaultTtl: 86400, // 24 hours
    maxRetries: 3,
    batchSize: 500,
  }
}

export function isPlatformSupported(
  platform: Platform,
  config: PushServiceConfig
): boolean {
  if (platform === "ios") {
    return config.apns !== undefined
  }
  return config.fcm !== undefined
}

export function getDeliveryStats(history: NotificationHistory): {
  deliveryRate: number
  failureRate: number
  totalSent: number
} {
  const total = history.stats.totalSent + history.stats.totalFailed
  if (total === 0) {
    return { deliveryRate: 0, failureRate: 0, totalSent: 0 }
  }

  return {
    deliveryRate: (history.stats.totalDelivered / total) * 100,
    failureRate: (history.stats.totalFailed / total) * 100,
    totalSent: total,
  }
}
