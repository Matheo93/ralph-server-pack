/**
 * Mobile API Tests
 *
 * Tests for the mobile API service and endpoints.
 * Tests device registration, sync operations, rate limiting, and health checks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock database module
const mockQuery = vi.fn()
const mockQueryOne = vi.fn()
const mockSetCurrentUser = vi.fn()

vi.mock("@/lib/aws/database", () => ({
  query: mockQuery,
  queryOne: mockQueryOne,
  setCurrentUser: mockSetCurrentUser,
}))

// Mock Firebase with all exports
vi.mock("@/lib/firebase", () => ({
  isFirebaseConfigured: vi.fn(() => false),
  sendPushNotification: vi.fn(),
  sendMultiplePush: vi.fn(),
  sendTaskReminderPush: vi.fn(),
  sendTaskAssignmentPush: vi.fn(),
  sendImbalanceAlertPush: vi.fn(),
  sendStreakRiskPush: vi.fn(),
  sendTaskCompletedPush: vi.fn(),
  sendMilestonePush: vi.fn(),
  sendDeadlineWarningPush: vi.fn(),
  sendBatchNotifications: vi.fn(),
  getFirebaseAdmin: vi.fn(),
  getMessaging: vi.fn(),
}))

// Import service functions
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDeviceTokens,
  cleanupStaleTokens,
  getUserSessions,
  revokeSession,
  revokeOtherSessions,
  formatMobileSuccess,
  formatMobileError,
  checkMobileRateLimit,
  getSyncStatus,
  recordSyncTimestamp,
  getLastSyncTimestamp,
  checkHealth,
  batchCreateTasks,
  batchCompleteTasks,
  MobileErrorCodes,
  DeviceTokenSchema,
  SyncRequestSchema,
} from "@/lib/services/mobile-api"

// Helper to create mock requests
function createMockRequest(options: {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  searchParams?: Record<string, string>
}): NextRequest {
  const url = new URL("http://localhost:3000/api/mobile/test")
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const request = new NextRequest(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  return request
}

describe("Mobile API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Device Token Management
  // ==========================================================================

  describe("Device Token Management", () => {
    it("should register a new device token", async () => {
      const userId = "user-123"
      const tokenData = {
        token: "fcm-token-12345678901234567890",
        platform: "android" as const,
        deviceName: "Pixel 7",
        deviceModel: "Pixel 7 Pro",
        osVersion: "14",
        appVersion: "1.0.0",
      }

      // Mock: token doesn't exist yet
      mockQueryOne.mockResolvedValueOnce(null)
      // Mock: insert returns new ID
      mockQuery.mockResolvedValueOnce([{ id: "token-id-1" }])

      const result = await registerDeviceToken(userId, tokenData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tokenId).toBe("token-id-1")
      }
      expect(mockQuery).toHaveBeenCalled()
    })

    it("should update existing device token for same user", async () => {
      const userId = "user-123"
      const tokenData = {
        token: "fcm-token-existing-12345678901234567890",
        platform: "ios" as const,
      }

      // Mock: token exists for same user
      mockQueryOne.mockResolvedValueOnce({ id: "existing-token-id", user_id: userId })
      // Mock: update
      mockQuery.mockResolvedValueOnce([])

      const result = await registerDeviceToken(userId, tokenData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tokenId).toBe("existing-token-id")
      }
    })

    it("should transfer token to new user", async () => {
      const newUserId = "user-456"
      const tokenData = {
        token: "fcm-token-transfer-12345678901234567890",
        platform: "fcm" as const,
      }

      // Mock: token exists for different user
      mockQueryOne.mockResolvedValueOnce({ id: "transferred-token-id", user_id: "user-123" })
      // Mock: update
      mockQuery.mockResolvedValueOnce([])

      const result = await registerDeviceToken(newUserId, tokenData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tokenId).toBe("transferred-token-id")
      }
    })

    it("should unregister device token", async () => {
      mockQuery.mockResolvedValueOnce([])

      const result = await unregisterDeviceToken("user-123", "some-token")

      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM device_tokens"),
        ["user-123", "some-token"]
      )
    })

    it("should get all device tokens for user", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: "token-1",
          user_id: "user-123",
          token: "fcm-token-1",
          platform: "android",
          device_name: "Pixel 7",
          device_model: "Pixel 7 Pro",
          os_version: "14",
          app_version: "1.0.0",
          last_used: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "token-2",
          user_id: "user-123",
          token: "fcm-token-2",
          platform: "ios",
          device_name: "iPhone 15",
          device_model: "iPhone 15 Pro",
          os_version: "17.0",
          app_version: "1.0.0",
          last_used: "2024-01-02T00:00:00Z",
          created_at: "2024-01-02T00:00:00Z",
        },
      ])

      const tokens = await getUserDeviceTokens("user-123")

      expect(tokens).toHaveLength(2)
      expect(tokens[0]!.platform).toBe("android")
      expect(tokens[1]!.platform).toBe("ios")
    })

    it("should cleanup stale tokens", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "stale-token-1" },
        { id: "stale-token-2" },
        { id: "stale-token-3" },
      ])

      const count = await cleanupStaleTokens()

      expect(count).toBe(3)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("90 days")
      )
    })
  })

  // ==========================================================================
  // Mobile Session Management
  // ==========================================================================

  describe("Mobile Session Management", () => {
    it("should get all active sessions for user", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: "session-1",
          user_id: "user-123",
          token: "access-token-hash",
          refresh_token: "refresh-token-hash",
          device_id: "device-1",
          device_name: "iPhone 15",
          platform: "ios",
          expires_at: "2024-02-01T00:00:00Z",
          refresh_expires_at: "2024-03-01T00:00:00Z",
          last_used_at: "2024-01-15T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      ])

      const sessions = await getUserSessions("user-123")

      expect(sessions).toHaveLength(1)
      expect(sessions[0]!.deviceName).toBe("iPhone 15")
      expect(sessions[0]!.platform).toBe("ios")
    })

    it("should revoke a specific session", async () => {
      mockQuery.mockResolvedValueOnce([])

      const result = await revokeSession("user-123", "session-to-revoke")

      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("is_active = false"),
        ["session-to-revoke", "user-123"]
      )
    })

    it("should revoke all other sessions", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "session-2" },
        { id: "session-3" },
      ])

      const count = await revokeOtherSessions("user-123", "current-session")

      expect(count).toBe(2)
    })
  })

  // ==========================================================================
  // API Response Formatting
  // ==========================================================================

  describe("API Response Formatting", () => {
    it("should format success response correctly", () => {
      const data = { id: "123", name: "Test" }
      const response = formatMobileSuccess(data, "req-123")

      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
      expect(response.meta?.requestId).toBe("req-123")
      expect(response.meta?.timestamp).toBeDefined()
      expect(response.meta?.version).toBeDefined()
    })

    it("should format error response correctly", () => {
      const response = formatMobileError(
        MobileErrorCodes.UNAUTHORIZED,
        "Token expired",
        { tokenAge: 3600 },
        "req-456"
      )

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe("UNAUTHORIZED")
      expect(response.error?.message).toBe("Token expired")
      expect(response.error?.details?.tokenAge).toBe(3600)
      expect(response.meta?.requestId).toBe("req-456")
    })

    it("should include all error codes", () => {
      expect(MobileErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED")
      expect(MobileErrorCodes.FORBIDDEN).toBe("FORBIDDEN")
      expect(MobileErrorCodes.NOT_FOUND).toBe("NOT_FOUND")
      expect(MobileErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR")
      expect(MobileErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED")
      expect(MobileErrorCodes.SERVER_ERROR).toBe("SERVER_ERROR")
      expect(MobileErrorCodes.SYNC_CONFLICT).toBe("SYNC_CONFLICT")
      expect(MobileErrorCodes.TOKEN_EXPIRED).toBe("TOKEN_EXPIRED")
      expect(MobileErrorCodes.TOKEN_INVALID).toBe("TOKEN_INVALID")
    })
  })

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  describe("Rate Limiting", () => {
    it("should allow first request in new window", () => {
      const result = checkMobileRateLimit("rate-test-user-1", "/api/mobile/sync")

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
      expect(result.limit).toBe(30) // /api/mobile/sync has 30 req limit
    })

    it("should track requests and decrement remaining", () => {
      const userId = "rate-test-user-2"
      const endpoint = "/api/mobile/register-device"

      const result1 = checkMobileRateLimit(userId, endpoint)
      const result2 = checkMobileRateLimit(userId, endpoint)

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(result1.remaining - 1)
    })

    it("should block when rate limit exceeded", () => {
      const userId = "rate-test-user-3"
      const endpoint = "/api/mobile/register-device" // 10 req limit

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        checkMobileRateLimit(userId, endpoint)
      }

      const blocked = checkMobileRateLimit(userId, endpoint)

      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
    })

    it("should use default limits for unknown endpoints", () => {
      const result = checkMobileRateLimit("rate-test-user-4", "/api/unknown")

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(100) // default limit
    })
  })

  // ==========================================================================
  // Sync Status
  // ==========================================================================

  describe("Sync Status", () => {
    it("should return sync status without last sync (full sync required)", async () => {
      const status = await getSyncStatus("user-123", "household-123", null)

      expect(status.requiresFullSync).toBe(true)
      expect(status.lastSyncAt).toBeNull()
      expect(status.serverVersion).toBeDefined()
    })

    it("should count pending changes since last sync", async () => {
      mockQueryOne
        .mockResolvedValueOnce({ count: 5 }) // tasks
        .mockResolvedValueOnce({ count: 2 }) // children

      const status = await getSyncStatus(
        "user-123",
        "household-123",
        "2024-01-01T00:00:00Z"
      )

      expect(status.requiresFullSync).toBe(false)
      expect(status.pendingChanges).toBe(7)
      expect(status.lastSyncAt).toBe("2024-01-01T00:00:00Z")
    })

    it("should record and retrieve sync timestamps", () => {
      const userId = "sync-user-123"
      const deviceId = "device-456"
      const timestamp = "2024-01-15T12:00:00Z"

      recordSyncTimestamp(userId, deviceId, timestamp)
      const retrieved = getLastSyncTimestamp(userId, deviceId)

      expect(retrieved).toBe(timestamp)
    })

    it("should return null for unknown device sync timestamp", () => {
      const retrieved = getLastSyncTimestamp("unknown-user", "unknown-device")

      expect(retrieved).toBeNull()
    })
  })

  // ==========================================================================
  // Health Check
  // ==========================================================================

  describe("Health Check", () => {
    it("should return healthy when database is available", async () => {
      mockQueryOne.mockResolvedValueOnce({ ok: 1 })

      const health = await checkHealth()

      expect(health.status).toBe("healthy")
      expect(health.services.database).toBe(true)
      expect(health.services.redis).toBe(true) // in-memory cache always available
      expect(health.latency?.database).toBeDefined()
    })

    it("should return unhealthy when database is unavailable", async () => {
      mockQueryOne.mockRejectedValueOnce(new Error("Connection refused"))

      const health = await checkHealth()

      expect(health.status).toBe("unhealthy")
      expect(health.services.database).toBe(false)
    })

    it("should include timestamp and version", async () => {
      mockQueryOne.mockResolvedValueOnce({ ok: 1 })

      const health = await checkHealth()

      expect(health.timestamp).toBeDefined()
      expect(health.version).toBeDefined()
      expect(new Date(health.timestamp)).toBeInstanceOf(Date)
    })
  })

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  describe("Batch Operations", () => {
    it("should batch create tasks", async () => {
      const tasks = [
        { localId: "local-1", title: "Task 1", priority: "normal" },
        { localId: "local-2", title: "Task 2", priority: "high", isCritical: true },
      ]

      mockQuery
        .mockResolvedValueOnce([{ id: "server-id-1" }])
        .mockResolvedValueOnce([{ id: "server-id-2" }])

      const idMap = await batchCreateTasks("user-123", "household-123", tasks)

      expect(idMap.size).toBe(2)
      expect(idMap.get("local-1")).toBe("server-id-1")
      expect(idMap.get("local-2")).toBe("server-id-2")
    })

    it("should batch complete tasks", async () => {
      const taskIds = ["task-1", "task-2", "task-3"]

      mockQuery
        .mockResolvedValueOnce([{ id: "task-1" }])
        .mockResolvedValueOnce([{ id: "task-2" }])
        .mockResolvedValueOnce([]) // task-3 not found/already completed

      const result = await batchCompleteTasks("user-123", "household-123", taskIds)

      expect(result.completed).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.completed).toContain("task-1")
      expect(result.completed).toContain("task-2")
      expect(result.failed).toContain("task-3")
    })

    it("should handle empty batch gracefully", async () => {
      const idMap = await batchCreateTasks("user-123", "household-123", [])
      expect(idMap.size).toBe(0)

      const result = await batchCompleteTasks("user-123", "household-123", [])
      expect(result.completed).toHaveLength(0)
      expect(result.failed).toHaveLength(0)
    })
  })

  // ==========================================================================
  // Schema Validation
  // ==========================================================================

  describe("Schema Validation", () => {
    it("should validate device token schema", () => {
      const validData = {
        token: "fcm-token-123456789012",
        platform: "android",
        deviceName: "Pixel 7",
      }

      const result = DeviceTokenSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid device token platform", () => {
      const invalidData = {
        token: "fcm-token-123456789012",
        platform: "invalid-platform",
      }

      const result = DeviceTokenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject too short token", () => {
      const invalidData = {
        token: "short",
        platform: "android",
      }

      const result = DeviceTokenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should validate sync request schema", () => {
      const validData = {
        lastSyncTimestamp: "2024-01-01T00:00:00.000Z",
        deviceId: "device-123",
        includeDeleted: true,
      }

      const result = SyncRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow null lastSyncTimestamp for full sync", () => {
      const validData = {
        lastSyncTimestamp: null,
        deviceId: "device-123",
      }

      const result = SyncRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should default includeDeleted to false", () => {
      const data = {
        deviceId: "device-123",
      }

      const result = SyncRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.includeDeleted).toBe(false)
      }
    })
  })
})
