/**
 * Distribution V2 Module Tests
 *
 * Tests for enhanced load calculation, assignment optimization, and balance alerts.
 * Covers:
 * - Load calculator v2 (25+ tests)
 * - Assignment optimizer
 * - Balance alerts
 */

import { describe, it, expect, beforeEach } from "vitest"

// Load Calculator V2
import {
  calculateTaskWeight,
  calculateTimeDecay,
  calculateDeadlineMultiplier,
  calculateFatigueMultiplier,
  calculatePriorityMultiplier,
  calculateRecurringMultiplier,
  calculateTimeWeightedLoad,
  calculateCategoryLoad,
  calculateLoadTrend,
  calculateFatigueLevel,
  buildFatigueState,
  calculateGiniCoefficient,
  calculateBalanceScoreV2,
  buildUserLoadSummary,
  generateLoadAlerts,
  generateRecommendations,
  calculateLoadDistributionV2,
  getCategoryWeight,
  formatWeight,
  getFatigueLevelLabel,
  getBalanceStatusLabel,
  getTrendIcon,
  CATEGORY_WEIGHTS_V2,
  MULTIPLIERS,
  TIME_DECAY,
  type TaskWeightInput,
  type HistoricalLoadEntry,
} from "@/lib/distribution/load-calculator-v2"

// Assignment Optimizer
import {
  isInExclusionPeriod,
  canHandleCategory,
  hasRequiredSkills,
  hasCapacity,
  checkEligibility,
  calculateLoadBalanceScore,
  calculateCategoryPreferenceScore,
  calculateSkillMatchScore,
  calculateAvailabilityScore,
  calculateRotationScore,
  calculateFatigueScore,
  calculateAssignmentScore,
  findOptimalAssignee,
  assignTasksBatch,
  createRotationTracker,
  updateRotationTracker,
  getCategoryRotationStatus,
  addExclusionPeriod,
  cleanupExclusionPeriods,
  getUpcomingExclusions,
  suggestReassignments,
  createMemberAvailability,
  getAssignmentStats,
  type MemberAvailability,
} from "@/lib/distribution/assignment-optimizer"

// Balance Alerts
import {
  analyzeBalanceStatus,
  generateWeeklyDigest,
  analyzeTrend,
  generateAlertMessage,
  generatePositiveMessage,
  generateRecommendationMessage,
  createAlertNotification,
  createDigestNotification,
  DEFAULT_ALERT_CONFIG,
  type BalanceStatus,
} from "@/lib/distribution/balance-alerts"

// =============================================================================
// TEST DATA
// =============================================================================

const createTestTask = (overrides: Partial<TaskWeightInput> = {}): TaskWeightInput => ({
  taskId: "task-1",
  title: "Test Task",
  category: "quotidien",
  priority: 2,
  isRecurring: false,
  isCritical: false,
  requiresCoordination: false,
  hasDeadlinePressure: false,
  ...overrides,
})

const createTestHistoricalEntry = (
  overrides: Partial<HistoricalLoadEntry> = {}
): HistoricalLoadEntry => ({
  date: new Date(),
  userId: "user-1",
  taskId: "task-1",
  category: "quotidien",
  weight: 2,
  wasCompleted: true,
  ...overrides,
})

const createTestMember = (
  overrides: Partial<MemberAvailability> = {}
): MemberAvailability =>
  createMemberAvailability("user-1", "Alice", {
    currentLoad: 0,
    maxWeeklyLoad: 20,
    ...overrides,
  })

// =============================================================================
// LOAD CALCULATOR V2 TESTS
// =============================================================================

describe("Load Calculator V2", () => {
  describe("Category Weights", () => {
    it("should have all expected categories", () => {
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("ecole")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("sante")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("administratif")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("quotidien")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("social")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("activites")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("logistique")
      expect(CATEGORY_WEIGHTS_V2).toHaveProperty("autre")
    })

    it("should return correct category weight", () => {
      const santeWeight = getCategoryWeight("sante")
      expect(santeWeight.baseWeight).toBe(4)
      expect(santeWeight.mentalLoad).toBeGreaterThan(0)
    })

    it("should fallback to autre for unknown categories", () => {
      const unknownWeight = getCategoryWeight("unknown")
      expect(unknownWeight).toEqual(CATEGORY_WEIGHTS_V2["autre"])
    })
  })

  describe("Time Decay", () => {
    it("should return 1 for today", () => {
      expect(calculateTimeDecay(0)).toBe(1)
    })

    it("should decay over time", () => {
      const day7 = calculateTimeDecay(7)
      const day14 = calculateTimeDecay(14)
      const day30 = calculateTimeDecay(30)

      expect(day7).toBeGreaterThan(day14)
      expect(day14).toBeGreaterThan(day30)
    })

    it("should approach minimum for old entries", () => {
      const old = calculateTimeDecay(TIME_DECAY.maxAgeDays)
      expect(old).toBe(0.1)
    })
  })

  describe("Deadline Multiplier", () => {
    it("should return 1 for no deadline", () => {
      expect(calculateDeadlineMultiplier(undefined)).toBe(1)
    })

    it("should return higher for overdue", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(calculateDeadlineMultiplier(yesterday)).toBe(MULTIPLIERS.deadline.overdue)
    })

    it("should return elevated for today", () => {
      const today = new Date()
      today.setHours(23, 59, 59)
      expect(calculateDeadlineMultiplier(today)).toBe(MULTIPLIERS.deadline.today)
    })

    it("should return normal for future dates", () => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      expect(calculateDeadlineMultiplier(nextMonth)).toBe(MULTIPLIERS.deadline.noDeadline)
    })
  })

  describe("Fatigue Multiplier", () => {
    it("should return rested multiplier for low fatigue", () => {
      expect(calculateFatigueMultiplier(10)).toBe(MULTIPLIERS.fatigue.rested)
      expect(calculateFatigueMultiplier(20)).toBe(MULTIPLIERS.fatigue.rested)
    })

    it("should increase with fatigue level", () => {
      expect(calculateFatigueMultiplier(30)).toBe(MULTIPLIERS.fatigue.normal)
      expect(calculateFatigueMultiplier(50)).toBe(MULTIPLIERS.fatigue.tired)
      expect(calculateFatigueMultiplier(70)).toBe(MULTIPLIERS.fatigue.exhausted)
      expect(calculateFatigueMultiplier(90)).toBe(MULTIPLIERS.fatigue.burnout)
    })
  })

  describe("Priority Multiplier", () => {
    it("should return high multiplier for priority 1", () => {
      expect(calculatePriorityMultiplier(1)).toBe(MULTIPLIERS.priority.high)
    })

    it("should return normal for priority 2", () => {
      expect(calculatePriorityMultiplier(2)).toBe(MULTIPLIERS.priority.normal)
    })

    it("should return low for priority 3", () => {
      expect(calculatePriorityMultiplier(3)).toBe(MULTIPLIERS.priority.low)
    })
  })

  describe("Recurring Multiplier", () => {
    it("should return 1 for non-recurring", () => {
      expect(calculateRecurringMultiplier(false)).toBe(1)
    })

    it("should discount daily tasks", () => {
      expect(calculateRecurringMultiplier(true, "daily")).toBe(MULTIPLIERS.recurring.daily)
      expect(calculateRecurringMultiplier(true, "quotidien")).toBe(MULTIPLIERS.recurring.daily)
    })

    it("should discount weekly tasks", () => {
      expect(calculateRecurringMultiplier(true, "weekly")).toBe(MULTIPLIERS.recurring.weekly)
    })
  })

  describe("Task Weight Calculation", () => {
    it("should calculate base weight from category", () => {
      const result = calculateTaskWeight(createTestTask({ category: "sante" }))
      expect(result.baseWeight).toBe(4)
    })

    it("should apply priority multiplier", () => {
      const normal = calculateTaskWeight(createTestTask({ priority: 2 }))
      const high = calculateTaskWeight(createTestTask({ priority: 1 }))

      expect(high.adjustedWeight).toBeGreaterThan(normal.adjustedWeight)
    })

    it("should apply critical multiplier", () => {
      const normal = calculateTaskWeight(createTestTask({ isCritical: false }))
      const critical = calculateTaskWeight(createTestTask({ isCritical: true }))

      expect(critical.adjustedWeight).toBeGreaterThan(normal.adjustedWeight)
    })

    it("should apply recurring discount", () => {
      const once = calculateTaskWeight(createTestTask({ isRecurring: false }))
      const recurring = calculateTaskWeight(createTestTask({ isRecurring: true, recurrencePattern: "daily" }))

      expect(recurring.adjustedWeight).toBeLessThan(once.adjustedWeight)
    })

    it("should include explanation", () => {
      const result = calculateTaskWeight(createTestTask({ priority: 1, isCritical: true }))

      expect(result.explanation.length).toBeGreaterThan(0)
      expect(result.explanation.some((e) => e.includes("Priorité"))).toBe(true)
      expect(result.explanation.some((e) => e.includes("Critique"))).toBe(true)
    })
  })

  describe("Historical Load", () => {
    it("should calculate time-weighted load", () => {
      const entries: HistoricalLoadEntry[] = [
        createTestHistoricalEntry({ weight: 5 }),
        createTestHistoricalEntry({ weight: 3 }),
      ]

      const result = calculateTimeWeightedLoad(entries, "user-1")
      expect(result.score).toBeGreaterThan(0)
    })

    it("should return 0 for no entries", () => {
      const result = calculateTimeWeightedLoad([], "user-1")
      expect(result.score).toBe(0)
    })

    it("should calculate category load", () => {
      const entries: HistoricalLoadEntry[] = [
        createTestHistoricalEntry({ category: "sante", weight: 5 }),
        createTestHistoricalEntry({ category: "ecole", weight: 3 }),
      ]

      const result = calculateCategoryLoad(entries, "user-1")
      expect(result["sante"]).toBeDefined()
      expect(result["ecole"]).toBeDefined()
    })
  })

  describe("Load Trend", () => {
    it("should return stable for no history", () => {
      const result = calculateLoadTrend([], "user-1")
      expect(result).toBe("stable")
    })

    it("should detect increasing trend", () => {
      const now = new Date()
      const entries: HistoricalLoadEntry[] = []

      // Recent: high load
      for (let i = 0; i < 7; i++) {
        entries.push(
          createTestHistoricalEntry({
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            weight: 10,
          })
        )
      }

      // Previous: low load
      for (let i = 7; i < 14; i++) {
        entries.push(
          createTestHistoricalEntry({
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            weight: 2,
          })
        )
      }

      const result = calculateLoadTrend(entries, "user-1")
      expect(result).toBe("increasing")
    })
  })

  describe("Fatigue Level", () => {
    it("should return low fatigue for light load", () => {
      const entries: HistoricalLoadEntry[] = [
        createTestHistoricalEntry({ weight: 2 }),
      ]

      const result = calculateFatigueLevel(entries, "user-1")
      expect(result).toBeLessThan(50)
    })

    it("should increase fatigue with heavy load", () => {
      const now = new Date()
      const entries: HistoricalLoadEntry[] = []

      for (let i = 0; i < 7; i++) {
        entries.push(
          createTestHistoricalEntry({
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            weight: 20,
          })
        )
      }

      const result = calculateFatigueLevel(entries, "user-1")
      expect(result).toBeGreaterThan(50)
    })
  })

  describe("Gini Coefficient", () => {
    it("should return 0 for perfect equality", () => {
      expect(calculateGiniCoefficient([50, 50])).toBe(0)
      expect(calculateGiniCoefficient([10, 10, 10])).toBe(0)
    })

    it("should return higher for inequality", () => {
      const equal = calculateGiniCoefficient([50, 50])
      const unequal = calculateGiniCoefficient([90, 10])

      expect(unequal).toBeGreaterThan(equal)
    })

    it("should return 0 for empty array", () => {
      expect(calculateGiniCoefficient([])).toBe(0)
    })
  })

  describe("Balance Score V2", () => {
    it("should return 100 for perfect balance", () => {
      expect(calculateBalanceScoreV2([50, 50])).toBe(100)
    })

    it("should return lower for imbalance", () => {
      const balanced = calculateBalanceScoreV2([50, 50])
      const imbalanced = calculateBalanceScoreV2([80, 20])

      expect(imbalanced).toBeLessThan(balanced)
    })

    it("should return 100 for single user", () => {
      expect(calculateBalanceScoreV2([100])).toBe(100)
    })
  })

  describe("Load Alerts", () => {
    it("should generate imbalance alert", () => {
      const users = [
        {
          userId: "1",
          userName: "Alice",
          currentLoad: 10,
          weeklyLoad: 50,
          monthlyLoad: 200,
          loadTrend: "stable" as const,
          fatigueLevel: 30,
          balancePercentage: 70,
          pendingTasks: 5,
          completedTasks: 10,
          categoryBreakdown: {},
        },
        {
          userId: "2",
          userName: "Bob",
          currentLoad: 2,
          weeklyLoad: 10,
          monthlyLoad: 40,
          loadTrend: "stable" as const,
          fatigueLevel: 10,
          balancePercentage: 30,
          pendingTasks: 1,
          completedTasks: 5,
          categoryBreakdown: {},
        },
      ]

      const alerts = generateLoadAlerts(users, 50)
      expect(alerts.some((a) => a.type === "imbalance")).toBe(true)
    })

    it("should generate fatigue alert", () => {
      const users = [
        {
          userId: "1",
          userName: "Alice",
          currentLoad: 10,
          weeklyLoad: 50,
          monthlyLoad: 200,
          loadTrend: "stable" as const,
          fatigueLevel: 85,
          balancePercentage: 50,
          pendingTasks: 5,
          completedTasks: 10,
          categoryBreakdown: {},
        },
      ]

      const alerts = generateLoadAlerts(users, 80)
      expect(alerts.some((a) => a.type === "fatigue")).toBe(true)
    })
  })

  describe("Formatting Helpers", () => {
    it("should format weight", () => {
      expect(formatWeight(3.456)).toBe("3.5")
      expect(formatWeight(10)).toBe("10.0")
    })

    it("should get fatigue label", () => {
      expect(getFatigueLevelLabel(10)).toBe("Reposé")
      expect(getFatigueLevelLabel(50)).toBe("Fatigué")
      expect(getFatigueLevelLabel(90)).toBe("Risque de burnout")
    })

    it("should get balance status label", () => {
      expect(getBalanceStatusLabel(90)).toBe("Équilibré")
      expect(getBalanceStatusLabel(50)).toBe("Acceptable")
      expect(getBalanceStatusLabel(30)).toBe("Critique")
    })

    it("should get trend icon", () => {
      expect(getTrendIcon("increasing")).toBe("↑")
      expect(getTrendIcon("stable")).toBe("→")
      expect(getTrendIcon("decreasing")).toBe("↓")
    })
  })
})

// =============================================================================
// ASSIGNMENT OPTIMIZER TESTS
// =============================================================================

describe("Assignment Optimizer", () => {
  describe("Eligibility Checks", () => {
    it("should detect exclusion period", () => {
      const member = createTestMember({
        exclusionPeriods: [
          {
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            reason: "Vacances",
          },
        ],
      })

      const result = isInExclusionPeriod(member)
      expect(result.excluded).toBe(true)
      expect(result.reason).toBe("Vacances")
    })

    it("should allow when not in exclusion", () => {
      const member = createTestMember({ exclusionPeriods: [] })
      const result = isInExclusionPeriod(member)
      expect(result.excluded).toBe(false)
    })

    it("should check blocked categories", () => {
      const member = createTestMember({ blockedCategories: ["administratif"] })

      expect(canHandleCategory(member, "quotidien").canHandle).toBe(true)
      expect(canHandleCategory(member, "administratif").canHandle).toBe(false)
    })

    it("should check required skills", () => {
      const member = createTestMember({ skills: ["cooking", "driving"] })

      const full = hasRequiredSkills(member, ["cooking", "driving"])
      expect(full.hasSkills).toBe(true)
      expect(full.matchRatio).toBe(1)

      const partial = hasRequiredSkills(member, ["cooking", "gardening"])
      expect(partial.matchRatio).toBe(0.5)

      const none = hasRequiredSkills(member, ["flying"])
      expect(none.hasSkills).toBe(false)
    })

    it("should check capacity", () => {
      const underCapacity = createTestMember({ currentLoad: 10, maxWeeklyLoad: 20 })
      expect(hasCapacity(underCapacity).hasCapacity).toBe(true)

      const overCapacity = createTestMember({ currentLoad: 25, maxWeeklyLoad: 20 })
      expect(hasCapacity(overCapacity).hasCapacity).toBe(false)
    })
  })

  describe("Scoring Functions", () => {
    it("should calculate load balance score", () => {
      const members = [
        createTestMember({ userId: "1", currentLoad: 15 }),
        createTestMember({ userId: "2", currentLoad: 5 }),
      ]

      const score1 = calculateLoadBalanceScore(members[0]!, members)
      const score2 = calculateLoadBalanceScore(members[1]!, members)

      expect(score2).toBeGreaterThan(score1) // Less loaded should score higher
    })

    it("should calculate category preference score", () => {
      const member = createTestMember({ preferredCategories: ["sante"] })

      const preferred = calculateCategoryPreferenceScore(member, "sante")
      const neutral = calculateCategoryPreferenceScore(member, "quotidien")

      expect(preferred).toBeGreaterThan(neutral)
    })

    it("should calculate skill match score", () => {
      const member = createTestMember({ skills: ["cooking", "driving"] })

      expect(calculateSkillMatchScore(member, [])).toBe(100)
      expect(calculateSkillMatchScore(member, ["cooking"])).toBe(100)
      expect(calculateSkillMatchScore(member, ["flying"])).toBe(0)
    })

    it("should calculate rotation score", () => {
      const member = createTestMember()
      const tracker = createRotationTracker()

      // No previous assignment - high score
      const score1 = calculateRotationScore(member, "quotidien", tracker)
      expect(score1).toBe(100)

      // After assignment - lower score
      updateRotationTracker(tracker, member.userId, "quotidien")
      const score2 = calculateRotationScore(member, "quotidien", tracker)
      expect(score2).toBeLessThan(score1)
    })
  })

  describe("Assignment", () => {
    it("should find optimal assignee", () => {
      const task = createTestTask()
      const members = [
        createTestMember({ userId: "1", userName: "Alice", currentLoad: 15 }),
        createTestMember({ userId: "2", userName: "Bob", currentLoad: 5 }),
      ]
      const tracker = createRotationTracker()

      const result = findOptimalAssignee(task, members, [], tracker)

      expect(result).not.toBeNull()
      expect(result!.assignedTo).toBe("2") // Bob has less load
    })

    it("should respect blocked categories", () => {
      const task = createTestTask({ category: "administratif" })
      const members = [
        createTestMember({ userId: "1", userName: "Alice", blockedCategories: ["administratif"] }),
        createTestMember({ userId: "2", userName: "Bob", blockedCategories: [] }),
      ]
      const tracker = createRotationTracker()

      const result = findOptimalAssignee(task, members, [], tracker)

      expect(result).not.toBeNull()
      expect(result!.assignedTo).toBe("2") // Only Bob can handle
    })

    it("should handle forced assignment", () => {
      const task = createTestTask()
      const members = [
        createTestMember({ userId: "1", userName: "Alice", currentLoad: 5 }),
        createTestMember({ userId: "2", userName: "Bob", currentLoad: 15 }),
      ]
      const tracker = createRotationTracker()

      const result = findOptimalAssignee(task, members, [], tracker, undefined, "2")

      expect(result!.assignedTo).toBe("2")
      expect(result!.wasForced).toBe(true)
    })

    it("should assign batch of tasks", () => {
      const tasks = [
        createTestTask({ taskId: "1", category: "sante" }),
        createTestTask({ taskId: "2", category: "ecole" }),
        createTestTask({ taskId: "3", category: "quotidien" }),
      ]
      const members = [
        createTestMember({ userId: "1", userName: "Alice" }),
        createTestMember({ userId: "2", userName: "Bob" }),
      ]
      const tracker = createRotationTracker()

      const result = assignTasksBatch(tasks, members, [], tracker)

      expect(result.assignments.length).toBe(3)
      expect(result.unassigned.length).toBe(0)
    })
  })

  describe("Rotation Tracker", () => {
    it("should create empty tracker", () => {
      const tracker = createRotationTracker()
      expect(tracker.categoryLastAssigned.size).toBe(0)
    })

    it("should update tracker after assignment", () => {
      const tracker = createRotationTracker()
      updateRotationTracker(tracker, "user-1", "sante")

      expect(tracker.categoryLastAssigned.has("sante")).toBe(true)
    })

    it("should get rotation status", () => {
      const tracker = createRotationTracker()
      updateRotationTracker(tracker, "user-1", "sante")
      updateRotationTracker(tracker, "user-2", "sante")

      const status = getCategoryRotationStatus(tracker, "sante")
      expect(status.length).toBe(2)
    })
  })

  describe("Exclusion Periods", () => {
    it("should add exclusion period", () => {
      const member = createTestMember()
      const updated = addExclusionPeriod(member, {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reason: "Vacances",
      })

      expect(updated.exclusionPeriods.length).toBe(1)
    })

    it("should cleanup expired exclusions", () => {
      const member = createTestMember({
        exclusionPeriods: [
          {
            startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const cleaned = cleanupExclusionPeriods(member)
      expect(cleaned.exclusionPeriods.length).toBe(0)
    })

    it("should get upcoming exclusions", () => {
      const member = createTestMember({
        exclusionPeriods: [
          {
            startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      const upcoming = getUpcomingExclusions(member, 7)
      expect(upcoming.length).toBe(1)
    })
  })

  describe("Reassignment Suggestions", () => {
    it("should suggest reassignments for imbalance", () => {
      const assignments = [
        { taskId: "1", title: "Task 1", category: "quotidien", assignedTo: "1", weight: 5 },
        { taskId: "2", title: "Task 2", category: "quotidien", assignedTo: "1", weight: 5 },
        { taskId: "3", title: "Task 3", category: "quotidien", assignedTo: "1", weight: 5 },
      ]

      const members = [
        createTestMember({ userId: "1", userName: "Alice", currentLoad: 15 }),
        createTestMember({ userId: "2", userName: "Bob", currentLoad: 0 }),
      ]

      const suggestions = suggestReassignments(assignments, members)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]!.fromUserId).toBe("1")
      expect(suggestions[0]!.toUserId).toBe("2")
    })
  })

  describe("Stats Helpers", () => {
    it("should calculate assignment stats", () => {
      const results = [
        {
          taskId: "1",
          assignedTo: "1",
          assignedToName: "Alice",
          score: { userId: "1", userName: "Alice", totalScore: 80, components: { loadBalance: 80, categoryPreference: 80, skillMatch: 80, availability: 80, rotation: 80, fatigue: 80 }, eligible: true },
          alternativeCandidates: [],
          wasForced: false,
          explanation: [],
        },
        {
          taskId: "2",
          assignedTo: "2",
          assignedToName: "Bob",
          score: { userId: "2", userName: "Bob", totalScore: 70, components: { loadBalance: 70, categoryPreference: 70, skillMatch: 70, availability: 70, rotation: 70, fatigue: 70 }, eligible: true },
          alternativeCandidates: [],
          wasForced: true,
          explanation: [],
        },
      ]

      const stats = getAssignmentStats(results)
      expect(stats.total).toBe(2)
      expect(stats.forced).toBe(1)
      expect(stats.averageScore).toBe(75)
      expect(stats.byUser["Alice"]).toBe(1)
    })
  })
})

// =============================================================================
// BALANCE ALERTS TESTS
// =============================================================================

describe("Balance Alerts", () => {
  describe("Balance Status Analysis", () => {
    it("should return balanced for equal distribution", () => {
      const users = [
        {
          userId: "1",
          userName: "Alice",
          currentLoad: 10,
          weeklyLoad: 50,
          monthlyLoad: 200,
          loadTrend: "stable" as const,
          fatigueLevel: 20,
          balancePercentage: 50,
          pendingTasks: 5,
          completedTasks: 10,
          categoryBreakdown: {},
        },
        {
          userId: "2",
          userName: "Bob",
          currentLoad: 10,
          weeklyLoad: 50,
          monthlyLoad: 200,
          loadTrend: "stable" as const,
          fatigueLevel: 20,
          balancePercentage: 50,
          pendingTasks: 5,
          completedTasks: 10,
          categoryBreakdown: {},
        },
      ]

      const status = analyzeBalanceStatus("household-1", users)
      expect(status.status).toBe("balanced")
      expect(status.balanceScore).toBeGreaterThanOrEqual(70)
    })

    it("should detect critical imbalance", () => {
      const users = [
        {
          userId: "1",
          userName: "Alice",
          currentLoad: 18,
          weeklyLoad: 90,
          monthlyLoad: 360,
          loadTrend: "stable" as const,
          fatigueLevel: 60,
          balancePercentage: 90,
          pendingTasks: 10,
          completedTasks: 20,
          categoryBreakdown: {},
        },
        {
          userId: "2",
          userName: "Bob",
          currentLoad: 2,
          weeklyLoad: 10,
          monthlyLoad: 40,
          loadTrend: "stable" as const,
          fatigueLevel: 10,
          balancePercentage: 10,
          pendingTasks: 1,
          completedTasks: 2,
          categoryBreakdown: {},
        },
      ]

      const status = analyzeBalanceStatus("household-1", users)
      expect(status.status).not.toBe("balanced")
      expect(status.alerts.length).toBeGreaterThan(0)
    })

    it("should generate recommendations", () => {
      const users = [
        {
          userId: "1",
          userName: "Alice",
          currentLoad: 18,
          weeklyLoad: 90,
          monthlyLoad: 360,
          loadTrend: "stable" as const,
          fatigueLevel: 40,
          balancePercentage: 75,
          pendingTasks: 10,
          completedTasks: 20,
          categoryBreakdown: {},
        },
        {
          userId: "2",
          userName: "Bob",
          currentLoad: 6,
          weeklyLoad: 30,
          monthlyLoad: 120,
          loadTrend: "stable" as const,
          fatigueLevel: 10,
          balancePercentage: 25,
          pendingTasks: 3,
          completedTasks: 5,
          categoryBreakdown: {},
        },
      ]

      const status = analyzeBalanceStatus("household-1", users)
      expect(status.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe("Message Generation", () => {
    it("should generate non-culpabilizing alert messages", () => {
      const message = generateAlertMessage("imbalance", "medium", "Alice")
      expect(message).not.toContain("faute")
      expect(message).not.toContain("coupable")
      expect(message.length).toBeGreaterThan(0)
    })

    it("should generate positive messages", () => {
      const message = generatePositiveMessage("balanced")
      expect(message.length).toBeGreaterThan(0)
    })

    it("should generate recommendation messages", () => {
      const message = generateRecommendationMessage("reassign", "Alice", "Bob")
      expect(message).toContain("Alice")
      expect(message).toContain("Bob")
    })
  })

  describe("Weekly Digest", () => {
    it("should generate weekly digest", () => {
      const users = [
        {
          userId: "1",
          userName: "Alice",
          currentLoad: 10,
          weeklyLoad: 50,
          monthlyLoad: 200,
          loadTrend: "stable" as const,
          fatigueLevel: 20,
          balancePercentage: 50,
          pendingTasks: 5,
          completedTasks: 10,
          categoryBreakdown: {},
        },
      ]

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const entries: HistoricalLoadEntry[] = [
        createTestHistoricalEntry({ userId: "1", wasCompleted: true }),
      ]

      const digest = generateWeeklyDigest("household-1", users, entries, weekStart, weekEnd)

      expect(digest.householdId).toBe("household-1")
      expect(digest.memberStats.length).toBe(1)
      expect(digest.summary).toBeDefined()
    })
  })

  describe("Trend Analysis", () => {
    it("should analyze load trend", () => {
      const entries: HistoricalLoadEntry[] = []
      const now = new Date()

      for (let i = 0; i < 14; i++) {
        entries.push(
          createTestHistoricalEntry({
            userId: "1",
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            weight: 3,
          })
        )
      }

      const trend = analyzeTrend("1", "Alice", entries)

      expect(trend.userId).toBe("1")
      expect(trend.userName).toBe("Alice")
      expect(["decreasing", "stable", "increasing"]).toContain(trend.direction)
      expect(trend.narrative.length).toBeGreaterThan(0)
    })
  })

  describe("Notifications", () => {
    it("should create alert notification", () => {
      const alert = {
        type: "fatigue" as const,
        severity: "high" as const,
        userId: "1",
        userName: "Alice",
        message: "Alice montre des signes de fatigue",
        metric: 75,
      }

      const notification = createAlertNotification(alert, "household-1")

      expect(notification.type).toBe("alert")
      expect(notification.severity).toBe("high")
      expect(notification.body).toBe(alert.message)
    })

    it("should create digest notification", () => {
      const digest = {
        householdId: "household-1",
        weekNumber: 1,
        year: 2024,
        periodStart: new Date(),
        periodEnd: new Date(),
        summary: {
          totalTasks: 20,
          completedTasks: 18,
          completionRate: 90,
          balanceScore: 85,
          trend: "stable" as const,
        },
        memberStats: [],
        alerts: [],
        positiveNotes: [],
        suggestions: [],
        generatedAt: new Date(),
      }

      const notification = createDigestNotification(digest)

      expect(notification.type).toBe("digest")
      expect(notification.title).toContain("semaine 1")
    })
  })
})
