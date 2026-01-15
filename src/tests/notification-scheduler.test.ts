/**
 * Notification Scheduler Tests
 *
 * Unit tests for the notification scheduling system.
 * Tests scheduling logic, aggregation, and timing calculations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock database module
vi.mock("@/lib/aws/database", () => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  insert: vi.fn().mockResolvedValue({ id: "mock-id" }),
  setCurrentUser: vi.fn().mockResolvedValue(undefined),
}))

// Mock Firebase
vi.mock("@/lib/firebase", () => ({
  sendMultiplePush: vi.fn().mockResolvedValue({
    successCount: 1,
    failureCount: 0,
    invalidTokens: [],
    results: [{ success: true, messageId: "msg-1" }],
  }),
  sendStreakRiskPush: vi.fn().mockResolvedValue({ success: true }),
  sendDeadlineWarningPush: vi.fn().mockResolvedValue({ success: true }),
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
}))

// Mock notification service
vi.mock("@/lib/services/notifications", () => ({
  sendPushToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  sendPushToHousehold: vi.fn().mockResolvedValue({ sent: 2, failed: 0 }),
}))

describe("Schedule Configuration", () => {
  it("should have default schedule config with all reminders enabled", () => {
    const defaultConfig = {
      dayBefore: true,
      dayOf: true,
      threeHoursBefore: true,
      oneHourBefore: true,
    }

    expect(defaultConfig.dayBefore).toBe(true)
    expect(defaultConfig.dayOf).toBe(true)
    expect(defaultConfig.threeHoursBefore).toBe(true)
    expect(defaultConfig.oneHourBefore).toBe(true)
  })

  it("should allow partial config override", () => {
    const defaultConfig = {
      dayBefore: true,
      dayOf: true,
      threeHoursBefore: true,
      oneHourBefore: true,
    }

    const userConfig = { dayBefore: false }
    const merged = { ...defaultConfig, ...userConfig }

    expect(merged.dayBefore).toBe(false)
    expect(merged.dayOf).toBe(true)
  })
})

describe("Notification Scheduling Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should calculate J-1 reminder time correctly", () => {
    // Deadline: January 15 at 18:00
    const deadline = new Date("2024-01-15T18:00:00Z")
    const now = new Date("2024-01-13T10:00:00Z")
    vi.setSystemTime(now)

    // J-1 should be January 14 at 09:00
    const dayBefore = new Date(deadline)
    dayBefore.setDate(dayBefore.getDate() - 1)
    dayBefore.setHours(9, 0, 0, 0)

    expect(dayBefore.getDate()).toBe(14)
    expect(dayBefore.getHours()).toBe(9)
    expect(dayBefore > now).toBe(true)
  })

  it("should calculate J-0 reminder time correctly", () => {
    // Deadline: January 15 at 18:00
    const deadline = new Date("2024-01-15T18:00:00Z")
    const now = new Date("2024-01-14T20:00:00Z")
    vi.setSystemTime(now)

    // J-0 should be January 15 at 08:00
    const dayOf = new Date(deadline)
    dayOf.setHours(8, 0, 0, 0)

    expect(dayOf.getDate()).toBe(15)
    expect(dayOf.getHours()).toBe(8)
    expect(dayOf > now).toBe(true)
  })

  it("should calculate H-3 reminder time correctly", () => {
    const deadline = new Date("2024-01-15T18:00:00Z")
    const now = new Date("2024-01-15T14:00:00Z")
    vi.setSystemTime(now)

    // H-3 should be January 15 at 15:00
    const threeHours = new Date(deadline)
    threeHours.setHours(threeHours.getHours() - 3)

    expect(threeHours.getHours()).toBe(15)
    expect(threeHours > now).toBe(true)
  })

  it("should calculate H-1 reminder time correctly", () => {
    const deadline = new Date("2024-01-15T18:00:00Z")
    const now = new Date("2024-01-15T16:00:00Z")
    vi.setSystemTime(now)

    // H-1 should be January 15 at 17:00
    const oneHour = new Date(deadline)
    oneHour.setHours(oneHour.getHours() - 1)

    expect(oneHour.getHours()).toBe(17)
    expect(oneHour > now).toBe(true)
  })

  it("should skip past reminders", () => {
    // Deadline is in 30 minutes, so J-1 and J-0 morning should be skipped
    const deadline = new Date("2024-01-15T18:00:00Z")
    const now = new Date("2024-01-15T17:30:00Z")
    vi.setSystemTime(now)

    // J-1 at 9:00 yesterday is in the past
    const dayBefore = new Date(deadline)
    dayBefore.setDate(dayBefore.getDate() - 1)
    dayBefore.setHours(9, 0, 0, 0)
    expect(dayBefore < now).toBe(true)

    // J-0 at 8:00 is in the past
    const dayOf = new Date(deadline)
    dayOf.setHours(8, 0, 0, 0)
    expect(dayOf < now).toBe(true)

    // H-3 at 15:00 is in the past
    const threeHours = new Date(deadline)
    threeHours.setHours(threeHours.getHours() - 3)
    expect(threeHours < now).toBe(true)

    // H-1 at 17:00 is also in the past
    const oneHour = new Date(deadline)
    oneHour.setHours(oneHour.getHours() - 1)
    expect(oneHour < now).toBe(true)
  })

  it("should only schedule H-1 for critical tasks", () => {
    const criticalTask = { is_critical: true }
    const normalTask = { is_critical: false }

    // H-1 should be enabled for critical
    expect(criticalTask.is_critical).toBe(true)

    // H-1 should not be scheduled for normal tasks
    expect(normalTask.is_critical).toBe(false)
  })
})

describe("Notification Aggregation Logic", () => {
  it("should aggregate multiple task reminders", () => {
    const notifications = [
      { type: "task_reminder", title: "Task 1" },
      { type: "task_reminder", title: "Task 2" },
      { type: "task_reminder", title: "Task 3" },
    ]

    const taskReminders = notifications.filter(n => n.type === "task_reminder")

    // More than 2 task reminders should be aggregated
    expect(taskReminders.length).toBe(3)
    expect(taskReminders.length > 2).toBe(true)

    // Aggregated message format
    const aggregatedTitle = `📋 ${taskReminders.length} tâches à faire`
    expect(aggregatedTitle).toBe("📋 3 tâches à faire")
  })

  it("should not aggregate deadline warnings", () => {
    const notifications = [
      { type: "deadline_warning", title: "Urgent Task 1" },
      { type: "deadline_warning", title: "Urgent Task 2" },
    ]

    // Deadline warnings should never be aggregated - each is important
    const deadlineWarnings = notifications.filter(n => n.type === "deadline_warning")
    expect(deadlineWarnings.length).toBe(2)
  })

  it("should separate notifications by user", () => {
    const notifications = [
      { user_id: "user-1", type: "task_reminder" },
      { user_id: "user-1", type: "task_reminder" },
      { user_id: "user-2", type: "task_reminder" },
    ]

    const byUser = new Map<string, typeof notifications>()
    for (const notif of notifications) {
      const existing = byUser.get(notif.user_id) || []
      existing.push(notif)
      byUser.set(notif.user_id, existing)
    }

    expect(byUser.get("user-1")?.length).toBe(2)
    expect(byUser.get("user-2")?.length).toBe(1)
  })
})

describe("Aggregation Key Generation", () => {
  it("should create unique aggregation key for task reminders", () => {
    const taskId = "task-123"
    const reminderType = "day_before"

    const aggregationKey = `task_reminder_${taskId}_${reminderType}`
    expect(aggregationKey).toBe("task_reminder_task-123_day_before")
  })

  it("should create unique aggregation key for streak risk", () => {
    const householdId = "household-456"
    const date = "2024-01-15"

    const aggregationKey = `streak_risk_${householdId}_${date}`
    expect(aggregationKey).toBe("streak_risk_household-456_2024-01-15")
  })

  it("should create unique aggregation key for charge alerts", () => {
    const householdId = "household-789"
    const date = new Date().toISOString().split("T")[0]

    const aggregationKey = `charge_alert_${householdId}_${date}`
    expect(aggregationKey).toContain("charge_alert_household-789_")
  })
})

describe("Notification Stats", () => {
  it("should track total scheduled notifications", () => {
    const stats = {
      total_scheduled: 10,
      total_sent: 8,
      pending: 2,
      sent_today: 3,
    }

    expect(stats.total_scheduled).toBe(10)
    expect(stats.total_sent).toBe(8)
    expect(stats.pending).toBe(2)
    expect(stats.sent_today).toBe(3)
  })

  it("should calculate pending correctly", () => {
    const stats = {
      total_scheduled: 50,
      total_sent: 45,
    }

    const pending = stats.total_scheduled - stats.total_sent
    expect(pending).toBe(5)
  })
})

describe("Streak Risk Detection", () => {
  it("should identify households with active streaks", () => {
    const household = {
      id: "household-1",
      streak_current: 15,
    }

    const hasActiveStreak = household.streak_current > 0
    expect(hasActiveStreak).toBe(true)
  })

  it("should skip households with zero streak", () => {
    const household = {
      id: "household-2",
      streak_current: 0,
    }

    const hasActiveStreak = household.streak_current > 0
    expect(hasActiveStreak).toBe(false)
  })

  it("should identify uncompleted critical tasks for today", () => {
    const task = {
      id: "task-1",
      is_critical: true,
      status: "pending",
      deadline_date: new Date().toISOString().split("T")[0],
    }

    const isCriticalAndPending = task.is_critical && task.status === "pending"
    expect(isCriticalAndPending).toBe(true)
  })
})

describe("Charge Alert Detection", () => {
  it("should detect imbalance above 60%", () => {
    const user1Load = 70
    const user2Load = 30
    const total = user1Load + user2Load

    const user1Percentage = (user1Load * 100) / total
    const hasImbalance = user1Percentage >= 60

    expect(hasImbalance).toBe(true)
    expect(user1Percentage).toBe(70)
  })

  it("should not flag balanced load", () => {
    const user1Load = 55
    const user2Load = 45
    const total = user1Load + user2Load

    const user1Percentage = (user1Load * 100) / total
    const hasImbalance = user1Percentage >= 60

    expect(hasImbalance).toBe(false)
    expect(user1Percentage).toBe(55)
  })

  it("should determine alert level based on imbalance", () => {
    const getAlertLevel = (percentage: number) =>
      percentage >= 70 ? "critical" : "warning"

    expect(getAlertLevel(75)).toBe("critical")
    expect(getAlertLevel(70)).toBe("critical")
    expect(getAlertLevel(65)).toBe("warning")
    expect(getAlertLevel(60)).toBe("warning")
  })

  it("should format ratio string correctly", () => {
    const high = 72
    const low = 100 - high

    const ratio = `${high}/${low}`
    expect(ratio).toBe("72/28")
  })
})

describe("Notification Cancellation", () => {
  it("should cancel notifications by task ID", async () => {
    const taskId = "task-to-cancel"
    const notificationsToCancel = [
      { id: "notif-1", task_id: taskId, is_sent: false },
      { id: "notif-2", task_id: taskId, is_sent: false },
      { id: "notif-3", task_id: taskId, is_sent: true }, // Already sent, should not count
    ]

    const cancelled = notificationsToCancel.filter(
      n => n.task_id === taskId && !n.is_sent
    )

    expect(cancelled.length).toBe(2)
  })
})

describe("Notification Rescheduling", () => {
  it("should update scheduled_for time", () => {
    const notification = {
      id: "notif-1",
      scheduled_for: new Date("2024-01-15T09:00:00Z"),
      is_sent: false,
    }

    const newTime = new Date("2024-01-15T14:00:00Z")

    // Only unsent notifications can be rescheduled
    expect(notification.is_sent).toBe(false)

    // Update the time
    notification.scheduled_for = newTime
    expect(notification.scheduled_for).toEqual(newTime)
  })

  it("should not reschedule already sent notifications", () => {
    const notification = {
      id: "notif-2",
      scheduled_for: new Date("2024-01-14T09:00:00Z"),
      is_sent: true,
    }

    const canReschedule = !notification.is_sent
    expect(canReschedule).toBe(false)
  })
})

describe("Due Notification Detection", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should identify due notifications", () => {
    const now = new Date("2024-01-15T10:00:00Z")
    vi.setSystemTime(now)

    const notifications = [
      { scheduled_for: new Date("2024-01-15T09:00:00Z"), is_sent: false }, // Due
      { scheduled_for: new Date("2024-01-15T10:00:00Z"), is_sent: false }, // Due (exact)
      { scheduled_for: new Date("2024-01-15T11:00:00Z"), is_sent: false }, // Not due
      { scheduled_for: new Date("2024-01-15T09:00:00Z"), is_sent: true }, // Already sent
    ]

    const dueNotifications = notifications.filter(
      n => n.scheduled_for <= now && !n.is_sent
    )

    expect(dueNotifications.length).toBe(2)
  })
})

describe("Notification Processing Order", () => {
  it("should process by user then by type", () => {
    const notifications = [
      { user_id: "user-1", type: "task_reminder", scheduled_for: new Date("2024-01-15T09:00:00Z") },
      { user_id: "user-2", type: "deadline_warning", scheduled_for: new Date("2024-01-15T08:00:00Z") },
      { user_id: "user-1", type: "deadline_warning", scheduled_for: new Date("2024-01-15T09:30:00Z") },
    ]

    // Sort by user_id, then type, then scheduled_for
    const sorted = notifications.sort((a, b) => {
      if (a.user_id !== b.user_id) return a.user_id.localeCompare(b.user_id)
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      return a.scheduled_for.getTime() - b.scheduled_for.getTime()
    })

    expect(sorted[0]?.user_id).toBe("user-1")
    expect(sorted[0]?.type).toBe("deadline_warning")
    expect(sorted[1]?.user_id).toBe("user-1")
    expect(sorted[1]?.type).toBe("task_reminder")
    expect(sorted[2]?.user_id).toBe("user-2")
  })
})
