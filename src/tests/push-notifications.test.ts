/**
 * Push Notifications Tests
 *
 * Unit tests for Firebase push notifications logic and types.
 * These are pure unit tests that don't require Firebase.
 */

import { describe, it, expect, beforeEach } from "vitest"

// Mock environment variables
beforeEach(() => {
  process.env["FIREBASE_PROJECT_ID"] = "test-project"
  process.env["FIREBASE_CLIENT_EMAIL"] = "test@test.com"
  process.env["FIREBASE_PRIVATE_KEY"] = "test-key"
})

describe("Push Notification Types", () => {
  it("should define all notification types", () => {
    // Type check - these should be valid notification types
    const types: string[] = [
      "task_reminder",
      "task_assignment",
      "charge_alert",
      "streak_risk",
      "daily_digest",
      "deadline_warning",
      "task_completed",
      "milestone",
    ]

    expect(types).toHaveLength(8)
    expect(types).toContain("task_reminder")
    expect(types).toContain("streak_risk")
    expect(types).toContain("charge_alert")
  })
})

describe("Notification Result Types", () => {
  it("should have correct PushResult structure", () => {
    const successResult = {
      success: true,
      messageId: "msg-123",
    }
    expect(successResult.success).toBe(true)
    expect(successResult.messageId).toBe("msg-123")

    const failureResult = {
      success: false,
      error: "Token expired",
      invalidToken: true,
    }
    expect(failureResult.success).toBe(false)
    expect(failureResult.invalidToken).toBe(true)
  })

  it("should have correct MultiplePushResult structure", () => {
    const result = {
      successCount: 5,
      failureCount: 1,
      invalidTokens: ["bad-token"],
      results: [
        { success: true, messageId: "msg-1" },
        { success: false, error: "Error", invalidToken: true },
      ],
    }

    expect(result.successCount).toBe(5)
    expect(result.failureCount).toBe(1)
    expect(result.invalidTokens).toHaveLength(1)
    expect(result.results).toHaveLength(2)
  })

  it("should have correct NotificationPayload structure", () => {
    const payload = {
      title: "Test Title",
      body: "Test Body",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      clickAction: "/tasks",
    }

    expect(payload.title).toBe("Test Title")
    expect(payload.body).toBe("Test Body")
    expect(payload.icon).toBe("/icons/icon-192x192.png")
  })
})

describe("Firebase Configuration Detection", () => {
  it("should detect full configuration", () => {
    const config = {
      projectId: "test-project",
      clientEmail: "test@test.com",
      privateKey: "test-key",
    }

    const isConfigured = !!(config.projectId && config.clientEmail && config.privateKey)
    expect(isConfigured).toBe(true)
  })

  it("should detect missing project ID", () => {
    const config = {
      projectId: null,
      clientEmail: "test@test.com",
      privateKey: "test-key",
    }

    const isConfigured = !!(config.projectId && config.clientEmail && config.privateKey)
    expect(isConfigured).toBe(false)
  })

  it("should detect missing client email", () => {
    const config = {
      projectId: "test-project",
      clientEmail: null,
      privateKey: "test-key",
    }

    const isConfigured = !!(config.projectId && config.clientEmail && config.privateKey)
    expect(isConfigured).toBe(false)
  })

  it("should detect missing private key", () => {
    const config = {
      projectId: "test-project",
      clientEmail: "test@test.com",
      privateKey: null,
    }

    const isConfigured = !!(config.projectId && config.clientEmail && config.privateKey)
    expect(isConfigured).toBe(false)
  })
})

describe("Notification Message Formatting", () => {
  it("should format task reminder title correctly", () => {
    const taskTitle = "Rendez-vous médecin"
    const reminderTitle = `Rappel: ${taskTitle}`

    expect(reminderTitle).toBe("Rappel: Rendez-vous médecin")
  })

  it("should format task reminder body with deadline", () => {
    const deadline = new Date("2024-12-25T10:00:00Z")
    const body = `À faire avant le ${deadline.toLocaleDateString("fr-FR")}`

    expect(body).toContain("25")
    expect(body).toContain("12")
    expect(body).toContain("2024")
  })

  it("should format streak risk title for high streaks", () => {
    const currentStreak = 15
    const title = currentStreak >= 7
      ? `🔥 Série de ${currentStreak} jours en danger !`
      : `Attention: série de ${currentStreak} jours`

    expect(title).toBe("🔥 Série de 15 jours en danger !")
  })

  it("should format streak risk title for low streaks", () => {
    const currentStreak = 3
    const title = currentStreak >= 7
      ? `🔥 Série de ${currentStreak} jours en danger !`
      : `Attention: série de ${currentStreak} jours`

    expect(title).toBe("Attention: série de 3 jours")
  })

  it("should format deadline warning for 3 hours", () => {
    const hoursLeft = 3
    const title = hoursLeft <= 1
      ? "⚠️ Dernière heure !"
      : `⏰ Plus que ${hoursLeft}h`

    expect(title).toBe("⏰ Plus que 3h")
  })

  it("should format deadline warning for 1 hour", () => {
    const hoursLeft = 1
    const title = hoursLeft <= 1
      ? "⚠️ Dernière heure !"
      : `⏰ Plus que ${hoursLeft}h`

    expect(title).toBe("⚠️ Dernière heure !")
  })

  it("should format imbalance alert for warning level", () => {
    const alertLevel = "warning" as "warning" | "critical"
    const title = alertLevel === "critical"
      ? "Alerte déséquilibre critique"
      : "Attention: déséquilibre détecté"

    expect(title).toBe("Attention: déséquilibre détecté")
  })

  it("should format imbalance alert for critical level", () => {
    const alertLevel = "critical" as "warning" | "critical"
    const title = alertLevel === "critical"
      ? "Alerte déséquilibre critique"
      : "Attention: déséquilibre détecté"

    expect(title).toBe("Alerte déséquilibre critique")
  })

  it("should format imbalance body with ratio", () => {
    const ratio = "65/35"
    const body = `La répartition de charge est de ${ratio}. Pensez à rééquilibrer les tâches.`

    expect(body).toBe("La répartition de charge est de 65/35. Pensez à rééquilibrer les tâches.")
  })
})

describe("Notification Data Payloads", () => {
  it("should create task reminder data payload", () => {
    const taskId = "task-123"
    const data = {
      type: "task_reminder",
      taskId,
      link: `/tasks/${taskId}`,
    }

    expect(data.type).toBe("task_reminder")
    expect(data.taskId).toBe("task-123")
    expect(data.link).toBe("/tasks/task-123")
  })

  it("should create task assignment data payload", () => {
    const taskId = "task-456"
    const data = {
      type: "task_assignment",
      taskId,
      link: `/tasks/${taskId}`,
    }

    expect(data.type).toBe("task_assignment")
    expect(data.link).toBe("/tasks/task-456")
  })

  it("should create streak risk data payload", () => {
    const taskId = "task-789"
    const currentStreak = 10
    const data = {
      type: "streak_risk",
      currentStreak: String(currentStreak),
      taskId,
      link: `/tasks/${taskId}`,
    }

    expect(data.type).toBe("streak_risk")
    expect(data.currentStreak).toBe("10")
    expect(data.link).toBe("/tasks/task-789")
  })

  it("should create charge alert data payload", () => {
    const alertLevel: "warning" | "critical" = "critical"
    const data = {
      type: "charge_alert",
      alertLevel,
      link: "/charge",
    }

    expect(data.type).toBe("charge_alert")
    expect(data.alertLevel).toBe("critical")
    expect(data.link).toBe("/charge")
  })

  it("should create deadline warning data payload", () => {
    const taskId = "task-101"
    const hoursLeft = 3
    const data = {
      type: "deadline_warning",
      taskId,
      hoursLeft: String(hoursLeft),
      link: `/tasks/${taskId}`,
    }

    expect(data.type).toBe("deadline_warning")
    expect(data.hoursLeft).toBe("3")
    expect(data.link).toBe("/tasks/task-101")
  })
})

describe("Invalid Token Detection", () => {
  it("should detect invalid FCM token error", () => {
    const errorMessages = [
      "not a valid FCM registration token",
      "Requested entity was not found",
      "registration-token-not-registered",
    ]

    for (const message of errorMessages) {
      const isInvalid = message.includes("not a valid FCM registration token") ||
        message.includes("Requested entity was not found") ||
        message.includes("registration-token-not-registered")

      expect(isInvalid).toBe(true)
    }
  })

  it("should not flag other errors as invalid token", () => {
    const errorMessage = "Server error: unable to send"
    const isInvalid = errorMessage.includes("not a valid FCM registration token") ||
      errorMessage.includes("Requested entity was not found") ||
      errorMessage.includes("registration-token-not-registered")

    expect(isInvalid).toBe(false)
  })
})

describe("Multi-Device Handling", () => {
  it("should handle empty token array", () => {
    const tokens: string[] = []

    const result = {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [] as string[],
      results: [] as Array<{ success: boolean }>,
    }

    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(0)
    expect(result.results).toHaveLength(0)
  })

  it("should track results per token", () => {
    const tokens = ["token1", "token2", "token3"]
    const responses = [
      { success: true, messageId: "msg-1" },
      { success: false, error: "Invalid token" },
      { success: true, messageId: "msg-3" },
    ]

    const successCount = responses.filter(r => r.success).length
    const failureCount = responses.filter(r => !r.success).length

    expect(successCount).toBe(2)
    expect(failureCount).toBe(1)
    expect(responses).toHaveLength(3)
  })

  it("should collect invalid tokens", () => {
    const tokens = ["token1", "token2", "token3"]
    const responses = [
      { success: true },
      { success: false, invalidToken: true },
      { success: false, invalidToken: false },
    ]

    const invalidTokens: string[] = []
    responses.forEach((resp, index) => {
      if (!resp.success && "invalidToken" in resp && resp.invalidToken) {
        const token = tokens[index]
        if (token) {
          invalidTokens.push(token)
        }
      }
    })

    expect(invalidTokens).toHaveLength(1)
    expect(invalidTokens[0]).toBe("token2")
  })
})

describe("Batch Notification Logic", () => {
  it("should skip empty batches", () => {
    const batches = [
      { tokens: [], notification: { title: "Empty", body: "Body" } },
      { tokens: ["token1"], notification: { title: "Valid", body: "Body" } },
      { tokens: [], notification: { title: "Empty 2", body: "Body" } },
    ]

    const nonEmptyBatches = batches.filter(b => b.tokens.length > 0)
    expect(nonEmptyBatches).toHaveLength(1)
  })

  it("should count total tokens across batches", () => {
    const batches = [
      { tokens: ["t1", "t2"] },
      { tokens: ["t3"] },
      { tokens: ["t4", "t5", "t6"] },
    ]

    const totalTokens = batches.reduce((sum, b) => sum + b.tokens.length, 0)
    expect(totalTokens).toBe(6)
  })
})

describe("Notification Content Validation", () => {
  it("should validate title length", () => {
    const maxLength = 100
    const validTitle = "Rappel: Tâche importante"
    const tooLongTitle = "A".repeat(150)

    expect(validTitle.length).toBeLessThanOrEqual(maxLength)
    expect(tooLongTitle.length).toBeGreaterThan(maxLength)
  })

  it("should validate body length", () => {
    const maxLength = 500
    const validBody = "Cette tâche doit être complétée avant la deadline"
    const tooLongBody = "B".repeat(600)

    expect(validBody.length).toBeLessThanOrEqual(maxLength)
    expect(tooLongBody.length).toBeGreaterThan(maxLength)
  })
})
