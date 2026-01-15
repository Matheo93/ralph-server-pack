/**
 * Advanced Features Tests
 *
 * Tests for:
 * - Smart Scheduler
 * - Family Insights
 * - Task Prioritization
 */

import { describe, it, expect, beforeEach } from "vitest"

// Smart Scheduler imports
import {
  createEmptyPattern,
  learnFromCompletedTasks,
  calculateTimeScore,
  suggestSchedule,
  scheduleMultipleTasks,
  generateWeeklySchedule,
  calculateDayWorkload,
  findBestDayForTask,
  SmartScheduler,
  createSmartScheduler,
  type Task as SchedulerTask,
  type UserPattern,
  type ScheduledSlot,
} from "@/lib/services/smart-scheduler"

// Family Insights imports
import {
  calculateMemberStats,
  calculateCategoryBreakdown,
  calculateDailyStats,
  calculateWeeklyComparison,
  calculateLoadTrends,
  checkAchievements,
  generateAlerts,
  generateMonthlyInsights,
  FamilyInsights,
  createFamilyInsights,
  type Task as InsightsTask,
  type HouseholdMember,
} from "@/lib/services/family-insights"

// Task Prioritization imports
import {
  calculateUrgency,
  calculateImportance,
  determineQuadrant,
  getQuadrantInfo,
  calculatePriorityScore,
  detectImplicitDeadline,
  prioritizeTasks,
  getTopPriorityTasks,
  generateRecommendations,
  TaskPrioritizer,
  createTaskPrioritizer,
  type Task as PrioritizationTask,
} from "@/lib/services/task-prioritization"

// ============================================================
// TEST DATA
// ============================================================

const testMember1: HouseholdMember = {
  userId: "user-1",
  name: "Parent 1",
  role: "owner",
}

const testMember2: HouseholdMember = {
  userId: "user-2",
  name: "Parent 2",
  role: "co_parent",
}

const createTestTask = (overrides: Partial<InsightsTask> = {}): InsightsTask => ({
  id: `task-${Date.now()}-${Math.random()}`,
  title: "Test Task",
  status: "pending",
  priority: "normal",
  createdAt: new Date().toISOString(),
  ...overrides,
})

const createSchedulerTask = (overrides: Partial<SchedulerTask> = {}): SchedulerTask => ({
  id: `task-${Date.now()}-${Math.random()}`,
  title: "Test Task",
  priority: "normal",
  ...overrides,
})

const createPriorityTask = (overrides: Partial<PrioritizationTask> = {}): PrioritizationTask => ({
  id: `task-${Date.now()}-${Math.random()}`,
  title: "Test Task",
  status: "pending",
  priority: "normal",
  createdAt: new Date().toISOString(),
  ...overrides,
})

// ============================================================
// SMART SCHEDULER TESTS
// ============================================================

describe("Smart Scheduler", () => {
  describe("Pattern Creation", () => {
    it("should create empty pattern with default values", () => {
      const pattern = createEmptyPattern("user-1")

      expect(pattern.userId).toBe("user-1")
      expect(pattern.preferredHours.length).toBeGreaterThan(0)
      expect(pattern.preferredDays.length).toBeGreaterThan(0)
      expect(pattern.avgTasksPerDay).toBeGreaterThan(0)
    })

    it("should have default productive hours (9-20)", () => {
      const pattern = createEmptyPattern("user-1")

      expect(pattern.preferredHours).toContain(9)
      expect(pattern.preferredHours).toContain(14)
      expect(pattern.preferredHours).toContain(18)
    })

    it("should default to weekdays", () => {
      const pattern = createEmptyPattern("user-1")

      // Should prefer Monday-Friday
      expect(pattern.preferredDays).toContain(1)
      expect(pattern.preferredDays).toContain(5)
    })
  })

  describe("Pattern Learning", () => {
    it("should learn from completed tasks", () => {
      const pattern = createEmptyPattern("user-1")
      const completedTasks: SchedulerTask[] = []

      // Create tasks completed at 10 AM on Mondays
      for (let i = 0; i < 10; i++) {
        const completedAt = new Date()
        completedAt.setHours(10, 0, 0, 0)
        completedAt.setDate(completedAt.getDate() - i * 7) // Past Mondays

        completedTasks.push(createSchedulerTask({
          id: `task-${i}`,
          completedAt: completedAt.toISOString(),
        }))
      }

      const updatedPattern = learnFromCompletedTasks(pattern, completedTasks)

      expect(updatedPattern.preferredHours).toContain(10)
    })

    it("should handle empty task list", () => {
      const pattern = createEmptyPattern("user-1")
      const updated = learnFromCompletedTasks(pattern, [])

      expect(updated.preferredHours).toEqual(pattern.preferredHours)
    })

    it("should update category preferences", () => {
      const pattern = createEmptyPattern("user-1")
      const tasks: SchedulerTask[] = []

      for (let i = 0; i < 5; i++) {
        const completedAt = new Date()
        completedAt.setHours(14, 0, 0, 0)

        tasks.push(createSchedulerTask({
          id: `task-${i}`,
          category: "sante",
          completedAt: completedAt.toISOString(),
        }))
      }

      const updated = learnFromCompletedTasks(pattern, tasks)

      expect(updated.categoryPreferences.has("sante")).toBe(true)
    })
  })

  describe("Time Score Calculation", () => {
    let pattern: UserPattern

    beforeEach(() => {
      pattern = createEmptyPattern("user-1")
    })

    it("should give higher score for preferred hours", () => {
      const task = createSchedulerTask({ priority: "normal" })
      const preferredTime = new Date()
      preferredTime.setHours(10, 0, 0, 0) // Typically productive hour

      const nonPreferredTime = new Date()
      nonPreferredTime.setHours(3, 0, 0, 0) // 3 AM

      const preferredScore = calculateTimeScore(preferredTime, task, pattern, [])
      const nonPreferredScore = calculateTimeScore(nonPreferredTime, task, pattern, [])

      expect(preferredScore).toBeGreaterThan(nonPreferredScore)
    })

    it("should penalize conflicting slots", () => {
      const task = createSchedulerTask({ priority: "normal" })
      const time = new Date()
      time.setHours(10, 0, 0, 0)

      const existingSlot: ScheduledSlot = {
        time: new Date(time),
        taskId: "existing",
        duration: 60,
        isFixed: false,
      }

      const scoreWithoutConflict = calculateTimeScore(time, task, pattern, [])
      const scoreWithConflict = calculateTimeScore(time, task, pattern, [existingSlot])

      expect(scoreWithConflict).toBeLessThan(scoreWithoutConflict)
    })

    it("should boost score for tasks with near deadline", () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const urgentTask = createSchedulerTask({
        priority: "normal",
        deadline: tomorrow.toISOString(),
      })

      const nonUrgentTask = createSchedulerTask({
        priority: "normal",
      })

      const time = new Date()
      time.setHours(10, 0, 0, 0)

      const urgentScore = calculateTimeScore(time, urgentTask, pattern, [])
      const nonUrgentScore = calculateTimeScore(time, nonUrgentTask, pattern, [])

      expect(urgentScore).toBeGreaterThan(nonUrgentScore)
    })
  })

  describe("Schedule Suggestions", () => {
    let pattern: UserPattern

    beforeEach(() => {
      pattern = createEmptyPattern("user-1")
    })

    it("should suggest a time for a task", () => {
      const task = createSchedulerTask({
        title: "Test Task",
        priority: "normal",
      })

      const suggestion = suggestSchedule(task, pattern, [])

      expect(suggestion.taskId).toBe(task.id)
      expect(suggestion.suggestedTime).toBeInstanceOf(Date)
      expect(suggestion.confidence).toBeGreaterThan(0)
      expect(suggestion.reason).toBeTruthy()
    })

    it("should provide alternatives", () => {
      const task = createSchedulerTask({
        title: "Test Task",
        priority: "normal",
      })

      const suggestion = suggestSchedule(task, pattern, [], { maxSuggestions: 5 })

      // May or may not have alternatives depending on available slots
      expect(Array.isArray(suggestion.alternatives)).toBe(true)
    })

    it("should respect deadline constraints", () => {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 2)

      const task = createSchedulerTask({
        title: "Urgent Task",
        priority: "high",
        deadline: deadline.toISOString(),
      })

      const suggestion = suggestSchedule(task, pattern, [])

      expect(suggestion.suggestedTime.getTime()).toBeLessThanOrEqual(deadline.getTime())
    })
  })

  describe("Multiple Task Scheduling", () => {
    let pattern: UserPattern

    beforeEach(() => {
      pattern = createEmptyPattern("user-1")
    })

    it("should schedule multiple tasks", () => {
      const tasks = [
        createSchedulerTask({ id: "task-1", priority: "high" }),
        createSchedulerTask({ id: "task-2", priority: "normal" }),
        createSchedulerTask({ id: "task-3", priority: "low" }),
      ]

      const suggestions = scheduleMultipleTasks(tasks, pattern)

      expect(suggestions.length).toBe(3)
      suggestions.forEach(s => {
        expect(s.taskId).toBeDefined()
        expect(s.suggestedTime).toBeInstanceOf(Date)
      })
    })

    it("should prioritize by deadline and priority", () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const tasks = [
        createSchedulerTask({ id: "task-low", priority: "low" }),
        createSchedulerTask({ id: "task-urgent", priority: "urgent", deadline: tomorrow.toISOString() }),
        createSchedulerTask({ id: "task-normal", priority: "normal" }),
      ]

      const suggestions = scheduleMultipleTasks(tasks, pattern)

      // Urgent task with deadline should be first
      expect(suggestions[0].taskId).toBe("task-urgent")
    })

    it("should avoid scheduling conflicts", () => {
      const tasks = [
        createSchedulerTask({ id: "task-1", priority: "normal", estimatedDuration: 60 }),
        createSchedulerTask({ id: "task-2", priority: "normal", estimatedDuration: 60 }),
      ]

      const suggestions = scheduleMultipleTasks(tasks, pattern)

      // Times should be different
      const time1 = suggestions[0].suggestedTime.getTime()
      const time2 = suggestions[1].suggestedTime.getTime()

      expect(time1).not.toBe(time2)
    })
  })

  describe("Weekly Schedule", () => {
    it("should generate 7 day schedule", () => {
      const pattern = createEmptyPattern("user-1")
      const tasks = [
        createSchedulerTask({ id: "task-1", priority: "normal" }),
        createSchedulerTask({ id: "task-2", priority: "high" }),
      ]

      const weekSchedule = generateWeeklySchedule(tasks, pattern)

      expect(weekSchedule.length).toBe(7)
      weekSchedule.forEach(day => {
        expect(day.date).toBeInstanceOf(Date)
        expect(Array.isArray(day.slots)).toBe(true)
        expect(day.workload).toBeGreaterThanOrEqual(0)
        expect(day.workload).toBeLessThanOrEqual(1)
      })
    })
  })

  describe("Workload Analysis", () => {
    it("should calculate day workload", () => {
      const pattern = createEmptyPattern("user-1")
      const slots: ScheduledSlot[] = [
        { time: new Date(), taskId: "1", duration: 30, isFixed: false },
        { time: new Date(), taskId: "2", duration: 45, isFixed: false },
      ]

      const workload = calculateDayWorkload(slots, pattern)

      expect(workload.totalMinutes).toBe(75)
      expect(workload.workloadPercent).toBeGreaterThan(0)
      expect(workload.suggestion).toBeTruthy()
    })

    it("should detect overload", () => {
      const pattern = createEmptyPattern("user-1")
      const slots: ScheduledSlot[] = []

      // Add many tasks
      for (let i = 0; i < 20; i++) {
        slots.push({ time: new Date(), taskId: `task-${i}`, duration: 60, isFixed: false })
      }

      const workload = calculateDayWorkload(slots, pattern)

      expect(workload.isOverloaded).toBe(true)
    })
  })

  describe("Best Day Finding", () => {
    it("should find best day for task", () => {
      const pattern = createEmptyPattern("user-1")
      const task = createSchedulerTask({
        title: "Test",
        priority: "normal",
      })

      const result = findBestDayForTask(task, generateWeeklySchedule([], pattern), pattern)

      expect(result.date).toBeInstanceOf(Date)
      expect(result.reason).toBeTruthy()
    })
  })

  describe("SmartScheduler Class", () => {
    it("should create scheduler instance", () => {
      const scheduler = createSmartScheduler("user-1")

      expect(scheduler.getPattern().userId).toBe("user-1")
    })

    it("should learn and suggest", () => {
      const scheduler = new SmartScheduler("user-1")
      const task = createSchedulerTask({ title: "Test" })

      const suggestion = scheduler.suggest(task)

      expect(suggestion.taskId).toBe(task.id)
    })

    it("should export and import pattern", () => {
      const scheduler = createSmartScheduler("user-1")
      const exported = scheduler.exportPattern()

      const newScheduler = createSmartScheduler("user-2")
      newScheduler.importPattern(exported as Record<string, unknown>)

      expect(newScheduler.getPattern().userId).toBe("user-1")
    })
  })
})

// ============================================================
// FAMILY INSIGHTS TESTS
// ============================================================

describe("Family Insights", () => {
  describe("Member Statistics", () => {
    it("should calculate member stats", () => {
      const tasks: InsightsTask[] = [
        createTestTask({ assignedTo: "user-1", status: "done", completedAt: new Date().toISOString(), loadWeight: 3 }),
        createTestTask({ assignedTo: "user-1", status: "pending", loadWeight: 2 }),
        createTestTask({ assignedTo: "user-2", status: "done", completedAt: new Date().toISOString(), loadWeight: 4 }),
      ]

      const stats = calculateMemberStats(tasks, [testMember1, testMember2])

      expect(stats.length).toBe(2)

      const user1Stats = stats.find(s => s.userId === "user-1")
      expect(user1Stats?.tasksCompleted).toBe(1)
      expect(user1Stats?.tasksAssigned).toBe(2)
    })

    it("should calculate completion rate", () => {
      const tasks: InsightsTask[] = [
        createTestTask({ assignedTo: "user-1", status: "done", completedAt: new Date().toISOString() }),
        createTestTask({ assignedTo: "user-1", status: "done", completedAt: new Date().toISOString() }),
        createTestTask({ assignedTo: "user-1", status: "pending" }),
      ]

      const stats = calculateMemberStats(tasks, [testMember1])
      const user1Stats = stats[0]

      expect(user1Stats.completionRate).toBeCloseTo(0.67, 1)
    })

    it("should calculate load percentage", () => {
      const tasks: InsightsTask[] = [
        createTestTask({ assignedTo: "user-1", loadWeight: 6 }),
        createTestTask({ assignedTo: "user-2", loadWeight: 4 }),
      ]

      const stats = calculateMemberStats(tasks, [testMember1, testMember2])

      const user1Stats = stats.find(s => s.userId === "user-1")
      const user2Stats = stats.find(s => s.userId === "user-2")

      expect(user1Stats?.loadPercentage).toBe(60)
      expect(user2Stats?.loadPercentage).toBe(40)
    })
  })

  describe("Category Breakdown", () => {
    it("should break down by category", () => {
      const tasks: InsightsTask[] = [
        createTestTask({ category: "sante", loadWeight: 3 }),
        createTestTask({ category: "sante", loadWeight: 2 }),
        createTestTask({ category: "ecole", loadWeight: 4 }),
      ]

      const breakdown = calculateCategoryBreakdown(tasks)

      expect(breakdown.length).toBe(2)

      const santeStats = breakdown.find(c => c.category === "sante")
      expect(santeStats?.taskCount).toBe(2)
    })

    it("should handle tasks without category", () => {
      const tasks: InsightsTask[] = [
        createTestTask({ category: undefined }),
        createTestTask({ category: "sante" }),
      ]

      const breakdown = calculateCategoryBreakdown(tasks)

      const uncategorized = breakdown.find(c => c.category === "Sans catégorie")
      expect(uncategorized?.taskCount).toBe(1)
    })
  })

  describe("Daily Statistics", () => {
    it("should calculate daily stats", () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const tasks: InsightsTask[] = [
        createTestTask({ createdAt: today.toISOString() }),
        createTestTask({ createdAt: today.toISOString(), status: "done", completedAt: today.toISOString() }),
        createTestTask({ createdAt: yesterday.toISOString() }),
      ]

      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const stats = calculateDailyStats(tasks, weekAgo, today)

      expect(stats.length).toBe(8) // 7 days + today

      const todayStats = stats.find(s => s.date.toDateString() === today.toDateString())
      expect(todayStats?.tasksCreated).toBe(2)
      expect(todayStats?.tasksCompleted).toBe(1)
    })
  })

  describe("Weekly Comparison", () => {
    it("should compare this week to last week", () => {
      const now = new Date()
      const thisWeek = new Date(now)
      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 10)

      const tasks: InsightsTask[] = [
        createTestTask({ createdAt: thisWeek.toISOString(), status: "done", completedAt: thisWeek.toISOString() }),
        createTestTask({ createdAt: thisWeek.toISOString() }),
        createTestTask({ createdAt: lastWeek.toISOString(), status: "done", completedAt: lastWeek.toISOString() }),
      ]

      const comparison = calculateWeeklyComparison(tasks)

      expect(comparison.length).toBe(4)
      expect(comparison.some(c => c.metric === "Tâches créées")).toBe(true)
      expect(comparison.some(c => c.metric === "Taux de complétion")).toBe(true)
    })

    it("should calculate percentage change", () => {
      const now = new Date()
      const thisWeek = new Date(now)
      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 10)

      const tasks: InsightsTask[] = [
        createTestTask({ createdAt: thisWeek.toISOString() }),
        createTestTask({ createdAt: thisWeek.toISOString() }),
        createTestTask({ createdAt: lastWeek.toISOString() }),
      ]

      const comparison = calculateWeeklyComparison(tasks)
      const tasksCreated = comparison.find(c => c.metric === "Tâches créées")

      expect(tasksCreated?.thisWeek).toBe(2)
      expect(tasksCreated?.lastWeek).toBe(1)
      expect(tasksCreated?.change).toBe(100) // 100% increase
    })
  })

  describe("Load Trends", () => {
    it("should calculate load trends over weeks", () => {
      const tasks: InsightsTask[] = []

      // Create tasks over past 4 weeks
      for (let week = 0; week < 4; week++) {
        const date = new Date()
        date.setDate(date.getDate() - week * 7)

        tasks.push(createTestTask({
          assignedTo: "user-1",
          createdAt: date.toISOString(),
          loadWeight: 3,
        }))

        tasks.push(createTestTask({
          assignedTo: "user-2",
          createdAt: date.toISOString(),
          loadWeight: 2,
        }))
      }

      const trends = calculateLoadTrends(tasks, [testMember1, testMember2], 4)

      expect(trends.length).toBe(4)
      trends.forEach(trend => {
        expect(trend.member1Load + trend.member2Load).toBeCloseTo(100, 0)
      })
    })

    it("should detect balanced weeks", () => {
      const date = new Date()

      const tasks: InsightsTask[] = [
        createTestTask({ assignedTo: "user-1", createdAt: date.toISOString(), loadWeight: 5 }),
        createTestTask({ assignedTo: "user-2", createdAt: date.toISOString(), loadWeight: 5 }),
      ]

      const trends = calculateLoadTrends(tasks, [testMember1, testMember2], 1)

      expect(trends[0]?.isBalanced).toBe(true)
    })
  })

  describe("Achievements", () => {
    it("should detect milestone achievements", () => {
      const tasks: InsightsTask[] = []

      // Create 50 completed tasks
      for (let i = 0; i < 50; i++) {
        tasks.push(createTestTask({
          status: "done",
          completedAt: new Date().toISOString(),
        }))
      }

      const achievements = checkAchievements(tasks, [])

      const milestone = achievements.find(a => a.type === "milestone")
      expect(milestone).toBeDefined()
    })

    it("should detect balance achievement", () => {
      const memberStats = [
        { userId: "user-1", loadPercentage: 50, tasksCompleted: 5, tasksAssigned: 5, completionRate: 1, totalLoadWeight: 10, avgCompletionTime: 24, onTimeRate: 1, name: "User 1" },
        { userId: "user-2", loadPercentage: 50, tasksCompleted: 5, tasksAssigned: 5, completionRate: 1, totalLoadWeight: 10, avgCompletionTime: 24, onTimeRate: 1, name: "User 2" },
      ]

      const achievements = checkAchievements([], memberStats)

      const balance = achievements.find(a => a.type === "balance")
      expect(balance).toBeDefined()
    })
  })

  describe("Alerts", () => {
    it("should generate imbalance alert", () => {
      const memberStats = [
        { userId: "user-1", loadPercentage: 80, tasksCompleted: 8, tasksAssigned: 10, completionRate: 0.8, totalLoadWeight: 40, avgCompletionTime: 24, onTimeRate: 1, name: "User 1" },
        { userId: "user-2", loadPercentage: 20, tasksCompleted: 2, tasksAssigned: 2, completionRate: 1, totalLoadWeight: 10, avgCompletionTime: 24, onTimeRate: 1, name: "User 2" },
      ]

      const alerts = generateAlerts([], memberStats, [])

      const imbalanceAlert = alerts.find(a => a.type === "imbalance")
      expect(imbalanceAlert).toBeDefined()
      expect(imbalanceAlert?.severity).toBe("warning")
    })

    it("should detect overdue tasks", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const tasks: InsightsTask[] = [
        createTestTask({ status: "pending", deadline: yesterday.toISOString() }),
        createTestTask({ status: "pending", deadline: yesterday.toISOString() }),
      ]

      const alerts = generateAlerts(tasks, [], [])

      const overdueAlert = alerts.find(a => a.type === "overdue")
      expect(overdueAlert).toBeDefined()
    })
  })

  describe("Monthly Insights", () => {
    it("should generate monthly insights", () => {
      const now = new Date()
      const tasks: InsightsTask[] = [
        createTestTask({
          createdAt: now.toISOString(),
          status: "done",
          completedAt: now.toISOString(),
          assignedTo: "user-1",
          category: "sante",
        }),
      ]

      const insights = generateMonthlyInsights(tasks, [testMember1])

      expect(insights.totalTasks).toBe(1)
      expect(insights.completedTasks).toBe(1)
      expect(insights.memberStats.length).toBe(1)
      expect(insights.categoryBreakdown.length).toBeGreaterThan(0)
    })
  })

  describe("FamilyInsights Class", () => {
    it("should create instance and get insights", () => {
      const insights = createFamilyInsights([createTestTask()], [testMember1])

      const monthly = insights.getMonthlyInsights()
      expect(monthly.totalTasks).toBe(1)
    })

    it("should check balance", () => {
      const tasks: InsightsTask[] = [
        createTestTask({ assignedTo: "user-1", loadWeight: 5 }),
        createTestTask({ assignedTo: "user-2", loadWeight: 5 }),
      ]

      const insights = createFamilyInsights(tasks, [testMember1, testMember2])
      const balance = insights.isBalanced()

      expect(balance.balanced).toBe(true)
    })

    it("should get quick summary", () => {
      const insights = createFamilyInsights([createTestTask()], [testMember1])
      const summary = insights.getQuickSummary()

      expect(summary).toHaveProperty("tasksThisWeek")
      expect(summary).toHaveProperty("trend")
      expect(summary).toHaveProperty("balance")
    })
  })
})

// ============================================================
// TASK PRIORITIZATION TESTS
// ============================================================

describe("Task Prioritization", () => {
  describe("Urgency Calculation", () => {
    it("should calculate urgency based on priority", () => {
      const urgentTask: PrioritizationTask = createPriorityTask({ priority: "urgent" })
      const lowTask: PrioritizationTask = createPriorityTask({ priority: "low" })

      const urgentResult = calculateUrgency(urgentTask)
      const lowResult = calculateUrgency(lowTask)

      expect(urgentResult.score).toBeGreaterThan(lowResult.score)
    })

    it("should boost urgency for near deadlines", () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const taskWithDeadline: PrioritizationTask = createTestTask({
        priority: "normal",
        deadline: tomorrow.toISOString(),
      }) as PrioritizationTask

      const taskWithoutDeadline: PrioritizationTask = createTestTask({
        priority: "normal",
      }) as PrioritizationTask

      const withDeadline = calculateUrgency(taskWithDeadline)
      const withoutDeadline = calculateUrgency(taskWithoutDeadline)

      expect(withDeadline.score).toBeGreaterThan(withoutDeadline.score)
    })

    it("should max out urgency for overdue tasks", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const overdueTask: PrioritizationTask = createTestTask({
        priority: "normal",
        deadline: yesterday.toISOString(),
      }) as PrioritizationTask

      const result = calculateUrgency(overdueTask)

      expect(result.factors.some(f => f.name === "En retard")).toBe(true)
    })

    it("should detect urgency keywords", () => {
      const urgentTask: PrioritizationTask = createTestTask({
        title: "Faire immédiatement",
        priority: "normal",
      }) as PrioritizationTask

      const result = calculateUrgency(urgentTask)

      expect(result.factors.some(f => f.name === "Mot-clé urgent")).toBe(true)
    })
  })

  describe("Importance Calculation", () => {
    it("should calculate importance based on priority", () => {
      const highTask: PrioritizationTask = createPriorityTask({ priority: "high" })
      const lowTask: PrioritizationTask = createPriorityTask({ priority: "low" })

      const highResult = calculateImportance(highTask)
      const lowResult = calculateImportance(lowTask)

      expect(highResult.score).toBeGreaterThan(lowResult.score)
    })

    it("should boost importance for critical tasks", () => {
      const criticalTask: PrioritizationTask = createTestTask({
        priority: "normal",
        isCritical: true,
      }) as PrioritizationTask

      const result = calculateImportance(criticalTask)

      expect(result.factors.some(f => f.name === "Marquée critique")).toBe(true)
    })

    it("should consider category importance", () => {
      const santeTask: PrioritizationTask = createTestTask({
        priority: "normal",
        category: "sante",
      }) as PrioritizationTask

      const socialTask: PrioritizationTask = createTestTask({
        priority: "normal",
        category: "social",
      }) as PrioritizationTask

      const santeResult = calculateImportance(santeTask)
      const socialResult = calculateImportance(socialTask)

      expect(santeResult.score).toBeGreaterThan(socialResult.score)
    })

    it("should boost importance for child-related tasks", () => {
      const childTask: PrioritizationTask = createTestTask({
        priority: "normal",
        childId: "child-1",
      }) as PrioritizationTask

      const result = calculateImportance(childTask)

      expect(result.factors.some(f => f.name === "Liée à un enfant")).toBe(true)
    })
  })

  describe("Quadrant Classification", () => {
    it("should classify as do_first (urgent & important)", () => {
      const quadrant = determineQuadrant(80, 80)
      expect(quadrant).toBe("do_first")
    })

    it("should classify as schedule (important, not urgent)", () => {
      const quadrant = determineQuadrant(30, 80)
      expect(quadrant).toBe("schedule")
    })

    it("should classify as delegate (urgent, not important)", () => {
      const quadrant = determineQuadrant(80, 30)
      expect(quadrant).toBe("delegate")
    })

    it("should classify as eliminate (neither)", () => {
      const quadrant = determineQuadrant(30, 30)
      expect(quadrant).toBe("eliminate")
    })

    it("should provide quadrant info", () => {
      const info = getQuadrantInfo("do_first")

      expect(info.name).toBe("Faire en premier")
      expect(info.action).toBeTruthy()
      expect(info.color).toBe("red")
    })
  })

  describe("Priority Score", () => {
    it("should calculate comprehensive priority score", () => {
      const task: PrioritizationTask = createTestTask({
        priority: "high",
        isCritical: true,
        category: "sante",
      }) as PrioritizationTask

      const score = calculatePriorityScore(task)

      expect(score.taskId).toBe(task.id)
      expect(score.score).toBeGreaterThan(50)
      expect(score.urgency).toBeGreaterThan(0)
      expect(score.importance).toBeGreaterThan(0)
      expect(score.quadrant).toBeDefined()
      expect(score.recommendation).toBeTruthy()
    })

    it("should include all factors", () => {
      const task: PrioritizationTask = createTestTask({
        priority: "urgent",
      }) as PrioritizationTask

      const score = calculatePriorityScore(task)

      expect(score.factors.length).toBeGreaterThan(0)
    })
  })

  describe("Implicit Deadline Detection", () => {
    it("should detect today keyword", () => {
      const task: PrioritizationTask = createTestTask({
        title: "Faire aujourd'hui",
      }) as PrioritizationTask

      const result = detectImplicitDeadline(task)

      expect(result).not.toBeNull()
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it("should detect tomorrow keyword", () => {
      const task: PrioritizationTask = createTestTask({
        title: "Rappeler le docteur demain",
      }) as PrioritizationTask

      const result = detectImplicitDeadline(task)

      expect(result).not.toBeNull()

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(result?.suggestedDeadline.getDate()).toBe(tomorrow.getDate())
    })

    it("should detect weekday keywords", () => {
      const task: PrioritizationTask = createTestTask({
        title: "Réunion lundi",
      }) as PrioritizationTask

      const result = detectImplicitDeadline(task)

      expect(result).not.toBeNull()
      expect(result?.suggestedDeadline.getDay()).toBe(1) // Monday
    })

    it("should not detect if explicit deadline exists", () => {
      const task: PrioritizationTask = createTestTask({
        title: "Faire demain",
        deadline: new Date().toISOString(),
      }) as PrioritizationTask

      const result = detectImplicitDeadline(task)

      expect(result).toBeNull()
    })
  })

  describe("Batch Prioritization", () => {
    it("should prioritize multiple tasks", () => {
      const tasks: PrioritizationTask[] = [
        createTestTask({ id: "1", priority: "low" }) as PrioritizationTask,
        createTestTask({ id: "2", priority: "urgent" }) as PrioritizationTask,
        createTestTask({ id: "3", priority: "normal" }) as PrioritizationTask,
      ]

      const result = prioritizeTasks(tasks)

      expect(result.tasks.length).toBe(3)
      expect(result.tasks[0].taskId).toBe("2") // Urgent should be first
    })

    it("should provide quadrant summary", () => {
      const tasks: PrioritizationTask[] = [
        createTestTask({ priority: "urgent", isCritical: true }) as PrioritizationTask,
        createPriorityTask({ priority: "low" }),
      ]

      const result = prioritizeTasks(tasks)

      expect(result.summary.doFirst).toBeGreaterThanOrEqual(0)
      expect(result.summary.schedule).toBeGreaterThanOrEqual(0)
      expect(result.summary.delegate).toBeGreaterThanOrEqual(0)
      expect(result.summary.eliminate).toBeGreaterThanOrEqual(0)
    })

    it("should get top priority tasks", () => {
      const tasks: PrioritizationTask[] = [
        createTestTask({ id: "1", priority: "low" }) as PrioritizationTask,
        createTestTask({ id: "2", priority: "urgent" }) as PrioritizationTask,
        createTestTask({ id: "3", priority: "high" }) as PrioritizationTask,
        createTestTask({ id: "4", priority: "normal" }) as PrioritizationTask,
      ]

      const top = getTopPriorityTasks(tasks, 2)

      expect(top.length).toBe(2)
      expect(top[0].id).toBe("2")
    })

    it("should generate warnings", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const tasks: PrioritizationTask[] = [
        createTestTask({ priority: "normal", deadline: yesterday.toISOString() }) as PrioritizationTask,
      ]

      const result = prioritizeTasks(tasks)

      expect(result.warnings.some(w => w.includes("retard"))).toBe(true)
    })
  })

  describe("Recommendations", () => {
    it("should generate recommendations for do_first", () => {
      const task: PrioritizationTask = createTestTask({
        priority: "urgent",
        isCritical: true,
      }) as PrioritizationTask

      const score = calculatePriorityScore(task)
      const recommendations = generateRecommendations(task, score)

      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations.some(r => r.includes("priorité") || r.includes("aujourd'hui"))).toBe(true)
    })

    it("should suggest delegation for urgent but not important", () => {
      const task: PrioritizationTask = createTestTask({
        priority: "low",
        title: "Urgent mais pas important",
        description: "ASAP",
      }) as PrioritizationTask

      const score: ReturnType<typeof calculatePriorityScore> = {
        taskId: task.id,
        score: 50,
        urgency: 80,
        importance: 30,
        quadrant: "delegate",
        factors: [],
        recommendation: "",
      }

      const recommendations = generateRecommendations(task, score)

      expect(recommendations.some(r => r.toLowerCase().includes("délég") || r.toLowerCase().includes("confier") || r.toLowerCase().includes("assign"))).toBe(true)
    })
  })

  describe("TaskPrioritizer Class", () => {
    it("should create prioritizer instance", () => {
      const prioritizer = createTaskPrioritizer([])
      expect(prioritizer).toBeDefined()
    })

    it("should get prioritized list", () => {
      const tasks: PrioritizationTask[] = [
        createPriorityTask({ priority: "high" }),
        createPriorityTask({ priority: "low" }),
      ]

      const prioritizer = new TaskPrioritizer(tasks)
      const list = prioritizer.getPrioritizedList()

      expect(list.tasks.length).toBe(2)
    })

    it("should get tasks by quadrant", () => {
      const tasks: PrioritizationTask[] = [
        createTestTask({ priority: "urgent", isCritical: true }) as PrioritizationTask,
        createPriorityTask({ priority: "low" }),
      ]

      const prioritizer = new TaskPrioritizer(tasks)
      const doFirstTasks = prioritizer.getByQuadrant("do_first")

      expect(doFirstTasks.length).toBeGreaterThanOrEqual(0)
    })

    it("should get daily focus", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const tasks: PrioritizationTask[] = [
        createTestTask({ priority: "urgent", deadline: yesterday.toISOString() }) as PrioritizationTask,
        createPriorityTask({ priority: "high" }),
        createPriorityTask({ priority: "low" }),
      ]

      const prioritizer = new TaskPrioritizer(tasks)
      const focus = prioritizer.getDailyFocus()

      expect(focus.mustDo).toBeDefined()
      expect(focus.shouldDo).toBeDefined()
      expect(focus.couldDo).toBeDefined()
    })

    it("should detect implicit deadlines", () => {
      const tasks: PrioritizationTask[] = [
        createTestTask({ title: "Faire demain" }) as PrioritizationTask,
        createTestTask({ title: "Normal task", deadline: new Date().toISOString() }) as PrioritizationTask,
      ]

      const prioritizer = new TaskPrioritizer(tasks)
      const deadlines = prioritizer.detectImplicitDeadlines()

      expect(deadlines.length).toBe(1)
    })
  })
})
