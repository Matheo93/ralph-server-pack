/**
 * Distribution System Tests
 *
 * Tests for load calculation, balance scoring, and task assignment.
 */

import { describe, test, expect } from "vitest"

// =============================================================================
// CALCULATOR TESTS
// =============================================================================

import {
  calculateTaskWeight,
  calculateDistribution,
  calculateBalanceScore,
  getISOWeek,
  getWeekBounds,
  calculateWeeklyStats,
  generateBalanceAlert,
  formatWeight,
  getLoadLevel,
  calculateTrend,
  CATEGORY_WEIGHTS,
  TaskLoad,
  ParentLoad,
} from "@/lib/distribution/calculator"

describe("Task Weight Calculation", () => {
  test("uses default weight for category", () => {
    const weight = calculateTaskWeight({ category: "sante" })
    expect(weight).toBe(CATEGORY_WEIGHTS["sante"])
  })

  test("uses explicit weight if provided", () => {
    const weight = calculateTaskWeight({ weight: 5, category: "sante" })
    expect(weight).toBe(5)
  })

  test("applies urgent priority multiplier", () => {
    const normalWeight = calculateTaskWeight({ weight: 2, priority: 3 })
    const urgentWeight = calculateTaskWeight({ weight: 2, priority: 1 })
    expect(urgentWeight).toBeGreaterThan(normalWeight)
  })

  test("applies critical multiplier", () => {
    const normalWeight = calculateTaskWeight({ weight: 2, critical: false })
    const criticalWeight = calculateTaskWeight({ weight: 2, critical: true })
    expect(criticalWeight).toBeGreaterThan(normalWeight)
  })

  test("applies recurring discount", () => {
    const oneTimeWeight = calculateTaskWeight({ weight: 3, recurrence: "once" })
    const recurringWeight = calculateTaskWeight({ weight: 3, recurrence: "weekly" })
    expect(recurringWeight).toBeLessThan(oneTimeWeight)
  })

  test("handles missing category", () => {
    const weight = calculateTaskWeight({})
    expect(weight).toBe(CATEGORY_WEIGHTS["autre"])
  })
})

describe("Load Distribution Calculation", () => {
  const parents = [
    { userId: "parent1", userName: "Alice" },
    { userId: "parent2", userName: "Bob" },
  ]

  test("calculates empty distribution", () => {
    const distribution = calculateDistribution([], parents)
    expect(distribution.totalWeight).toBe(0)
    expect(distribution.totalTasks).toBe(0)
    expect(distribution.parents.length).toBe(2)
  })

  test("calculates task counts per parent", () => {
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 3, completedAt: null, assignedTo: "parent1" },
      { taskId: "2", title: "T2", category: "ecole", weight: 2, completedAt: null, assignedTo: "parent1" },
      { taskId: "3", title: "T3", category: "sante", weight: 4, completedAt: null, assignedTo: "parent2" },
    ]

    const distribution = calculateDistribution(tasks, parents)

    const alice = distribution.parents.find((p) => p.userId === "parent1")
    const bob = distribution.parents.find((p) => p.userId === "parent2")

    expect(alice?.taskCount).toBe(2)
    expect(bob?.taskCount).toBe(1)
  })

  test("calculates total weight per parent", () => {
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 3, completedAt: null, assignedTo: "parent1" },
      { taskId: "2", title: "T2", category: "ecole", weight: 2, completedAt: null, assignedTo: "parent1" },
      { taskId: "3", title: "T3", category: "sante", weight: 4, completedAt: null, assignedTo: "parent2" },
    ]

    const distribution = calculateDistribution(tasks, parents)

    const alice = distribution.parents.find((p) => p.userId === "parent1")
    const bob = distribution.parents.find((p) => p.userId === "parent2")

    expect(alice?.totalWeight).toBe(5)
    expect(bob?.totalWeight).toBe(4)
  })

  test("calculates percentages", () => {
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 6, completedAt: null, assignedTo: "parent1" },
      { taskId: "2", title: "T2", category: "sante", weight: 4, completedAt: null, assignedTo: "parent2" },
    ]

    const distribution = calculateDistribution(tasks, parents)

    const alice = distribution.parents.find((p) => p.userId === "parent1")
    const bob = distribution.parents.find((p) => p.userId === "parent2")

    expect(alice?.percentage).toBe(60)
    expect(bob?.percentage).toBe(40)
  })

  test("identifies most and least loaded", () => {
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 8, completedAt: null, assignedTo: "parent1" },
      { taskId: "2", title: "T2", category: "sante", weight: 2, completedAt: null, assignedTo: "parent2" },
    ]

    const distribution = calculateDistribution(tasks, parents)

    expect(distribution.mostLoaded?.userId).toBe("parent1")
    expect(distribution.leastLoaded?.userId).toBe("parent2")
  })

  test("ignores unassigned tasks", () => {
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 3, completedAt: null, assignedTo: "parent1" },
      { taskId: "2", title: "T2", category: "sante", weight: 5, completedAt: null, assignedTo: null },
    ]

    const distribution = calculateDistribution(tasks, parents)
    expect(distribution.totalWeight).toBe(3)
    expect(distribution.totalTasks).toBe(1)
  })

  test("tracks completed vs pending", () => {
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 3, completedAt: new Date(), assignedTo: "parent1" },
      { taskId: "2", title: "T2", category: "ecole", weight: 2, completedAt: null, assignedTo: "parent1" },
    ]

    const distribution = calculateDistribution(tasks, parents)
    const alice = distribution.parents.find((p) => p.userId === "parent1")

    expect(alice?.completedCount).toBe(1)
    expect(alice?.pendingCount).toBe(1)
  })
})

describe("Balance Score Calculation", () => {
  test("returns 100 for empty parents", () => {
    const score = calculateBalanceScore([])
    expect(score).toBe(100)
  })

  test("returns 100 for single parent", () => {
    const parents: ParentLoad[] = [{
      userId: "1",
      userName: "Alice",
      totalWeight: 10,
      taskCount: 5,
      completedCount: 2,
      pendingCount: 3,
      weeklyWeight: 5,
      monthlyWeight: 10,
      percentage: 100,
    }]
    const score = calculateBalanceScore(parents)
    expect(score).toBe(100)
  })

  test("returns 100 for perfectly balanced", () => {
    const parents: ParentLoad[] = [
      {
        userId: "1", userName: "Alice", totalWeight: 10, taskCount: 5,
        completedCount: 2, pendingCount: 3, weeklyWeight: 5, monthlyWeight: 10, percentage: 50,
      },
      {
        userId: "2", userName: "Bob", totalWeight: 10, taskCount: 5,
        completedCount: 2, pendingCount: 3, weeklyWeight: 5, monthlyWeight: 10, percentage: 50,
      },
    ]
    const score = calculateBalanceScore(parents)
    expect(score).toBe(100)
  })

  test("returns lower score for imbalanced distribution", () => {
    const parents: ParentLoad[] = [
      {
        userId: "1", userName: "Alice", totalWeight: 16, taskCount: 8,
        completedCount: 4, pendingCount: 4, weeklyWeight: 8, monthlyWeight: 16, percentage: 80,
      },
      {
        userId: "2", userName: "Bob", totalWeight: 4, taskCount: 2,
        completedCount: 1, pendingCount: 1, weeklyWeight: 2, monthlyWeight: 4, percentage: 20,
      },
    ]
    const score = calculateBalanceScore(parents)
    expect(score).toBeLessThan(100)
  })
})

describe("Weekly Stats", () => {
  test("getISOWeek returns correct week number", () => {
    const date = new Date("2024-01-15")
    const { year, week } = getISOWeek(date)
    expect(year).toBe(2024)
    expect(week).toBeGreaterThanOrEqual(1)
    expect(week).toBeLessThanOrEqual(53)
  })

  test("getWeekBounds returns Monday to Sunday", () => {
    const date = new Date("2024-01-15") // Monday
    const { start, end } = getWeekBounds(date)

    expect(start.getDay()).toBe(1) // Monday
    expect(end.getDay()).toBe(0) // Sunday
  })

  test("calculateWeeklyStats aggregates correctly", () => {
    const parents = [
      { userId: "p1", userName: "Alice" },
      { userId: "p2", userName: "Bob" },
    ]

    const now = new Date()
    const tasks: TaskLoad[] = [
      { taskId: "1", title: "T1", category: "ecole", weight: 3, completedAt: now, assignedTo: "p1" },
      { taskId: "2", title: "T2", category: "sante", weight: 2, completedAt: now, assignedTo: "p2" },
    ]

    const stats = calculateWeeklyStats(tasks, parents)

    expect(stats.totalCount).toBe(2)
    expect(stats.totalWeight).toBe(5)
    expect(stats.parents.length).toBe(2)
  })
})

describe("Balance Alert Generation", () => {
  test("generates balanced alert for good score", () => {
    const distribution = {
      parents: [
        { userId: "1", userName: "A", totalWeight: 10, taskCount: 5, completedCount: 2, pendingCount: 3, weeklyWeight: 5, monthlyWeight: 10, percentage: 50 },
        { userId: "2", userName: "B", totalWeight: 10, taskCount: 5, completedCount: 2, pendingCount: 3, weeklyWeight: 5, monthlyWeight: 10, percentage: 50 },
      ],
      totalWeight: 20,
      totalTasks: 10,
      balanceScore: 100,
      mostLoaded: null,
      leastLoaded: null,
    }

    const alert = generateBalanceAlert(distribution)
    expect(alert.status).toBe("balanced")
    expect(alert.level).toBe("none")
  })

  test("generates warning for moderate imbalance", () => {
    const distribution = {
      parents: [
        { userId: "1", userName: "Alice", totalWeight: 14, taskCount: 7, completedCount: 3, pendingCount: 4, weeklyWeight: 7, monthlyWeight: 14, percentage: 70 },
        { userId: "2", userName: "Bob", totalWeight: 6, taskCount: 3, completedCount: 1, pendingCount: 2, weeklyWeight: 3, monthlyWeight: 6, percentage: 30 },
      ],
      totalWeight: 20,
      totalTasks: 10,
      balanceScore: 60,
      mostLoaded: { userId: "1", userName: "Alice", totalWeight: 14, taskCount: 7, completedCount: 3, pendingCount: 4, weeklyWeight: 7, monthlyWeight: 14, percentage: 70 },
      leastLoaded: { userId: "2", userName: "Bob", totalWeight: 6, taskCount: 3, completedCount: 1, pendingCount: 2, weeklyWeight: 3, monthlyWeight: 6, percentage: 30 },
    }

    const alert = generateBalanceAlert(distribution)
    expect(alert.status).toBe("warning")
  })

  test("generates critical for severe imbalance", () => {
    const distribution = {
      parents: [
        { userId: "1", userName: "Alice", totalWeight: 18, taskCount: 9, completedCount: 4, pendingCount: 5, weeklyWeight: 9, monthlyWeight: 18, percentage: 90 },
        { userId: "2", userName: "Bob", totalWeight: 2, taskCount: 1, completedCount: 0, pendingCount: 1, weeklyWeight: 1, monthlyWeight: 2, percentage: 10 },
      ],
      totalWeight: 20,
      totalTasks: 10,
      balanceScore: 20,
      mostLoaded: { userId: "1", userName: "Alice", totalWeight: 18, taskCount: 9, completedCount: 4, pendingCount: 5, weeklyWeight: 9, monthlyWeight: 18, percentage: 90 },
      leastLoaded: { userId: "2", userName: "Bob", totalWeight: 2, taskCount: 1, completedCount: 0, pendingCount: 1, weeklyWeight: 1, monthlyWeight: 2, percentage: 10 },
    }

    const alert = generateBalanceAlert(distribution)
    expect(alert.status).toBe("critical")
    expect(alert.level).toBe("high")
  })

  test("generates suggestions when tasks provided", () => {
    const tasks: TaskLoad[] = [
      { taskId: "t1", title: "Task 1", category: "ecole", weight: 3, completedAt: null, assignedTo: "1" },
      { taskId: "t2", title: "Task 2", category: "ecole", weight: 2, completedAt: null, assignedTo: "1" },
    ]

    const distribution = {
      parents: [
        { userId: "1", userName: "Alice", totalWeight: 15, taskCount: 5, completedCount: 2, pendingCount: 3, weeklyWeight: 7, monthlyWeight: 15, percentage: 75 },
        { userId: "2", userName: "Bob", totalWeight: 5, taskCount: 2, completedCount: 1, pendingCount: 1, weeklyWeight: 2, monthlyWeight: 5, percentage: 25 },
      ],
      totalWeight: 20,
      totalTasks: 7,
      balanceScore: 50,
      mostLoaded: { userId: "1", userName: "Alice", totalWeight: 15, taskCount: 5, completedCount: 2, pendingCount: 3, weeklyWeight: 7, monthlyWeight: 15, percentage: 75 },
      leastLoaded: { userId: "2", userName: "Bob", totalWeight: 5, taskCount: 2, completedCount: 1, pendingCount: 1, weeklyWeight: 2, monthlyWeight: 5, percentage: 25 },
    }

    const alert = generateBalanceAlert(distribution, tasks)
    expect(alert.suggestions.length).toBeGreaterThan(0)
  })
})

describe("Helper Functions", () => {
  test("formatWeight formats correctly", () => {
    expect(formatWeight(3.14159)).toBe("3.1")
    expect(formatWeight(5)).toBe("5.0")
  })

  test("getLoadLevel returns correct level", () => {
    expect(getLoadLevel(30)).toBe("low")
    expect(getLoadLevel(50)).toBe("balanced")
    expect(getLoadLevel(70)).toBe("high")
  })

  test("calculateTrend detects increase", () => {
    expect(calculateTrend(20, 10)).toBe("increasing")
  })

  test("calculateTrend detects decrease", () => {
    expect(calculateTrend(10, 20)).toBe("decreasing")
  })

  test("calculateTrend detects stable", () => {
    expect(calculateTrend(10, 10)).toBe("stable")
    expect(calculateTrend(11, 10)).toBe("stable") // Within threshold
  })
})

// =============================================================================
// ASSIGNER TESTS
// =============================================================================

import {
  getLeastLoadedParent,
  getRotatingAssignment,
  suggestRebalance,
  AssignmentOptions,
} from "@/lib/distribution/assigner"

describe("Task Assignment", () => {
  const createDistribution = (percentages: number[]) => {
    const parents = percentages.map((p, i) => ({
      userId: `p${i}`,
      userName: `Parent ${i}`,
      totalWeight: p,
      taskCount: Math.floor(p / 2),
      completedCount: Math.floor(p / 4),
      pendingCount: Math.ceil(p / 4),
      weeklyWeight: p / 2,
      monthlyWeight: p,
      percentage: p,
    }))

    return {
      parents,
      totalWeight: percentages.reduce((a, b) => a + b, 0),
      totalTasks: parents.reduce((a, p) => a + p.taskCount, 0),
      balanceScore: 50,
      mostLoaded: parents.reduce((a, b) => (a.percentage > b.percentage ? a : b)),
      leastLoaded: parents.reduce((a, b) => (a.percentage < b.percentage ? a : b)),
    }
  }

  test("getLeastLoadedParent returns least loaded", () => {
    const distribution = createDistribution([70, 30])
    const result = getLeastLoadedParent(distribution)

    expect(result).not.toBeNull()
    expect(result?.assignedTo).toBe("p1")
  })

  test("getRotatingAssignment alternates", () => {
    const distribution = createDistribution([50, 50])

    const first = getRotatingAssignment(distribution, null)
    expect(first?.assignedTo).toBe("p0")

    const second = getRotatingAssignment(distribution, "p0")
    expect(second?.assignedTo).toBe("p1")

    const third = getRotatingAssignment(distribution, "p1")
    expect(third?.assignedTo).toBe("p0")
  })

  test("getLeastLoadedParent respects preferred parent when load is similar", () => {
    const distribution = createDistribution([50, 50])
    distribution.parents[0]!.userId = "p0"
    distribution.parents[1]!.userId = "p1"

    const options: AssignmentOptions = {
      preferredParentId: "p1",
      equalityThreshold: 10,
    }

    const result = getLeastLoadedParent(distribution, options)
    expect(result?.assignedTo).toBe("p1")
  })

  test("suggestRebalance returns suggestions for imbalanced distribution", () => {
    const tasks: TaskLoad[] = [
      { taskId: "t1", title: "Task 1", category: "ecole", weight: 3, completedAt: null, assignedTo: "p0" },
      { taskId: "t2", title: "Task 2", category: "ecole", weight: 2, completedAt: null, assignedTo: "p0" },
      { taskId: "t3", title: "Task 3", category: "sante", weight: 4, completedAt: null, assignedTo: "p0" },
    ]

    const distribution = createDistribution([75, 25])
    distribution.parents[0]!.userId = "p0"
    distribution.parents[0]!.userName = "Parent 0"
    distribution.parents[1]!.userId = "p1"
    distribution.parents[1]!.userName = "Parent 1"
    distribution.mostLoaded = distribution.parents[0]!
    distribution.leastLoaded = distribution.parents[1]!

    const suggestions = suggestRebalance(tasks, distribution, 2)

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.every((s) => s.currentAssignee === "Parent 0")).toBe(true)
    expect(suggestions.every((s) => s.suggestedAssignee === "Parent 1")).toBe(true)
  })

  test("suggestRebalance returns empty for balanced distribution", () => {
    const tasks: TaskLoad[] = []
    const distribution = createDistribution([50, 50])
    distribution.balanceScore = 100

    const suggestions = suggestRebalance(tasks, distribution)
    expect(suggestions.length).toBe(0)
  })
})
