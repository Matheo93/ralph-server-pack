/**
 * Smart Reminders Tests
 * Tests for reminder engine, urgency calculator, and notification optimizer
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  reminderEngine,
  createReminderStore,
  addReminder,
  updateReminder,
  getReminder,
  getRemindersByTask,
  getRemindersByUser,
  getScheduledReminders,
  generateReminderId,
  calculatePriority,
  buildReminderContent,
  createReminder,
  createDeadlineReminder,
  createOverdueReminder,
  markSent,
  markDelivered,
  markFailed,
  cancelReminder,
  snoozeReminder,
  unsnoozeReminder,
  isQuietHours,
  getNextSendTime,
  getDueReminders,
  getRemindersInWindow,
  groupByUser,
  applyDailyLimit,
  processBatch,
  calculateMetrics,
  type Reminder,
  type ReminderStore,
  type Task,
  type UserPreferences,
} from "@/lib/reminders/reminder-engine"

import {
  urgencyCalculator,
  DEFAULT_CONFIG,
  calculateDeadlineFactor,
  calculatePriorityFactor,
  calculateAgeFactor,
  calculateDependencyFactor,
  calculateStaleFactor,
  calculateCompletionFactor,
  calculateFactors,
  calculateTotalScore,
  scoreToLevel,
  generateBreakdown,
  generateRecommendations,
  calculateUrgencyScore,
  calculateBatchScores,
  sortByUrgency,
  filterByLevel,
  getTopUrgent,
  calculateDistribution,
  calculateTrend,
  type TaskInput,
  type UrgencyScore,
  type UrgencyConfig,
} from "@/lib/reminders/urgency-calculator"

import {
  notificationOptimizer,
  DEFAULT_CONFIG as OPTIMIZER_CONFIG,
  isWithinDeliveryWindow,
  getWindowWeight,
  getNextWindowTime,
  calculateEngagementScore,
  findBestTimeSlot,
  isUserLikelyActive,
  getOptimalTimeForUser,
  createBatches,
  createRateLimitState,
  canSendNotification,
  recordNotificationSent,
  recordUserInteraction,
  recordFailedDelivery,
  resetHourlyCount,
  resetDailyCount,
  selectBestChannel,
  optimizeNotification,
  optimizeBatch,
  type Notification,
  type UserActivity,
  type EngagementMetric,
  type RateLimitState,
  type OptimizationConfig,
  type DeliveryWindow,
} from "@/lib/reminders/notification-optimizer"

// =============================================================================
// REMINDER ENGINE TESTS
// =============================================================================

describe("Reminder Engine", () => {
  // ---------------------------------------------------------------------------
  // Store Operations
  // ---------------------------------------------------------------------------

  describe("Reminder Store", () => {
    let store: ReminderStore

    beforeEach(() => {
      store = createReminderStore()
    })

    it("should create empty store", () => {
      expect(store.reminders.size).toBe(0)
      expect(store.scheduled.size).toBe(0)
    })

    it("should add reminder to store", () => {
      const task = createTestTask()
      const reminder = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 3600000),
        channels: ["push"],
      })

      const newStore = addReminder(store, reminder)
      expect(newStore.reminders.size).toBe(1)
      expect(newStore.scheduled.size).toBe(1)
    })

    it("should retrieve reminder by ID", () => {
      const task = createTestTask()
      const reminder = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 3600000),
        channels: ["push"],
      })

      const newStore = addReminder(store, reminder)
      const retrieved = getReminder(newStore, reminder.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(reminder.id)
    })

    it("should get reminders by task", () => {
      const task = createTestTask()
      const reminder1 = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 3600000),
        channels: ["push"],
      })
      const reminder2 = createReminder({
        task,
        userId: "user_2",
        type: "follow_up",
        scheduledAt: new Date(Date.now() + 7200000),
        channels: ["email"],
      })

      let newStore = addReminder(store, reminder1)
      newStore = addReminder(newStore, reminder2)

      const taskReminders = getRemindersByTask(newStore, task.id)
      expect(taskReminders.length).toBe(2)
    })

    it("should get reminders by user", () => {
      const task = createTestTask()
      const reminder = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 3600000),
        channels: ["push"],
      })

      const newStore = addReminder(store, reminder)
      const userReminders = getRemindersByUser(newStore, "user_1")
      expect(userReminders.length).toBe(1)
    })

    it("should get scheduled reminders sorted by time", () => {
      const task = createTestTask()
      const later = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 7200000),
        channels: ["push"],
      })
      const earlier = createReminder({
        task,
        userId: "user_1",
        type: "check_in",
        scheduledAt: new Date(Date.now() + 3600000),
        channels: ["push"],
      })

      let newStore = addReminder(store, later)
      newStore = addReminder(newStore, earlier)

      const scheduled = getScheduledReminders(newStore)
      expect(scheduled.length).toBe(2)
      expect(scheduled[0]!.id).toBe(earlier.id)
    })
  })

  // ---------------------------------------------------------------------------
  // Reminder Creation
  // ---------------------------------------------------------------------------

  describe("Reminder Creation", () => {
    it("should generate unique IDs", () => {
      const id1 = generateReminderId()
      const id2 = generateReminderId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^rem_/)
    })

    it("should calculate priority for urgent task", () => {
      const task = createTestTask({ priority: "urgent" })
      expect(calculatePriority(task)).toBe("urgent")
    })

    it("should calculate high priority for overdue task", () => {
      const task = createTestTask({
        priority: "medium",
        deadline: new Date(Date.now() - 3600000), // 1 hour ago
      })
      expect(calculatePriority(task)).toBe("high")
    })

    it("should calculate priority based on deadline proximity", () => {
      const task = createTestTask({
        priority: "medium",
        deadline: new Date(Date.now() + 12 * 3600000), // 12 hours
      })
      expect(calculatePriority(task)).toBe("high")
    })

    it("should build reminder content in French", () => {
      const task = createTestTask({ title: "Nettoyer la cuisine" })
      const content = buildReminderContent(task, "deadline", "fr")

      expect(content.title).toContain("Échéance")
      expect(content.body).toContain("Nettoyer la cuisine")
    })

    it("should build reminder content in English", () => {
      const task = createTestTask({ title: "Clean the kitchen" })
      const content = buildReminderContent(task, "deadline", "en")

      expect(content.title).toContain("Deadline")
      expect(content.body).toContain("Clean the kitchen")
    })

    it("should create deadline reminder", () => {
      const task = createTestTask({
        deadline: new Date(Date.now() + 48 * 3600000), // 48 hours
      })
      const preferences = createTestPreferences()

      const reminder = createDeadlineReminder(task, "user_1", preferences)
      expect(reminder).not.toBeNull()
      expect(reminder!.type).toBe("deadline")
    })

    it("should not create deadline reminder for completed task", () => {
      const task = createTestTask({
        status: "completed",
        deadline: new Date(Date.now() + 48 * 3600000),
      })
      const preferences = createTestPreferences()

      const reminder = createDeadlineReminder(task, "user_1", preferences)
      expect(reminder).toBeNull()
    })

    it("should create overdue reminder", () => {
      const task = createTestTask({
        deadline: new Date(Date.now() - 3600000), // 1 hour ago
      })
      const preferences = createTestPreferences()

      const reminder = createOverdueReminder(task, "user_1", preferences)
      expect(reminder).not.toBeNull()
      expect(reminder!.type).toBe("overdue")
    })
  })

  // ---------------------------------------------------------------------------
  // Reminder Operations
  // ---------------------------------------------------------------------------

  describe("Reminder Operations", () => {
    let reminder: Reminder

    beforeEach(() => {
      const task = createTestTask()
      reminder = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 3600000),
        channels: ["push"],
      })
    })

    it("should mark reminder as sent", () => {
      const sent = markSent(reminder)
      expect(sent.deliveryStatus).toBe("sent")
      expect(sent.sentAt).not.toBeNull()
    })

    it("should mark reminder as delivered", () => {
      const sent = markSent(reminder)
      const delivered = markDelivered(sent)
      expect(delivered.deliveryStatus).toBe("delivered")
    })

    it("should mark reminder as failed", () => {
      const failed = markFailed(reminder)
      expect(failed.deliveryStatus).toBe("failed")
    })

    it("should cancel reminder", () => {
      const cancelled = cancelReminder(reminder)
      expect(cancelled.deliveryStatus).toBe("cancelled")
    })

    it("should snooze reminder", () => {
      const snoozed = snoozeReminder(reminder, 30) // 30 minutes
      expect(snoozed.deliveryStatus).toBe("snoozed")
      expect(snoozed.snoozeCount).toBe(1)
      expect(snoozed.snoozedUntil).not.toBeNull()
    })

    it("should unsnooze reminder", () => {
      const snoozed = snoozeReminder(reminder, 30)
      const unsnoozed = unsnoozeReminder(snoozed)
      expect(unsnoozed.deliveryStatus).toBe("scheduled")
      expect(unsnoozed.snoozedUntil).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------

  describe("Scheduling", () => {
    it("should detect quiet hours", () => {
      const preferences = createTestPreferences({
        quietHours: { enabled: true, start: "22:00", end: "07:00" },
      })

      const lateNight = new Date()
      lateNight.setHours(23, 0, 0, 0)

      expect(isQuietHours(lateNight, preferences)).toBe(true)
    })

    it("should not detect quiet hours when disabled", () => {
      const preferences = createTestPreferences({
        quietHours: { enabled: false, start: "22:00", end: "07:00" },
      })

      const lateNight = new Date()
      lateNight.setHours(23, 0, 0, 0)

      expect(isQuietHours(lateNight, preferences)).toBe(false)
    })

    it("should get next send time respecting quiet hours", () => {
      const preferences = createTestPreferences({
        quietHours: { enabled: true, start: "22:00", end: "07:00" },
      })

      const lateNight = new Date()
      lateNight.setHours(23, 0, 0, 0)

      const nextTime = getNextSendTime(lateNight, preferences)
      expect(nextTime.getHours()).toBe(7)
    })

    it("should get due reminders", () => {
      let store = createReminderStore()
      const task = createTestTask()

      const due = createReminder({
        task,
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() - 60000), // 1 min ago
        channels: ["push"],
      })

      const notDue = createReminder({
        task,
        userId: "user_1",
        type: "check_in",
        scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
        channels: ["push"],
      })

      store = addReminder(store, due)
      store = addReminder(store, notDue)

      const dueReminders = getDueReminders(store)
      expect(dueReminders.length).toBe(1)
      expect(dueReminders[0]!.id).toBe(due.id)
    })
  })

  // ---------------------------------------------------------------------------
  // Batch Processing
  // ---------------------------------------------------------------------------

  describe("Batch Processing", () => {
    it("should group reminders by user", () => {
      const task = createTestTask()
      const reminders = [
        createReminder({
          task,
          userId: "user_1",
          type: "deadline",
          scheduledAt: new Date(),
          channels: ["push"],
        }),
        createReminder({
          task,
          userId: "user_2",
          type: "deadline",
          scheduledAt: new Date(),
          channels: ["push"],
        }),
        createReminder({
          task,
          userId: "user_1",
          type: "follow_up",
          scheduledAt: new Date(),
          channels: ["push"],
        }),
      ]

      const grouped = groupByUser(reminders)
      expect(grouped.size).toBe(2)
      expect(grouped.get("user_1")!.length).toBe(2)
      expect(grouped.get("user_2")!.length).toBe(1)
    })

    it("should apply daily limit", () => {
      const task = createTestTask()
      const reminders = Array.from({ length: 15 }, (_, i) =>
        createReminder({
          task,
          userId: "user_1",
          type: "deadline",
          scheduledAt: new Date(Date.now() + i * 60000),
          channels: ["push"],
        })
      )

      const { allowed, deferred } = applyDailyLimit(reminders, 10)
      expect(allowed.length).toBe(10)
      expect(deferred.length).toBe(5)
    })

    it("should prioritize urgent reminders in daily limit", () => {
      const task = createTestTask()
      const urgentReminder = createReminder({
        task: createTestTask({ priority: "urgent" }),
        userId: "user_1",
        type: "deadline",
        scheduledAt: new Date(Date.now() + 10 * 60000),
        channels: ["push"],
      })
      urgentReminder.priority = "urgent"

      const normalReminders = Array.from({ length: 5 }, (_, i) =>
        createReminder({
          task,
          userId: "user_1",
          type: "deadline",
          scheduledAt: new Date(Date.now() + i * 60000),
          channels: ["push"],
        })
      )

      const all = [urgentReminder, ...normalReminders]
      const { allowed } = applyDailyLimit(all, 3)

      expect(allowed[0]!.priority).toBe("urgent")
    })
  })

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  describe("Analytics", () => {
    it("should calculate metrics", () => {
      const task = createTestTask()
      const reminders: Reminder[] = [
        markDelivered(markSent(createReminder({
          task,
          userId: "user_1",
          type: "deadline",
          scheduledAt: new Date(),
          channels: ["push"],
        }))),
        markFailed(createReminder({
          task,
          userId: "user_1",
          type: "follow_up",
          scheduledAt: new Date(),
          channels: ["push"],
        })),
      ]

      const metrics = calculateMetrics(reminders)
      expect(metrics.totalReminders).toBe(2)
      expect(metrics.deliveredCount).toBe(1)
      expect(metrics.failedCount).toBe(1)
    })
  })
})

// =============================================================================
// URGENCY CALCULATOR TESTS
// =============================================================================

describe("Urgency Calculator", () => {
  // ---------------------------------------------------------------------------
  // Factor Calculations
  // ---------------------------------------------------------------------------

  describe("Factor Calculations", () => {
    it("should calculate high deadline factor for overdue task", () => {
      const deadline = new Date(Date.now() - 2 * 3600000) // 2 hours ago
      const factor = calculateDeadlineFactor(deadline, DEFAULT_CONFIG)
      expect(factor).toBeGreaterThan(100)
    })

    it("should calculate 100 for critical deadline", () => {
      const deadline = new Date(Date.now() + 1 * 3600000) // 1 hour from now
      const factor = calculateDeadlineFactor(deadline, DEFAULT_CONFIG)
      expect(factor).toBe(100)
    })

    it("should calculate 0 for no deadline", () => {
      const factor = calculateDeadlineFactor(null, DEFAULT_CONFIG)
      expect(factor).toBe(0)
    })

    it("should calculate priority factor correctly", () => {
      expect(calculatePriorityFactor("urgent")).toBe(100)
      expect(calculatePriorityFactor("high")).toBe(75)
      expect(calculatePriorityFactor("medium")).toBe(40)
      expect(calculatePriorityFactor("low")).toBe(15)
    })

    it("should calculate age factor for old tasks", () => {
      const createdAt = new Date(Date.now() - 30 * 24 * 3600000) // 30 days ago
      const factor = calculateAgeFactor(createdAt)
      expect(factor).toBeGreaterThan(50)
    })

    it("should calculate dependency factor for blocking tasks", () => {
      const factor = calculateDependencyFactor(3, 0) // Blocks 3 tasks
      expect(factor).toBeGreaterThan(30)
    })

    it("should calculate stale factor for inactive tasks", () => {
      const lastActivity = new Date(Date.now() - 72 * 3600000) // 72 hours ago
      const factor = calculateStaleFactor(lastActivity, DEFAULT_CONFIG)
      expect(factor).toBeGreaterThan(0)
    })

    it("should calculate completion factor for recurring tasks", () => {
      const factor = calculateCompletionFactor(0.3) // 30% completion rate
      expect(factor).toBe(70)
    })
  })

  // ---------------------------------------------------------------------------
  // Score Calculation
  // ---------------------------------------------------------------------------

  describe("Score Calculation", () => {
    it("should calculate urgency score for task", () => {
      const task = createTestTaskInput({
        priority: "high",
        deadline: new Date(Date.now() + 12 * 3600000), // 12 hours
      })

      const score = calculateUrgencyScore(task)
      expect(score.totalScore).toBeGreaterThan(50)
      expect(score.level).not.toBe("none")
    })

    it("should return none level for completed task", () => {
      const task = createTestTaskInput({ status: "completed" })
      const score = calculateUrgencyScore(task)

      expect(score.level).toBe("none")
      expect(score.totalScore).toBe(0)
    })

    it("should generate recommendations", () => {
      const task = createTestTaskInput({
        priority: "urgent",
        deadline: new Date(Date.now() - 3600000), // Overdue
      })

      const score = calculateUrgencyScore(task)
      expect(score.recommendations.length).toBeGreaterThan(0)
    })

    it("should convert score to level correctly", () => {
      expect(scoreToLevel(90, DEFAULT_CONFIG)).toBe("critical")
      expect(scoreToLevel(70, DEFAULT_CONFIG)).toBe("high")
      expect(scoreToLevel(50, DEFAULT_CONFIG)).toBe("medium")
      expect(scoreToLevel(30, DEFAULT_CONFIG)).toBe("low")
      expect(scoreToLevel(10, DEFAULT_CONFIG)).toBe("none")
    })
  })

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  describe("Batch Operations", () => {
    it("should calculate batch scores", () => {
      const tasks = [
        createTestTaskInput({ priority: "urgent" }),
        createTestTaskInput({ priority: "low" }),
        createTestTaskInput({ priority: "medium" }),
      ]

      const scores = calculateBatchScores(tasks)
      expect(scores.length).toBe(3)
    })

    it("should sort by urgency descending", () => {
      const tasks = [
        createTestTaskInput({ priority: "low" }),
        createTestTaskInput({ priority: "urgent" }),
        createTestTaskInput({ priority: "medium" }),
      ]

      const scores = calculateBatchScores(tasks)
      const sorted = sortByUrgency(scores)

      expect(sorted[0]!.totalScore).toBeGreaterThanOrEqual(sorted[1]!.totalScore)
      expect(sorted[1]!.totalScore).toBeGreaterThanOrEqual(sorted[2]!.totalScore)
    })

    it("should filter by minimum level", () => {
      const tasks = [
        createTestTaskInput({ priority: "urgent" }),
        createTestTaskInput({ priority: "low" }),
      ]

      const scores = calculateBatchScores(tasks)
      const filtered = filterByLevel(scores, "medium")

      expect(filtered.every((s) => s.level !== "none" && s.level !== "low")).toBe(true)
    })

    it("should get top urgent tasks", () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTestTaskInput({
          priority: i < 3 ? "urgent" : "low",
        })
      )

      const scores = calculateBatchScores(tasks)
      const top = getTopUrgent(scores, 5)

      expect(top.length).toBe(5)
    })
  })

  // ---------------------------------------------------------------------------
  // Distribution Analytics
  // ---------------------------------------------------------------------------

  describe("Distribution Analytics", () => {
    it("should calculate distribution", () => {
      const tasks = [
        createTestTaskInput({ priority: "urgent", deadline: new Date(Date.now() + 3600000) }),
        createTestTaskInput({ priority: "high" }),
        createTestTaskInput({ priority: "medium" }),
        createTestTaskInput({ priority: "low" }),
      ]

      const scores = calculateBatchScores(tasks)
      const distribution = calculateDistribution(scores)

      expect(distribution.average).toBeGreaterThan(0)
    })

    it("should calculate trend", () => {
      const historical = [
        {
          date: new Date(Date.now() - 7 * 24 * 3600000),
          scores: calculateBatchScores([createTestTaskInput({ priority: "high" })]),
        },
        {
          date: new Date(),
          scores: calculateBatchScores([createTestTaskInput({ priority: "urgent" })]),
        },
      ]

      const trend = calculateTrend(historical)
      expect(trend.length).toBe(2)
    })
  })
})

// =============================================================================
// NOTIFICATION OPTIMIZER TESTS
// =============================================================================

describe("Notification Optimizer", () => {
  // ---------------------------------------------------------------------------
  // Time Optimization
  // ---------------------------------------------------------------------------

  describe("Time Optimization", () => {
    it("should detect time within delivery window", () => {
      const window: DeliveryWindow = { start: 9, end: 17, weight: 0.8 }
      const time = new Date()
      time.setHours(12, 0, 0, 0)

      expect(isWithinDeliveryWindow(time, window)).toBe(true)
    })

    it("should detect time outside delivery window", () => {
      const window: DeliveryWindow = { start: 9, end: 17, weight: 0.8 }
      const time = new Date()
      time.setHours(20, 0, 0, 0)

      expect(isWithinDeliveryWindow(time, window)).toBe(false)
    })

    it("should handle overnight windows", () => {
      const window: DeliveryWindow = { start: 22, end: 6, weight: 0.5 }
      const lateNight = new Date()
      lateNight.setHours(23, 0, 0, 0)

      expect(isWithinDeliveryWindow(lateNight, window)).toBe(true)
    })

    it("should get window weight", () => {
      const config = OPTIMIZER_CONFIG
      const morningTime = new Date()
      morningTime.setHours(10, 0, 0, 0)

      const weight = getWindowWeight(morningTime, config)
      expect(weight).toBeGreaterThan(0)
    })

    it("should find next window time", () => {
      const config = OPTIMIZER_CONFIG
      const lateNight = new Date()
      lateNight.setHours(23, 0, 0, 0)

      const nextWindow = getNextWindowTime(lateNight, config)
      expect(nextWindow.getTime()).toBeGreaterThan(lateNight.getTime())
    })
  })

  // ---------------------------------------------------------------------------
  // Engagement-Based Optimization
  // ---------------------------------------------------------------------------

  describe("Engagement Optimization", () => {
    it("should calculate engagement score", () => {
      const time = new Date()
      time.setHours(10, 0, 0, 0)

      const metrics: EngagementMetric[] = [
        {
          userId: "user_1",
          hourOfDay: 10,
          dayOfWeek: time.getDay(),
          openRate: 0.8,
          responseRate: 0.6,
          averageResponseTimeMinutes: 5,
          sampleSize: 100,
        },
      ]

      const score = calculateEngagementScore(time, metrics)
      expect(score).toBeGreaterThan(0.5)
    })

    it("should find best time slot", () => {
      const from = new Date()
      from.setHours(9, 0, 0, 0)
      const to = new Date(from.getTime() + 8 * 3600000)

      const metrics: EngagementMetric[] = [
        {
          userId: "user_1",
          hourOfDay: 10,
          dayOfWeek: from.getDay(),
          openRate: 0.9,
          responseRate: 0.7,
          averageResponseTimeMinutes: 3,
          sampleSize: 50,
        },
      ]

      const { time, score } = findBestTimeSlot(from, to, metrics, OPTIMIZER_CONFIG)
      expect(score).toBeGreaterThan(0)
    })
  })

  // ---------------------------------------------------------------------------
  // User Activity
  // ---------------------------------------------------------------------------

  describe("User Activity", () => {
    it("should detect likely active user", () => {
      const activity = createTestActivity({
        activeHours: [9, 10, 11, 14, 15, 16],
        activeDays: [1, 2, 3, 4, 5],
      })

      const workdayMorning = new Date()
      workdayMorning.setHours(10, 0, 0, 0)
      // Ensure it's a weekday
      while (workdayMorning.getDay() === 0 || workdayMorning.getDay() === 6) {
        workdayMorning.setDate(workdayMorning.getDate() + 1)
      }

      expect(isUserLikelyActive(workdayMorning, activity)).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Batching
  // ---------------------------------------------------------------------------

  describe("Batching", () => {
    it("should create batches from notifications", () => {
      const notifications = Array.from({ length: 8 }, (_, i) =>
        createTestNotification({
          scheduledAt: new Date(Date.now() + i * 60000),
        })
      )

      const batches = createBatches(notifications, OPTIMIZER_CONFIG)
      expect(batches.length).toBeGreaterThan(0)
    })

    it("should not batch urgent notifications", () => {
      const urgent = createTestNotification({
        priority: "urgent",
        scheduledAt: new Date(),
      })

      const normal = createTestNotification({
        priority: "medium",
        scheduledAt: new Date(),
      })

      const batches = createBatches([urgent, normal], OPTIMIZER_CONFIG)

      // Urgent should be in its own batch
      const urgentBatch = batches.find((b) =>
        b.notifications.some((n) => n.priority === "urgent")
      )
      expect(urgentBatch!.notifications.length).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Rate Limiting
  // ---------------------------------------------------------------------------

  describe("Rate Limiting", () => {
    it("should create rate limit state", () => {
      const state = createRateLimitState("user_1")
      expect(state.hourlyCount).toBe(0)
      expect(state.dailyCount).toBe(0)
    })

    it("should allow notification within limits", () => {
      const state = createRateLimitState("user_1")
      const { allowed } = canSendNotification(state, OPTIMIZER_CONFIG)
      expect(allowed).toBe(true)
    })

    it("should block after hourly limit", () => {
      let state = createRateLimitState("user_1")

      // Simulate max hourly notifications
      for (let i = 0; i < OPTIMIZER_CONFIG.maxNotificationsPerHour; i++) {
        state = recordNotificationSent(state)
      }

      const { allowed, reason } = canSendNotification(state, OPTIMIZER_CONFIG)
      expect(allowed).toBe(false)
      expect(reason).toContain("horaire")
    })

    it("should block after daily limit", () => {
      let state = createRateLimitState("user_1")

      // Simulate max daily notifications
      for (let i = 0; i < OPTIMIZER_CONFIG.maxNotificationsPerDay; i++) {
        state = recordNotificationSent(state)
        // Reset hourly to allow more
        if ((i + 1) % OPTIMIZER_CONFIG.maxNotificationsPerHour === 0) {
          state = resetHourlyCount(state)
        }
      }

      const { allowed, reason } = canSendNotification(state, OPTIMIZER_CONFIG)
      expect(allowed).toBe(false)
      expect(reason).toContain("quotidienne")
    })

    it("should reset hourly count", () => {
      let state = createRateLimitState("user_1")
      state = recordNotificationSent(state)
      state = recordNotificationSent(state)

      expect(state.hourlyCount).toBe(2)

      state = resetHourlyCount(state)
      expect(state.hourlyCount).toBe(0)
    })

    it("should reset daily count", () => {
      let state = createRateLimitState("user_1")
      state = recordNotificationSent(state)
      state = recordNotificationSent(state)

      state = resetDailyCount(state)
      expect(state.dailyCount).toBe(0)
      expect(state.hourlyCount).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Channel Selection
  // ---------------------------------------------------------------------------

  describe("Channel Selection", () => {
    it("should select preferred channel", () => {
      const activity = createTestActivity({
        preferredChannels: ["push", "email"],
      })

      const { channel } = selectBestChannel(
        ["push", "email", "sms"],
        activity,
        [],
        OPTIMIZER_CONFIG
      )

      expect(activity.preferredChannels).toContain(channel)
    })
  })

  // ---------------------------------------------------------------------------
  // Full Optimization
  // ---------------------------------------------------------------------------

  describe("Full Optimization", () => {
    it("should optimize notification", () => {
      const notification = createTestNotification({
        scheduledAt: new Date(Date.now() + 3600000),
      })

      const activity = createTestActivity()
      const rateLimit = createRateLimitState(notification.userId)

      const result = optimizeNotification(
        notification,
        activity,
        [],
        rateLimit,
        OPTIMIZER_CONFIG
      )

      expect(result.notification).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it("should not optimize urgent notifications", () => {
      const notification = createTestNotification({
        priority: "urgent",
        scheduledAt: new Date(),
      })

      const activity = createTestActivity()
      const rateLimit = createRateLimitState(notification.userId)

      const result = optimizeNotification(
        notification,
        activity,
        [],
        rateLimit,
        OPTIMIZER_CONFIG
      )

      expect(result.notification.optimizationApplied).toBe(false)
      expect(result.reason).toContain("urgente")
    })

    it("should optimize batch", () => {
      const notifications = [
        createTestNotification({ userId: "user_1" }),
        createTestNotification({ userId: "user_2" }),
      ]

      const activityMap = new Map([
        ["user_1", createTestActivity({ userId: "user_1" })],
        ["user_2", createTestActivity({ userId: "user_2" })],
      ])

      const metricsMap = new Map<string, EngagementMetric[]>()
      const rateLimitMap = new Map([
        ["user_1", createRateLimitState("user_1")],
        ["user_2", createRateLimitState("user_2")],
      ])

      const { results, batches } = optimizeBatch(
        notifications,
        activityMap,
        metricsMap,
        rateLimitMap,
        OPTIMIZER_CONFIG
      )

      expect(results.length).toBe(2)
      expect(batches.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestTask(overrides: Partial<Task> = {}): Task {
  const now = new Date()
  return {
    id: `task_${Date.now()}`,
    title: "Test Task",
    description: null,
    householdId: "household_1",
    assigneeId: null,
    creatorId: "user_1",
    priority: "medium",
    deadline: new Date(Date.now() + 24 * 3600000), // 24 hours from now
    estimatedMinutes: 30,
    isRecurring: false,
    recurringPattern: null,
    status: "pending",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createTestTaskInput(overrides: Partial<TaskInput> = {}): TaskInput {
  const now = new Date()
  return {
    id: `task_${Date.now()}`,
    title: "Test Task",
    priority: "medium",
    deadline: new Date(Date.now() + 24 * 3600000),
    estimatedMinutes: 30,
    assigneeId: null,
    createdAt: now,
    status: "pending",
    dependencyCount: 0,
    blockedTasks: 0,
    lastActivityAt: now,
    completionRate: null,
    ...overrides,
  }
}

function createTestPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    userId: "user_1",
    enableReminders: true,
    channels: ["push", "in_app"],
    quietHours: null,
    timezone: "Europe/Paris",
    language: "fr",
    reminderLeadTimes: {
      deadline: 24,
      recurring: 1,
      checkIn: 48,
    },
    maxRemindersPerDay: 10,
    ...overrides,
  }
}

function createTestNotification(overrides: Partial<Notification> = {}): Notification {
  const now = new Date()
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: "user_1",
    type: "reminder",
    priority: "medium",
    channel: "push",
    content: {
      title: "Test Notification",
      body: "This is a test",
      metadata: {},
    },
    scheduledAt: new Date(Date.now() + 3600000),
    originalScheduledAt: new Date(Date.now() + 3600000),
    batchId: null,
    optimizationApplied: false,
    ...overrides,
  }
}

function createTestActivity(overrides: Partial<UserActivity> = {}): UserActivity {
  return {
    userId: "user_1",
    lastActiveAt: new Date(),
    activeHours: [9, 10, 11, 14, 15, 18, 19],
    activeDays: [1, 2, 3, 4, 5],
    averageSessionMinutes: 15,
    preferredChannels: ["push", "in_app"],
    deviceTypes: ["mobile"],
    ...overrides,
  }
}
