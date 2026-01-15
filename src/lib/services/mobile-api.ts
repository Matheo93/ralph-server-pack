/**
 * Mobile API Service
 *
 * Provides mobile-specific functionality:
 * - Device token registration for push notifications
 * - Mobile session management
 * - API response formatting for mobile clients
 * - Rate limiting helpers
 * - Offline sync helpers
 */

import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"

// =============================================================================
// IN-MEMORY CACHE (for rate limiting and sync timestamps)
// In production, this should be replaced with Redis for multi-instance support
// =============================================================================

const memoryCache = new Map<string, { value: string; expiresAt: number }>()

function cacheGet(key: string): string | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key)
    return null
  }
  return entry.value
}

function cacheSet(key: string, value: string, ttlSeconds: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key)
    }
  }
}, 60 * 1000) // Every minute

// =============================================================================
// TYPES
// =============================================================================

export interface DeviceToken {
  id: string
  userId: string
  token: string
  platform: "ios" | "apns" | "android" | "fcm" | "web"
  deviceName: string | null
  deviceModel: string | null
  osVersion: string | null
  appVersion: string | null
  lastUsed: Date
  createdAt: Date
}

export interface MobileSession {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  deviceId: string | null
  deviceName: string | null
  platform: string | null
  expiresAt: Date
  refreshExpiresAt: Date
  lastUsedAt: Date
  createdAt: Date
}

export interface SyncStatus {
  lastSyncAt: string | null
  pendingChanges: number
  serverVersion: string
  requiresFullSync: boolean
}

export interface MobileApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    timestamp: string
    version: string
    requestId?: string
  }
}

// =============================================================================
// SCHEMAS
// =============================================================================

export const DeviceTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["ios", "apns", "android", "fcm", "web"]),
  deviceName: z.string().max(100).optional(),
  deviceModel: z.string().max(100).optional(),
  osVersion: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
})

export const SyncRequestSchema = z.object({
  lastSyncTimestamp: z.string().datetime().nullable().optional(),
  deviceId: z.string().max(100).optional(),
  includeDeleted: z.boolean().optional().default(false),
})

// =============================================================================
// DEVICE TOKEN MANAGEMENT
// =============================================================================

/**
 * Register or update a device token for push notifications
 */
export async function registerDeviceToken(
  userId: string,
  data: z.infer<typeof DeviceTokenSchema>
): Promise<{ success: true; tokenId: string } | { success: false; error: string }> {
  const { token, platform, deviceName, deviceModel, osVersion, appVersion } = data

  // Check if token already exists
  const existing = await queryOne<{ id: string; user_id: string }>(`
    SELECT id, user_id FROM device_tokens WHERE token = $1
  `, [token])

  if (existing) {
    // Update existing token
    if (existing.user_id !== userId) {
      // Token transferred to new user - update ownership
      await query(`
        UPDATE device_tokens SET
          user_id = $1,
          platform = $2,
          device_name = $3,
          device_model = $4,
          os_version = $5,
          app_version = $6,
          last_used = NOW(),
          updated_at = NOW()
        WHERE id = $7
      `, [userId, platform, deviceName ?? null, deviceModel ?? null, osVersion ?? null, appVersion ?? null, existing.id])
    } else {
      // Same user - just update metadata
      await query(`
        UPDATE device_tokens SET
          platform = $1,
          device_name = $2,
          device_model = $3,
          os_version = $4,
          app_version = $5,
          last_used = NOW(),
          updated_at = NOW()
        WHERE id = $6
      `, [platform, deviceName ?? null, deviceModel ?? null, osVersion ?? null, appVersion ?? null, existing.id])
    }

    return { success: true, tokenId: existing.id }
  }

  // Create new token
  const result = await query<{ id: string }>(`
    INSERT INTO device_tokens (
      user_id, token, platform, device_name, device_model,
      os_version, app_version, last_used
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id
  `, [userId, token, platform, deviceName ?? null, deviceModel ?? null, osVersion ?? null, appVersion ?? null])

  if (result.length === 0) {
    return { success: false, error: "Échec de l'enregistrement du token" }
  }

  return { success: true, tokenId: result[0]!.id }
}

/**
 * Unregister a device token
 */
export async function unregisterDeviceToken(
  userId: string,
  token: string
): Promise<boolean> {
  const result = await query(`
    DELETE FROM device_tokens
    WHERE user_id = $1 AND token = $2
  `, [userId, token])

  return true
}

/**
 * Get all device tokens for a user
 */
export async function getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
  const tokens = await query<{
    id: string
    user_id: string
    token: string
    platform: "ios" | "apns" | "android" | "fcm" | "web"
    device_name: string | null
    device_model: string | null
    os_version: string | null
    app_version: string | null
    last_used: string
    created_at: string
  }>(`
    SELECT id, user_id, token, platform, device_name, device_model,
           os_version, app_version, last_used, created_at
    FROM device_tokens
    WHERE user_id = $1
    ORDER BY last_used DESC
  `, [userId])

  return tokens.map((t) => ({
    id: t.id,
    userId: t.user_id,
    token: t.token,
    platform: t.platform,
    deviceName: t.device_name,
    deviceModel: t.device_model,
    osVersion: t.os_version,
    appVersion: t.app_version,
    lastUsed: new Date(t.last_used),
    createdAt: new Date(t.created_at),
  }))
}

/**
 * Clean up stale device tokens (not used in 90 days)
 */
export async function cleanupStaleTokens(): Promise<number> {
  const result = await query<{ id: string }>(`
    DELETE FROM device_tokens
    WHERE last_used < NOW() - INTERVAL '90 days'
    RETURNING id
  `)

  return result.length
}

// =============================================================================
// MOBILE SESSION MANAGEMENT
// =============================================================================

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<MobileSession[]> {
  const sessions = await query<{
    id: string
    user_id: string
    token: string
    refresh_token: string
    device_id: string | null
    device_name: string | null
    platform: string | null
    expires_at: string
    refresh_expires_at: string
    last_used_at: string
    created_at: string
  }>(`
    SELECT id, user_id, token, refresh_token, device_id, device_name,
           platform, expires_at, refresh_expires_at,
           COALESCE(last_used_at, created_at) as last_used_at, created_at
    FROM user_sessions
    WHERE user_id = $1 AND is_active = true
    ORDER BY last_used_at DESC
  `, [userId])

  return sessions.map((s) => ({
    id: s.id,
    userId: s.user_id,
    accessToken: s.token,
    refreshToken: s.refresh_token,
    deviceId: s.device_id,
    deviceName: s.device_name,
    platform: s.platform,
    expiresAt: new Date(s.expires_at),
    refreshExpiresAt: new Date(s.refresh_expires_at),
    lastUsedAt: new Date(s.last_used_at),
    createdAt: new Date(s.created_at),
  }))
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const result = await query(`
    UPDATE user_sessions
    SET is_active = false
    WHERE id = $1 AND user_id = $2
  `, [sessionId, userId])

  return true
}

/**
 * Revoke all sessions except current
 */
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  const result = await query<{ id: string }>(`
    UPDATE user_sessions
    SET is_active = false
    WHERE user_id = $1 AND id != $2 AND is_active = true
    RETURNING id
  `, [userId, currentSessionId])

  return result.length
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await query(`
    UPDATE user_sessions
    SET last_used_at = NOW()
    WHERE id = $1
  `, [sessionId])
}

// =============================================================================
// API RESPONSE FORMATTING
// =============================================================================

const API_VERSION = "1.0.0"

/**
 * Format success response for mobile clients
 */
export function formatMobileSuccess<T>(
  data: T,
  requestId?: string
): MobileApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      requestId,
    },
  }
}

/**
 * Format error response for mobile clients
 */
export function formatMobileError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): MobileApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      requestId,
    },
  }
}

/**
 * Standard error codes for mobile API
 */
export const MobileErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
  SYNC_CONFLICT: "SYNC_CONFLICT",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  DEVICE_NOT_REGISTERED: "DEVICE_NOT_REGISTERED",
  OFFLINE_SYNC_REQUIRED: "OFFLINE_SYNC_REQUIRED",
} as const

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
}

const endpointRateLimits: Record<string, RateLimitConfig> = {
  "/api/mobile/register-device": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/mobile/sync": { windowMs: 60 * 1000, maxRequests: 30 },
  "/api/v1/auth": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/v1/sync": { windowMs: 60 * 1000, maxRequests: 30 },
}

/**
 * Check rate limit for a user on a specific endpoint
 */
export function checkMobileRateLimit(
  userId: string,
  endpoint: string
): {
  allowed: boolean
  remaining: number
  resetIn: number
  limit: number
} {
  const config = endpointRateLimits[endpoint] ?? defaultRateLimitConfig
  const key = `mobile:rate:${userId}:${endpoint}`
  const now = Date.now()

  const stored = cacheGet(key)

  if (!stored) {
    // New window
    cacheSet(key, JSON.stringify({
      count: 1,
      resetAt: now + config.windowMs,
    }), Math.ceil(config.windowMs / 1000))

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
      limit: config.maxRequests,
    }
  }

  const data = JSON.parse(stored) as { count: number; resetAt: number }

  if (data.resetAt < now) {
    // Window expired, start new
    cacheSet(key, JSON.stringify({
      count: 1,
      resetAt: now + config.windowMs,
    }), Math.ceil(config.windowMs / 1000))

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
      limit: config.maxRequests,
    }
  }

  if (data.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: data.resetAt - now,
      limit: config.maxRequests,
    }
  }

  // Increment counter
  data.count++
  cacheSet(key, JSON.stringify(data), Math.ceil((data.resetAt - now) / 1000))

  return {
    allowed: true,
    remaining: config.maxRequests - data.count,
    resetIn: data.resetAt - now,
    limit: config.maxRequests,
  }
}

// =============================================================================
// SYNC STATUS
// =============================================================================

/**
 * Get sync status for a user/household
 */
export async function getSyncStatus(
  userId: string,
  householdId: string,
  lastSyncTimestamp?: string | null
): Promise<SyncStatus> {
  // Get count of changes since last sync
  let pendingChanges = 0

  if (lastSyncTimestamp) {
    const taskChanges = await queryOne<{ count: number }>(`
      SELECT COUNT(*)::int as count
      FROM tasks
      WHERE household_id = $1 AND updated_at > $2
    `, [householdId, lastSyncTimestamp])

    const childChanges = await queryOne<{ count: number }>(`
      SELECT COUNT(*)::int as count
      FROM children
      WHERE household_id = $1 AND updated_at > $2
    `, [householdId, lastSyncTimestamp])

    pendingChanges = (taskChanges?.count ?? 0) + (childChanges?.count ?? 0)
  }

  // Check if full sync is required (e.g., after major schema changes)
  const requiresFullSync = !lastSyncTimestamp

  return {
    lastSyncAt: lastSyncTimestamp ?? null,
    pendingChanges,
    serverVersion: API_VERSION,
    requiresFullSync,
  }
}

/**
 * Record last sync timestamp for a device
 */
export function recordSyncTimestamp(
  userId: string,
  deviceId: string,
  timestamp: string
): void {
  const key = `sync:last:${userId}:${deviceId}`
  cacheSet(key, timestamp, 86400 * 7) // Keep for 7 days
}

/**
 * Get last sync timestamp for a device
 */
export function getLastSyncTimestamp(
  userId: string,
  deviceId: string
): string | null {
  const key = `sync:last:${userId}:${deviceId}`
  return cacheGet(key)
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  services: {
    database: boolean
    redis: boolean
    firebase: boolean
  }
  latency?: {
    database: number
    redis: number
  }
}

/**
 * Check health of all dependent services
 */
export async function checkHealth(): Promise<HealthStatus> {
  const services = {
    database: false,
    redis: true, // Using in-memory cache, always available
    firebase: false,
  }
  const latency: { database: number; redis: number } = {
    database: 0,
    redis: 0,
  }

  // Check database
  const dbStart = Date.now()
  try {
    await queryOne<{ ok: number }>(`SELECT 1 as ok`)
    services.database = true
    latency.database = Date.now() - dbStart
  } catch {
    latency.database = Date.now() - dbStart
  }

  // In-memory cache is always available
  latency.redis = 0

  // Check Firebase (just check if configured)
  try {
    const { isFirebaseConfigured } = await import("@/lib/firebase")
    services.firebase = isFirebaseConfigured()
  } catch {
    services.firebase = false
  }

  // Determine overall status
  let status: HealthStatus["status"] = "healthy"
  if (!services.database) {
    status = "unhealthy"
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    services,
    latency,
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Batch create tasks from mobile app
 */
export async function batchCreateTasks(
  userId: string,
  householdId: string,
  tasks: Array<{
    localId: string
    title: string
    description?: string | null
    priority: string
    isCritical?: boolean
    deadline?: string | null
    childId?: string | null
    categoryId?: string | null
  }>
): Promise<Map<string, string>> {
  const localToServerIdMap = new Map<string, string>()

  for (const task of tasks) {
    const result = await query<{ id: string }>(`
      INSERT INTO tasks (
        household_id, title, description, status, priority,
        is_critical, deadline, child_id, category_id, created_by, load_weight
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      householdId,
      task.title,
      task.description ?? null,
      task.priority,
      task.isCritical ?? false,
      task.deadline ?? null,
      task.childId ?? null,
      task.categoryId ?? null,
      userId,
      task.isCritical ? 5 : 3,
    ])

    if (result.length > 0) {
      localToServerIdMap.set(task.localId, result[0]!.id)
    }
  }

  return localToServerIdMap
}

/**
 * Batch complete tasks from mobile app
 */
export async function batchCompleteTasks(
  userId: string,
  householdId: string,
  taskIds: string[]
): Promise<{ completed: string[]; failed: string[] }> {
  const completed: string[] = []
  const failed: string[] = []

  for (const taskId of taskIds) {
    try {
      const result = await query<{ id: string }>(`
        UPDATE tasks
        SET status = 'done',
            completed_at = NOW(),
            completed_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND household_id = $3 AND status = 'pending'
        RETURNING id
      `, [userId, taskId, householdId])

      if (result.length > 0) {
        completed.push(taskId)
      } else {
        failed.push(taskId)
      }
    } catch {
      failed.push(taskId)
    }
  }

  return { completed, failed }
}
