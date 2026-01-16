/**
 * Push Notifications Service Tests
 *
 * Tests for:
 * - Push service (device tokens, FCM, APNs)
 * - Notification scheduler
 * - Notification templates
 */

import { describe, it, expect, beforeEach } from "vitest"

// Push Service imports
import {
  createDeviceTokenStore,
  registerDeviceToken,
  unregisterDeviceToken,
  markTokenInvalid,
  updateTokenLastUsed,
  getTokensForUser,
  getTokensForPlatform,
  cleanupExpiredTokens,
  createNotificationPayload,
  createPushNotification,
  addTargetTokens,
  buildFCMMessage,
  buildAPNsPayload,
  getAPNsPriority,
  createNotificationHistory,
  recordNotification,
  markDelivered,
  getNotificationsForUser,
  createPushServiceConfig,
  isPlatformSupported,
  getDeliveryStats,
  type DeviceTokenStore,
  type NotificationHistory,
  type BatchSendResult,
} from "../lib/notifications/push-service"

// Notification Scheduler imports
import {
  createNotificationQueue,
  createSchedulerConfig,
  scheduleNotification,
  scheduleDeadlineReminder,
  scheduleRecurringReminder,
  cancelNotification,
  cancelNotificationsForTask,
  cancelNotificationsForUser,
  checkRateLimit,
  updateRateLimit,
  getDueNotifications,
  moveToPending,
  markSent,
  markFailed,
  processBatch,
  getProcessingStats,
  getNotificationsForUser as getScheduledNotificationsForUser,
  getNotificationsForTask,
  getUpcomingNotifications,
  getPendingCount,
  getScheduledCount,
  type NotificationQueue,
  type SchedulerConfig,
} from "../lib/notifications/notification-scheduler"

// Notification Templates imports
import {
  createTemplateStore,
  addTemplate,
  updateTemplate,
  removeTemplate,
  renderTemplate,
  interpolateString,
  validateVariables,
  getTemplate,
  getTemplatesByCategory,
  getEnabledTemplates,
  buildDeepLink,
  buildTaskDeepLink,
  buildHouseholdDeepLink,
  buildChargeDeepLink,
  createAction,
  createMarkDoneAction,
  createSnoozeAction,
  createViewAction,
  createCustomTemplate,
  cloneTemplate,
  getAvailableLanguages,
  getLanguageName,
  type TemplateStore,
} from "../lib/notifications/notification-templates"

// =============================================================================
// PUSH SERVICE TESTS
// =============================================================================

describe("Push Notification Service", () => {
  describe("Device Token Management", () => {
    let store: DeviceTokenStore

    beforeEach(() => {
      store = createDeviceTokenStore()
    })

    it("should create empty token store", () => {
      expect(store.tokens.size).toBe(0)
      expect(store.byUserId.size).toBe(0)
    })

    it("should register device token", () => {
      const newStore = registerDeviceToken(store, "user1", "token123", "ios")
      expect(newStore.tokens.size).toBe(1)
      expect(newStore.byUserId.get("user1")?.size).toBe(1)
    })

    it("should register multiple tokens for same user", () => {
      let newStore = registerDeviceToken(store, "user1", "token1", "ios")
      newStore = registerDeviceToken(newStore, "user1", "token2", "android")
      expect(newStore.byUserId.get("user1")?.size).toBe(2)
    })

    it("should unregister device token", () => {
      let newStore = registerDeviceToken(store, "user1", "token123", "ios")
      newStore = unregisterDeviceToken(newStore, "token123")
      expect(newStore.tokens.size).toBe(0)
    })

    it("should mark token as invalid", () => {
      let newStore = registerDeviceToken(store, "user1", "token123", "ios")
      newStore = markTokenInvalid(newStore, "token123")
      const token = newStore.tokens.get("token123")
      expect(token?.isValid).toBe(false)
    })

    it("should update token last used", () => {
      let newStore = registerDeviceToken(store, "user1", "token123", "ios")
      newStore = updateTokenLastUsed(newStore, "token123")
      const token = newStore.tokens.get("token123")
      expect(token?.lastUsedAt).toBeDefined()
    })

    it("should get tokens for user", () => {
      let newStore = registerDeviceToken(store, "user1", "token1", "ios")
      newStore = registerDeviceToken(newStore, "user1", "token2", "android")
      const tokens = getTokensForUser(newStore, "user1")
      expect(tokens.length).toBe(2)
    })

    it("should get tokens for platform", () => {
      let newStore = registerDeviceToken(store, "user1", "token1", "ios")
      newStore = registerDeviceToken(newStore, "user2", "token2", "ios")
      const tokens = getTokensForPlatform(newStore, "ios")
      expect(tokens.length).toBe(2)
    })

    it("should filter out invalid tokens", () => {
      let newStore = registerDeviceToken(store, "user1", "token1", "ios")
      newStore = registerDeviceToken(newStore, "user1", "token2", "android")
      newStore = markTokenInvalid(newStore, "token1")
      const tokens = getTokensForUser(newStore, "user1")
      expect(tokens.length).toBe(1)
    })

    it("should cleanup expired tokens", () => {
      let newStore = registerDeviceToken(store, "user1", "token1", "ios")
      const token = newStore.tokens.get("token1")!
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
      const newTokens = new Map(newStore.tokens)
      newTokens.set("token1", { ...token, lastUsedAt: oldDate })
      newStore = { ...newStore, tokens: newTokens }
      newStore = cleanupExpiredTokens(newStore, 30 * 24 * 60 * 60 * 1000)
      expect(newStore.tokens.size).toBe(0)
    })
  })

  describe("Notification Payload Building", () => {
    it("should create notification payload", () => {
      const payload = createNotificationPayload("Title", "Body", { badge: 5 })
      expect(payload.title).toBe("Title")
      expect(payload.body).toBe("Body")
      expect(payload.badge).toBe(5)
    })

    it("should create push notification", () => {
      const payload = createNotificationPayload("Title", "Body")
      const notification = createPushNotification("user1", payload, { priority: "high" })
      expect(notification.id).toMatch(/^pn_/)
      expect(notification.userId).toBe("user1")
      expect(notification.options.priority).toBe("high")
    })

    it("should add target tokens", () => {
      const payload = createNotificationPayload("Title", "Body")
      let notification = createPushNotification("user1", payload)
      notification = addTargetTokens(notification, ["token1", "token2"])
      expect(notification.targetTokens.length).toBe(2)
    })
  })

  describe("FCM Message Building", () => {
    it("should build FCM message for Android", () => {
      const payload = createNotificationPayload("Title", "Body")
      const message = buildFCMMessage("token123", payload, { priority: "high", ttl: 3600 }, "android")
      expect(message.token).toBe("token123")
      expect(message.android?.priority).toBe("high")
    })

    it("should build FCM message for Web", () => {
      const payload = createNotificationPayload("Title", "Body", { clickAction: "https://example.com" })
      const message = buildFCMMessage("token123", payload, { priority: "normal" }, "web")
      expect(message.webpush?.fcmOptions.link).toBe("https://example.com")
    })
  })

  describe("APNs Payload Building", () => {
    it("should build APNs payload", () => {
      const payload = createNotificationPayload("Title", "Body", { badge: 3 })
      const apnsPayload = buildAPNsPayload(payload, { priority: "high" })
      expect(apnsPayload.aps.alert.title).toBe("Title")
      expect(apnsPayload.aps.badge).toBe(3)
    })

    it("should get APNs priority", () => {
      expect(getAPNsPriority("urgent")).toBe(10)
      expect(getAPNsPriority("high")).toBe(10)
      expect(getAPNsPriority("normal")).toBe(5)
      expect(getAPNsPriority("low")).toBe(1)
    })
  })

  describe("Notification History", () => {
    let history: NotificationHistory

    beforeEach(() => {
      history = createNotificationHistory()
    })

    it("should create empty history", () => {
      expect(history.notifications.size).toBe(0)
      expect(history.stats.totalSent).toBe(0)
    })

    it("should record notification", () => {
      const payload = createNotificationPayload("Title", "Body")
      const notification = createPushNotification("user1", payload)
      const result: BatchSendResult = { totalSent: 1, successCount: 1, failureCount: 0, results: [] }
      const newHistory = recordNotification(history, notification, result)
      expect(newHistory.notifications.size).toBe(1)
    })

    it("should mark notification as delivered", () => {
      const payload = createNotificationPayload("Title", "Body")
      const notification = createPushNotification("user1", payload)
      const result: BatchSendResult = { totalSent: 1, successCount: 1, failureCount: 0, results: [] }
      let newHistory = recordNotification(history, notification, result)
      newHistory = markDelivered(newHistory, notification.id)
      expect(newHistory.notifications.get(notification.id)?.status).toBe("delivered")
    })

    it("should get notifications for user", () => {
      const payload = createNotificationPayload("Title", "Body")
      const notification = createPushNotification("user1", payload)
      const result: BatchSendResult = { totalSent: 1, successCount: 1, failureCount: 0, results: [] }
      const newHistory = recordNotification(history, notification, result)
      const userNotifications = getNotificationsForUser(newHistory, "user1")
      expect(userNotifications.length).toBe(1)
    })
  })

  describe("Service Configuration", () => {
    it("should create push service config", () => {
      const config = createPushServiceConfig({ projectId: "proj", privateKey: "key", clientEmail: "email" })
      expect(config.fcm).toBeDefined()
      expect(config.defaultTtl).toBe(86400)
    })

    it("should check platform support", () => {
      const config = createPushServiceConfig({ projectId: "proj", privateKey: "key", clientEmail: "email" })
      expect(isPlatformSupported("android", config)).toBe(true)
      expect(isPlatformSupported("ios", config)).toBe(false)
    })

    it("should get delivery stats", () => {
      const stats = getDeliveryStats(createNotificationHistory())
      expect(stats.deliveryRate).toBe(0)
    })
  })
})

// =============================================================================
// NOTIFICATION SCHEDULER TESTS
// =============================================================================

describe("Notification Scheduler", () => {
  let queue: NotificationQueue
  let config: SchedulerConfig

  beforeEach(() => {
    queue = createNotificationQueue()
    config = createSchedulerConfig()
  })

  describe("Queue Management", () => {
    it("should create empty queue", () => {
      expect(queue.scheduled.size).toBe(0)
    })

    it("should create scheduler config with defaults", () => {
      expect(config.batchSize).toBe(50)
      expect(config.rateLimitPerUser).toBe(10)
    })
  })

  describe("Scheduling Notifications", () => {
    it("should schedule notification", () => {
      const { queue: newQueue, notification } = scheduleNotification(
        queue, "user1", "Title", "Body", new Date(Date.now() + 3600000), "reminder"
      )
      expect(newQueue.scheduled.size).toBe(1)
      expect(notification.status).toBe("scheduled")
    })

    it("should schedule deadline reminder", () => {
      const deadline = new Date(Date.now() + 3600000)
      const { notification } = scheduleDeadlineReminder(queue, "user1", "task1", "Clean", deadline, 30)
      expect(notification.triggerType).toBe("deadline")
      expect(notification.taskId).toBe("task1")
    })

    it("should schedule recurring reminder", () => {
      const { notification } = scheduleRecurringReminder(
        queue, "user1", "task1", "Weekly", "Time to clean!", new Date(Date.now() + 86400000)
      )
      expect(notification.triggerType).toBe("recurring")
    })

    it("should index by user and task", () => {
      const { queue: newQueue } = scheduleNotification(
        queue, "user1", "Title", "Body", new Date(), "reminder", { taskId: "task1" }
      )
      expect(newQueue.byUserId.get("user1")?.size).toBe(1)
      expect(newQueue.byTaskId.get("task1")?.size).toBe(1)
    })
  })

  describe("Cancellation", () => {
    it("should cancel notification", () => {
      const { queue: newQueue, notification } = scheduleNotification(
        queue, "user1", "Title", "Body", new Date(), "reminder"
      )
      const cancelledQueue = cancelNotification(newQueue, notification.id)
      expect(cancelledQueue.scheduled.get(notification.id)?.status).toBe("cancelled")
    })

    it("should cancel notifications for task", () => {
      let q = queue
      for (let i = 0; i < 3; i++) {
        const result = scheduleNotification(q, "user1", "Title", "Body", new Date(), "reminder", { taskId: "task1" })
        q = result.queue
      }
      const cancelledQueue = cancelNotificationsForTask(q, "task1")
      const notifications = Array.from(cancelledQueue.scheduled.values())
      expect(notifications.every(n => n.status === "cancelled")).toBe(true)
    })

    it("should cancel notifications for user", () => {
      let q = queue
      for (let i = 0; i < 3; i++) {
        const result = scheduleNotification(q, "user1", "Title", "Body", new Date(), "reminder")
        q = result.queue
      }
      const cancelledQueue = cancelNotificationsForUser(q, "user1")
      const notifications = Array.from(cancelledQueue.scheduled.values())
      expect(notifications.every(n => n.status === "cancelled")).toBe(true)
    })
  })

  describe("Rate Limiting", () => {
    it("should allow first notification", () => {
      const { allowed } = checkRateLimit(queue, "user1", config)
      expect(allowed).toBe(true)
    })

    it("should block when rate limit exceeded", () => {
      let q = queue
      for (let i = 0; i < config.rateLimitPerUser; i++) {
        q = updateRateLimit(q, "user1", config)
      }
      const { allowed } = checkRateLimit(q, "user1", config)
      expect(allowed).toBe(false)
    })
  })

  describe("Queue Processing", () => {
    it("should get due notifications", () => {
      const pastDate = new Date(Date.now() - 60000)
      const futureDate = new Date(Date.now() + 60000)
      const { queue: q1 } = scheduleNotification(queue, "user1", "Due", "Body", pastDate, "reminder")
      const { queue: q2 } = scheduleNotification(q1, "user1", "Not Due", "Body", futureDate, "reminder")
      const due = getDueNotifications(q2)
      expect(due.length).toBe(1)
      expect(due[0]!.title).toBe("Due")
    })

    it("should move to pending", () => {
      const { queue: newQueue, notification } = scheduleNotification(
        queue, "user1", "Title", "Body", new Date(), "reminder"
      )
      const movedQueue = moveToPending(newQueue, [notification.id])
      expect(movedQueue.pending.has(notification.id)).toBe(true)
    })

    it("should mark as sent", () => {
      const { queue: q1, notification } = scheduleNotification(queue, "user1", "Title", "Body", new Date(), "reminder")
      const q2 = moveToPending(q1, [notification.id])
      const q3 = markSent(q2, notification.id)
      expect(q3.pending.get(notification.id)?.status).toBe("sent")
    })

    it("should mark as failed and reschedule", () => {
      const { queue: q1, notification } = scheduleNotification(
        queue, "user1", "Title", "Body", new Date(), "reminder", { maxRetries: 3 }
      )
      const q2 = moveToPending(q1, [notification.id])
      const q3 = markFailed(q2, notification.id, "Error")
      expect(q3.scheduled.has(notification.id)).toBe(true)
      expect(q3.scheduled.get(notification.id)?.retryCount).toBe(1)
    })
  })

  describe("Batch Processing", () => {
    it("should process batch respecting rate limits", () => {
      let q = queue
      for (let i = 0; i < 20; i++) {
        const result = scheduleNotification(q, "user1", `N${i}`, "Body", new Date(Date.now() - 1000), "reminder")
        q = result.queue
      }
      const { toProcess } = processBatch(q, config)
      expect(toProcess.length).toBeLessThanOrEqual(config.rateLimitPerUser)
    })

    it("should get processing stats", () => {
      const { queue: q1 } = scheduleNotification(queue, "user1", "T1", "B", new Date(), "reminder")
      const stats = getProcessingStats(q1)
      expect(stats.scheduled).toBe(1)
    })
  })

  describe("Query Helpers", () => {
    it("should get notifications for user", () => {
      const { queue: q1 } = scheduleNotification(queue, "user1", "T1", "B", new Date(), "reminder")
      const { queue: q2 } = scheduleNotification(q1, "user2", "T2", "B", new Date(), "reminder")
      const notifications = getScheduledNotificationsForUser(q2, "user1")
      expect(notifications.length).toBe(1)
    })

    it("should get notifications for task", () => {
      const { queue: q1 } = scheduleNotification(queue, "user1", "T1", "B", new Date(), "reminder", { taskId: "task1" })
      const notifications = getNotificationsForTask(q1, "task1")
      expect(notifications.length).toBe(1)
    })

    it("should get upcoming notifications", () => {
      const soon = new Date(Date.now() + 30 * 60 * 1000)
      const { queue: q1 } = scheduleNotification(queue, "user1", "Soon", "B", soon, "reminder")
      const upcoming = getUpcomingNotifications(q1, 60 * 60 * 1000)
      expect(upcoming.length).toBe(1)
    })

    it("should count scheduled and pending", () => {
      const { queue: q1, notification } = scheduleNotification(queue, "user1", "T1", "B", new Date(), "reminder")
      const { queue: q2 } = scheduleNotification(q1, "user1", "T2", "B", new Date(), "reminder")
      const q3 = moveToPending(q2, [notification.id])
      expect(getScheduledCount(q3)).toBe(1)
      expect(getPendingCount(q3)).toBe(1)
    })
  })
})

// =============================================================================
// NOTIFICATION TEMPLATES TESTS
// =============================================================================

describe("Notification Templates", () => {
  let store: TemplateStore

  beforeEach(() => {
    store = createTemplateStore()
  })

  describe("Template Store Management", () => {
    it("should create store with default templates", () => {
      expect(store.templates.size).toBeGreaterThan(0)
    })

    it("should add custom template", () => {
      const template = createCustomTemplate("system", "Custom", "Description", {
        fr: { title: "Alerte", body: "Message" },
        en: { title: "Alert", body: "Message" },
        es: { title: "Alerta", body: "Mensaje" },
        de: { title: "Warnung", body: "Nachricht" },
        it: { title: "Avviso", body: "Messaggio" },
        pt: { title: "Alerta", body: "Mensagem" },
      }, [])
      const newStore = addTemplate(store, template)
      expect(newStore.templates.has(template.id)).toBe(true)
    })

    it("should update template", () => {
      const template = Array.from(store.templates.values())[0]!
      const newStore = updateTemplate(store, template.id, { enabled: false })
      expect(newStore.templates.get(template.id)?.enabled).toBe(false)
    })

    it("should remove template", () => {
      const template = Array.from(store.templates.values())[0]!
      const newStore = removeTemplate(store, template.id)
      expect(newStore.templates.has(template.id)).toBe(false)
    })
  })

  describe("Template Rendering", () => {
    it("should interpolate variables", () => {
      const result = interpolateString("Hello {{name}}", { name: "Alice" })
      expect(result).toBe("Hello Alice")
    })

    it("should keep unmatched variables", () => {
      const result = interpolateString("Hello {{name}}, {{missing}}", { name: "Bob" })
      expect(result).toBe("Hello Bob, {{missing}}")
    })

    it("should render template in French", () => {
      const template = getTemplate(store, "task_reminder_default")!
      const rendered = renderTemplate(template, { taskName: "Clean", taskId: "1" }, "fr")
      expect(rendered.title).toBe("Rappel: Clean")
    })

    it("should render template in English", () => {
      const template = getTemplate(store, "task_reminder_default")!
      const rendered = renderTemplate(template, { taskName: "Clean", taskId: "1" }, "en")
      expect(rendered.title).toBe("Reminder: Clean")
    })

    it("should validate variables", () => {
      const template = getTemplate(store, "task_reminder_default")!
      const valid = validateVariables(template, { taskName: "T", taskId: "1", deadline: "2024" })
      expect(valid.valid).toBe(true)
    })
  })

  describe("Template Lookup", () => {
    it("should get template by ID", () => {
      const template = getTemplate(store, "task_reminder_default")
      expect(template?.category).toBe("task_reminder")
    })

    it("should get templates by category", () => {
      const templates = getTemplatesByCategory(store, "task_reminder")
      expect(templates.length).toBeGreaterThan(0)
    })

    it("should get only enabled templates", () => {
      const templates = getEnabledTemplates(store)
      expect(templates.every(t => t.enabled)).toBe(true)
    })
  })

  describe("Deep Link Building", () => {
    it("should build basic deep link", () => {
      expect(buildDeepLink({ screen: "dashboard" })).toBe("familyload://dashboard")
    })

    it("should build deep link with ID", () => {
      expect(buildDeepLink({ screen: "task", id: "123" })).toBe("familyload://task/123")
    })

    it("should build deep link with action", () => {
      expect(buildDeepLink({ screen: "task", id: "123", action: "complete" })).toBe("familyload://task/123/complete")
    })

    it("should build task deep link", () => {
      expect(buildTaskDeepLink("task123", "view")).toBe("familyload://task/task123/view")
    })

    it("should build household deep link", () => {
      expect(buildHouseholdDeepLink("h123")).toBe("familyload://household/h123")
    })

    it("should build charge deep link", () => {
      expect(buildChargeDeepLink()).toBe("familyload://charge")
    })
  })

  describe("Action Button Helpers", () => {
    it("should create action", () => {
      const action = createAction("test", "Test", "familyload://test", { icon: "star" })
      expect(action.id).toBe("test")
      expect(action.icon).toBe("star")
    })

    it("should create mark done action", () => {
      const action = createMarkDoneAction("task123")
      expect(action.id).toBe("mark_done")
    })

    it("should create snooze action", () => {
      const action = createSnoozeAction("task123")
      expect(action.id).toBe("snooze")
    })

    it("should create view action", () => {
      const action = createViewAction("task123")
      expect(action.id).toBe("view")
    })
  })

  describe("Helper Functions", () => {
    it("should clone template", () => {
      const original = getTemplate(store, "task_reminder_default")!
      const cloned = cloneTemplate(original, "Cloned")
      expect(cloned.id).not.toBe(original.id)
      expect(cloned.name).toBe("Cloned")
    })

    it("should get available languages", () => {
      const languages = getAvailableLanguages()
      expect(languages).toContain("fr")
      expect(languages).toContain("en")
    })

    it("should get language name", () => {
      expect(getLanguageName("fr")).toBe("Français")
      expect(getLanguageName("en")).toBe("English")
    })
  })
})
