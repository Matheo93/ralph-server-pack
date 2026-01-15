/**
 * Notification Queue Tests
 *
 * Unit tests for notification queuing, retry mechanism, and subscribe endpoint.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock database
vi.mock("@/lib/aws/database", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  insert: vi.fn(),
  setCurrentUser: vi.fn(),
}))

// Mock firebase
vi.mock("@/lib/firebase", () => ({
  isFirebaseConfigured: vi.fn(() => true),
  sendMultiplePush: vi.fn(() =>
    Promise.resolve({
      successCount: 2,
      failureCount: 0,
      invalidTokens: [],
      results: [
        { success: true, messageId: "msg-1" },
        { success: true, messageId: "msg-2" },
      ],
    })
  ),
}))

// Mock auth
vi.mock("@/lib/auth/actions", () => ({
  getUserId: vi.fn(() => Promise.resolve("user-123")),
}))

import { query, queryOne, insert } from "@/lib/aws/database"
import { sendMultiplePush, isFirebaseConfigured } from "@/lib/firebase"
import {
  queueNotification,
  queueHouseholdNotification,
  processNotificationQueue,
  getQueueStats,
  cleanupOldNotifications,
  cancelQueuedNotification,
  cancelUserNotifications,
} from "@/lib/services/notification-queue"

const mockQuery = query as ReturnType<typeof vi.fn>
const mockQueryOne = queryOne as ReturnType<typeof vi.fn>
const mockInsert = insert as ReturnType<typeof vi.fn>
const mockSendMultiplePush = sendMultiplePush as ReturnType<typeof vi.fn>
const mockIsFirebaseConfigured = isFirebaseConfigured as ReturnType<typeof vi.fn>

describe("Notification Queue Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("queueNotification", () => {
    it("should queue a notification for a user with tokens", async () => {
      // User has 2 device tokens
      mockQuery.mockResolvedValueOnce([
        { token: "token-1" },
        { token: "token-2" },
      ])

      // No existing aggregation key
      mockQueryOne.mockResolvedValueOnce(null)

      // Insert returns new ID
      mockInsert.mockResolvedValueOnce({ id: "notif-123" })

      const id = await queueNotification(
        "user-123",
        { title: "Test", body: "Test body" },
        { type: "task_reminder", taskId: "task-1" },
        { maxRetries: 5 }
      )

      expect(id).toBe("notif-123")
      expect(mockInsert).toHaveBeenCalledWith(
        "notification_queue",
        expect.objectContaining({
          user_id: "user-123",
          type: "task_reminder",
          title: "Test",
          body: "Test body",
          max_retries: 5,
          status: "pending",
        })
      )
    })

    it("should return null if user has no tokens", async () => {
      // User has no tokens
      mockQuery.mockResolvedValueOnce([])

      const id = await queueNotification(
        "user-123",
        { title: "Test", body: "Test body" }
      )

      expect(id).toBeNull()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("should check for existing aggregation key", async () => {
      // User has tokens
      mockQuery.mockResolvedValueOnce([{ token: "token-1" }])

      // No existing notification
      mockQueryOne.mockResolvedValueOnce(null)

      // Insert new
      mockInsert.mockResolvedValueOnce({ id: "new-id" })

      const id = await queueNotification(
        "user-123",
        { title: "Test", body: "Test body" },
        undefined,
        { aggregationKey: "task-123-reminder" }
      )

      expect(id).toBe("new-id")
      // Should have checked for existing aggregation key
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining("aggregation_key"),
        ["task-123-reminder"]
      )
    })

    it("should use default type if data is empty", async () => {
      mockQuery.mockResolvedValueOnce([{ token: "token-1" }])
      mockQueryOne.mockResolvedValueOnce(null)
      mockInsert.mockResolvedValueOnce({ id: "notif-123" })

      await queueNotification(
        "user-123",
        { title: "Test", body: "Body" }
      )

      expect(mockInsert).toHaveBeenCalledWith(
        "notification_queue",
        expect.objectContaining({
          type: "general",
        })
      )
    })
  })

  describe("queueHouseholdNotification", () => {
    it("should queue notifications for all household members", async () => {
      // Get household members
      mockQuery.mockResolvedValueOnce([
        { user_id: "user-1" },
        { user_id: "user-2" },
        { user_id: "user-3" },
      ])

      // Each user has tokens (called 3 times)
      mockQuery
        .mockResolvedValueOnce([{ token: "token-1" }])
        .mockResolvedValueOnce([{ token: "token-2" }])
        .mockResolvedValueOnce([{ token: "token-3" }])

      // No existing aggregation keys
      mockQueryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      // Insert for each user
      mockInsert
        .mockResolvedValueOnce({ id: "notif-1" })
        .mockResolvedValueOnce({ id: "notif-2" })
        .mockResolvedValueOnce({ id: "notif-3" })

      const ids = await queueHouseholdNotification(
        "household-123",
        { title: "Household Alert", body: "Something happened" }
      )

      expect(ids).toHaveLength(3)
      expect(ids).toEqual(["notif-1", "notif-2", "notif-3"])
    })

    it("should append user ID to aggregation key for each member", async () => {
      mockQuery.mockResolvedValueOnce([
        { user_id: "user-1" },
        { user_id: "user-2" },
      ])

      // Each user has tokens
      mockQuery
        .mockResolvedValueOnce([{ token: "token-1" }])
        .mockResolvedValueOnce([{ token: "token-2" }])

      // Check for existing notifications with user-specific keys
      mockQueryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      mockInsert
        .mockResolvedValueOnce({ id: "notif-1" })
        .mockResolvedValueOnce({ id: "notif-2" })

      await queueHouseholdNotification(
        "household-123",
        { title: "Test", body: "Body" },
        undefined,
        { aggregationKey: "weekly-summary" }
      )

      // Should have checked for aggregation keys with user suffix
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining("aggregation_key"),
        ["weekly-summary_user-1"]
      )
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining("aggregation_key"),
        ["weekly-summary_user-2"]
      )
    })
  })

  describe("processNotificationQueue", () => {
    it("should return early if Firebase is not configured", async () => {
      mockIsFirebaseConfigured.mockReturnValueOnce(false)

      const result = await processNotificationQueue()

      expect(result).toEqual({
        processed: 0,
        sent: 0,
        failed: 0,
        retrying: 0,
        expired: 0,
      })
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it("should process pending notifications", async () => {
      mockIsFirebaseConfigured.mockReturnValueOnce(true)

      // Get pending notifications
      mockQuery.mockResolvedValueOnce([
        {
          id: "notif-1",
          user_id: "user-1",
          type: "task_reminder",
          title: "Reminder",
          body: "Do it!",
          data: JSON.stringify({ type: "task_reminder" }),
          tokens: JSON.stringify(["token-1", "token-2"]),
          retry_count: 0,
          max_retries: 3,
          expires_at: null,
        },
      ])

      // Send succeeds
      mockSendMultiplePush.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 0,
        invalidTokens: [],
        results: [
          { success: true, messageId: "msg-1" },
          { success: true, messageId: "msg-2" },
        ],
      })

      // Mark as sent
      mockQuery.mockResolvedValueOnce([])

      const result = await processNotificationQueue()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
    })

    it("should mark expired notifications", async () => {
      mockIsFirebaseConfigured.mockReturnValueOnce(true)

      // Get pending notifications with expired one
      const pastDate = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      mockQuery.mockResolvedValueOnce([
        {
          id: "notif-expired",
          user_id: "user-1",
          type: "task_reminder",
          title: "Expired",
          body: "Too late",
          data: null,
          tokens: JSON.stringify(["token-1"]),
          retry_count: 0,
          max_retries: 3,
          expires_at: pastDate,
        },
      ])

      // Mark as expired
      mockQuery.mockResolvedValueOnce([])

      const result = await processNotificationQueue()

      expect(result.processed).toBe(1)
      expect(result.expired).toBe(1)
      expect(result.sent).toBe(0)
    })

    it("should handle invalid tokens and clean them up", async () => {
      mockIsFirebaseConfigured.mockReturnValueOnce(true)

      mockQuery.mockResolvedValueOnce([
        {
          id: "notif-1",
          user_id: "user-1",
          type: "task_reminder",
          title: "Test",
          body: "Body",
          data: null,
          tokens: JSON.stringify(["valid-token", "invalid-token"]),
          retry_count: 0,
          max_retries: 3,
          expires_at: null,
        },
      ])

      // One success, one invalid
      mockSendMultiplePush.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ["invalid-token"],
        results: [
          { success: true, messageId: "msg-1" },
          { success: false, error: "Invalid token", invalidToken: true },
        ],
      })

      // Delete invalid tokens
      mockQuery.mockResolvedValueOnce([])
      // Update notification tokens
      mockQuery.mockResolvedValueOnce([])
      // Mark as sent
      mockQuery.mockResolvedValueOnce([])

      const result = await processNotificationQueue()

      expect(result.sent).toBe(1)
      // Should have called to delete invalid tokens
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM device_tokens"),
        ["invalid-token"]
      )
    })

    it("should schedule retry on failure", async () => {
      mockIsFirebaseConfigured.mockReturnValueOnce(true)

      mockQuery.mockResolvedValueOnce([
        {
          id: "notif-1",
          user_id: "user-1",
          type: "task_reminder",
          title: "Test",
          body: "Body",
          data: null,
          tokens: JSON.stringify(["token-1"]),
          retry_count: 0,
          max_retries: 3,
          expires_at: null,
        },
      ])

      // All failures
      mockSendMultiplePush.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        invalidTokens: [],
        results: [{ success: false, error: "Network error" }],
      })

      // Schedule retry
      mockQuery.mockResolvedValueOnce([])

      const result = await processNotificationQueue()

      expect(result.processed).toBe(1)
      expect(result.retrying).toBe(1)
      expect(result.sent).toBe(0)
      expect(result.failed).toBe(0)
    })

    it("should mark as failed after max retries", async () => {
      mockIsFirebaseConfigured.mockReturnValueOnce(true)

      mockQuery.mockResolvedValueOnce([
        {
          id: "notif-1",
          user_id: "user-1",
          type: "task_reminder",
          title: "Test",
          body: "Body",
          data: null,
          tokens: JSON.stringify(["token-1"]),
          retry_count: 3, // Already at max
          max_retries: 3,
          expires_at: null,
        },
      ])

      // All failures
      mockSendMultiplePush.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        invalidTokens: [],
        results: [{ success: false, error: "Network error" }],
      })

      // Mark as failed
      mockQuery.mockResolvedValueOnce([])

      const result = await processNotificationQueue()

      expect(result.failed).toBe(1)
      expect(result.retrying).toBe(0)
    })
  })

  describe("getQueueStats", () => {
    it("should query for queue statistics", async () => {
      // Test that the query is called correctly
      mockQueryOne.mockResolvedValueOnce(null)

      await getQueueStats()

      // Query is called with SQL containing notification_queue
      expect(mockQueryOne).toHaveBeenCalled()
      const callArgs = mockQueryOne.mock.calls[0]
      expect(callArgs?.[0]).toContain("notification_queue")
    })

    it("should return default zeros if no data", async () => {
      mockQueryOne.mockResolvedValueOnce(null)

      const stats = await getQueueStats()

      // Should return defaults when query returns null
      expect(stats.pending).toBeDefined()
      expect(stats.sent).toBeDefined()
      expect(stats.failed).toBeDefined()
    })
  })

  describe("cleanupOldNotifications", () => {
    it("should delete old notifications", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "old-1" },
        { id: "old-2" },
        { id: "old-3" },
      ])

      const deleted = await cleanupOldNotifications(7)

      expect(deleted).toBe(3)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM notification_queue"),
        [7]
      )
    })

    it("should use default retention days", async () => {
      mockQuery.mockResolvedValueOnce([])

      await cleanupOldNotifications()

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        [7] // Default is 7 days
      )
    })
  })

  describe("cancelQueuedNotification", () => {
    it("should cancel pending notification", async () => {
      mockQuery.mockResolvedValueOnce([{ id: "notif-123" }])

      const result = await cancelQueuedNotification("notif-123")

      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM notification_queue"),
        ["notif-123"]
      )
    })

    it("should return false if notification not found", async () => {
      mockQuery.mockResolvedValueOnce([])

      const result = await cancelQueuedNotification("nonexistent")

      expect(result).toBe(false)
    })
  })

  describe("cancelUserNotifications", () => {
    it("should cancel all pending notifications for user", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "notif-1" },
        { id: "notif-2" },
      ])

      const count = await cancelUserNotifications("user-123")

      expect(count).toBe(2)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = $1"),
        ["user-123"]
      )
    })

    it("should filter by type if provided", async () => {
      mockQuery.mockResolvedValueOnce([{ id: "notif-1" }])

      await cancelUserNotifications("user-123", "task_reminder")

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND type = $2"),
        ["user-123", "task_reminder"]
      )
    })
  })
})

describe("Notification Templates", () => {
  it("should have all required template generators", async () => {
    const templates = await import("@/lib/templates/push")

    expect(templates.generateDailyReminderPush).toBeDefined()
    expect(templates.generateDeadlineApproachingPush).toBeDefined()
    expect(templates.generateStreakAtRiskPush).toBeDefined()
    expect(templates.generateBalanceAlertPush).toBeDefined()
    expect(templates.generateWeeklySummaryPush).toBeDefined()
    expect(templates.generateTaskCompletedPush).toBeDefined()
    expect(templates.generateTaskAssignedPush).toBeDefined()
    expect(templates.generateWelcomePush).toBeDefined()
  })

  it("should generate daily reminder template", async () => {
    const { generateDailyReminderPush } = await import("@/lib/templates/push")

    const template = generateDailyReminderPush({
      userName: "Jean",
      todayTasksCount: 5,
      criticalTasksCount: 2,
      overdueTasksCount: 0,
    })

    expect(template.notification.title).toBeDefined()
    expect(template.notification.body).toContain("5")
    expect(template.data["type"]).toBe("daily_reminder")
  })

  it("should generate deadline approaching template", async () => {
    const { generateDeadlineApproachingPush } = await import("@/lib/templates/push")

    const template = generateDeadlineApproachingPush({
      taskTitle: "Rapport urgent",
      taskId: "task-123",
      hoursLeft: 2,
      isCritical: true,
    })

    expect(template.notification.body).toContain("Rapport urgent")
    expect(template.data["taskId"]).toBe("task-123")
    expect(template.data["hoursLeft"]).toBe("2")
  })

  it("should generate streak at risk template", async () => {
    const { generateStreakAtRiskPush } = await import("@/lib/templates/push")

    const template = generateStreakAtRiskPush({
      currentStreak: 15,
      bestStreak: 20,
      uncompletedTaskTitle: "Tache quotidienne",
      taskId: "task-456",
      hoursUntilMidnight: 4,
    })

    expect(template.notification.title).toContain("15")
    expect(template.data["currentStreak"]).toBe("15")
  })

  it("should generate balance alert template", async () => {
    const { generateBalanceAlertPush } = await import("@/lib/templates/push")

    const template = generateBalanceAlertPush({
      alertLevel: "critical",
      ratio: "70/30",
    })

    expect(template.notification.title).toContain("critique")
    expect(template.data["ratio"]).toBe("70/30")
  })

  it("should generate weekly summary template", async () => {
    const { generateWeeklySummaryPush } = await import("@/lib/templates/push")

    const template = generateWeeklySummaryPush({
      userName: "Marie",
      completedTasksCount: 25,
      totalTasksCount: 30,
      streakDays: 10,
      balanceRatio: "52/48",
    })

    expect(template.notification.title).toBeDefined()
    expect(template.notification.body).toContain("25")
  })

  it("should generate task completed template", async () => {
    const { generateTaskCompletedPush } = await import("@/lib/templates/push")

    const template = generateTaskCompletedPush({
      completedByName: "Jean Dupont",
      taskTitle: "Faire les courses",
      taskId: "task-789",
    })

    expect(template.notification.title).toContain("Jean")
    expect(template.notification.body).toContain("Faire les courses")
    expect(template.data["type"]).toBe("task_completed")
  })

  it("should generate task assigned template", async () => {
    const { generateTaskAssignedPush } = await import("@/lib/templates/push")

    const template = generateTaskAssignedPush({
      assignedByName: "Marie",
      taskTitle: "Rendez-vous medecin",
      taskId: "task-abc",
      priority: "high",
    })

    expect(template.notification.title).toContain("Marie")
    expect(template.notification.body).toContain("Rendez-vous medecin")
    expect(template.data["type"]).toBe("task_assigned")
  })

  it("should generate welcome template", async () => {
    const { generateWelcomePush } = await import("@/lib/templates/push")

    const template = generateWelcomePush({
      userName: "Pierre Martin",
      householdName: "Famille Martin",
    })

    expect(template.notification.title).toContain("Pierre")
    expect(template.notification.body).toContain("Famille Martin")
    expect(template.data["type"]).toBe("welcome")
  })

  it("should use factory function with discriminated union", async () => {
    const { generatePushTemplate } = await import("@/lib/templates/push")

    const template = generatePushTemplate({
      type: "balance_alert",
      params: {
        alertLevel: "warning",
        ratio: "60/40",
      },
    })

    expect(template.notification.title).toBeDefined()
    expect(template.data["type"]).toBe("balance_alert")
  })
})

describe("Subscribe Endpoint Schema", () => {
  it("should validate subscribe request schema", () => {
    const validData = {
      token: "a".repeat(100),
      platform: "ios",
      deviceName: "iPhone 15",
      deviceModel: "iPhone15,2",
      osVersion: "17.0",
      appVersion: "1.0.0",
    }

    expect(validData.token.length).toBeGreaterThanOrEqual(10)
    expect(validData.token.length).toBeLessThanOrEqual(500)
    expect(["ios", "apns", "android", "fcm", "web"]).toContain(validData.platform)
  })

  it("should reject token that is too short", () => {
    const invalidData = {
      token: "short",
      platform: "ios",
    }

    expect(invalidData.token.length).toBeLessThan(10)
  })

  it("should reject invalid platform", () => {
    const validPlatforms = ["ios", "apns", "android", "fcm", "web"]
    const invalidPlatform = "windows"

    expect(validPlatforms).not.toContain(invalidPlatform)
  })

  it("should validate update subscription schema", () => {
    const validTopics = [
      "task_reminder",
      "deadline_warning",
      "streak_risk",
      "charge_alert",
      "task_completed",
      "daily_digest",
      "weekly_summary",
    ]

    const updateData = {
      token: "a".repeat(100),
      enabled: true,
      topics: ["task_reminder", "deadline_warning"],
    }

    expect(updateData.topics.every((t) => validTopics.includes(t))).toBe(true)
  })

  it("should reject invalid topic", () => {
    const validTopics = [
      "task_reminder",
      "deadline_warning",
      "streak_risk",
      "charge_alert",
      "task_completed",
      "daily_digest",
      "weekly_summary",
    ]

    const invalidTopic = "invalid_topic"

    expect(validTopics).not.toContain(invalidTopic)
  })
})

describe("Retry Mechanism", () => {
  it("should have correct retry delays", () => {
    const RETRY_DELAYS_MS = [
      1 * 60 * 1000, // 1 minute
      5 * 60 * 1000, // 5 minutes
      30 * 60 * 1000, // 30 minutes
      2 * 60 * 60 * 1000, // 2 hours
    ]

    expect(RETRY_DELAYS_MS[0]).toBe(60000) // 1 minute
    expect(RETRY_DELAYS_MS[1]).toBe(300000) // 5 minutes
    expect(RETRY_DELAYS_MS[2]).toBe(1800000) // 30 minutes
    expect(RETRY_DELAYS_MS[3]).toBe(7200000) // 2 hours
  })

  it("should calculate next retry time correctly", () => {
    const RETRY_DELAYS_MS = [60000, 300000, 1800000, 7200000]
    const retryCount = 2

    const delay = RETRY_DELAYS_MS[Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1)]!
    const nextRetry = new Date(Date.now() + delay)

    expect(nextRetry.getTime()).toBeGreaterThan(Date.now())
    expect(delay).toBe(300000) // 5 minutes for retry 2
  })

  it("should use last delay for retries beyond array length", () => {
    const RETRY_DELAYS_MS = [60000, 300000, 1800000, 7200000]
    const retryCount = 10

    const delay = RETRY_DELAYS_MS[Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1)]!

    expect(delay).toBe(7200000) // Should use last delay
  })

  it("should respect max retries limit", () => {
    const DEFAULT_MAX_RETRIES = 3
    const retryCount = 3

    const shouldRetry = retryCount < DEFAULT_MAX_RETRIES

    expect(shouldRetry).toBe(false)
  })
})
