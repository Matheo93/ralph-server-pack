/**
 * Family Insights Tests
 * Tests for analytics, comparisons, and recommendations
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  familyAnalytics,
  getDateRange,
  getPeriodKey,
  filterTasksByDateRange,
  calculateCompletionRate,
  calculateOnTimeRate,
  calculateAverageCompletionTime,
  calculateStreak,
  calculatePoints,
  calculateMemberStats,
  getCategories,
  calculateCategoryStats,
  calculateAllCategoryStats,
  calculateTimeDistribution,
  calculatePercentageChange,
  calculateCompletionRateTrend,
  calculateProductivityTrend,
  calculateEngagementTrend,
  generateFamilyInsights,
  type Member,
  type TaskRecord,
  type TimeRange,
} from "@/lib/insights/family-analytics"

import {
  comparisonEngine,
  METRIC_LABELS,
  getMetricValue,
  createRanking,
  generateLeaderboard,
  generateAllLeaderboards,
  compareValues,
  compareTwoMembers,
  calculateExpectedShare,
  calculateActualShare,
  analyzeFairShare,
  ACHIEVEMENTS,
  checkAchievementEligibility,
  calculateUnlockedAchievements,
  createCompetition,
  updateCompetitionStandings,
  type MemberPerformance,
  type ComparisonMetric,
} from "@/lib/insights/comparison-engine"

import {
  recommendationEngine,
  calculateMemberTaskFit,
  recommendTaskAssignment,
  calculateWorkloadImbalance,
  generateWorkloadBalanceRecommendations,
  determineBestTime,
  generateScheduleRecommendation,
  analyzeCategoryPerformance,
  generateCategoryFocusRecommendations,
  generateMotivationRecommendations,
  generateEfficiencyRecommendations,
  generateCollaborationRecommendations,
  generateAllRecommendations,
  getTopRecommendations,
  dismissRecommendation,
  type MemberProfile,
  type TaskContext,
  type FamilyContext,
  type Recommendation,
} from "@/lib/insights/recommendation-engine"

// =============================================================================
// FAMILY ANALYTICS TESTS
// =============================================================================

describe("Family Analytics", () => {
  // ---------------------------------------------------------------------------
  // Date Utilities
  // ---------------------------------------------------------------------------

  describe("Date Utilities", () => {
    it("should get date range for day", () => {
      const ref = new Date("2024-06-15T12:00:00Z")
      const { start, end } = getDateRange("day", ref)

      expect(start.getDate()).toBe(15)
      expect(end.getDate()).toBe(15)
    })

    it("should get date range for week", () => {
      const ref = new Date("2024-06-15T12:00:00Z") // Saturday
      const { start } = getDateRange("week", ref)

      // Should be Monday of that week
      expect(start.getDay()).toBe(1) // Monday
    })

    it("should get date range for month", () => {
      const ref = new Date("2024-06-15T12:00:00Z")
      const { start } = getDateRange("month", ref)

      expect(start.getDate()).toBe(1)
      expect(start.getMonth()).toBe(5) // June
    })

    it("should get period key for day", () => {
      const date = new Date("2024-06-15T12:00:00Z")
      const key = getPeriodKey(date, "day")
      expect(key).toBe("2024-06-15")
    })

    it("should get period key for month", () => {
      const date = new Date("2024-06-15T12:00:00Z")
      const key = getPeriodKey(date, "month")
      expect(key).toBe("2024-06")
    })

    it("should filter tasks by date range", () => {
      const tasks = [
        createTestTask({ createdAt: new Date("2024-06-10") }),
        createTestTask({ createdAt: new Date("2024-06-15") }),
        createTestTask({ createdAt: new Date("2024-06-20") }),
      ]

      const filtered = filterTasksByDateRange(
        tasks,
        new Date("2024-06-12"),
        new Date("2024-06-18")
      )

      expect(filtered.length).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Member Statistics
  // ---------------------------------------------------------------------------

  describe("Member Statistics", () => {
    it("should calculate completion rate", () => {
      expect(calculateCompletionRate(8, 10)).toBe(80)
      expect(calculateCompletionRate(0, 10)).toBe(0)
      expect(calculateCompletionRate(0, 0)).toBe(0)
    })

    it("should calculate on-time rate", () => {
      const tasks = [
        createTestTask({
          status: "completed",
          deadline: new Date("2024-06-15"),
          completedAt: new Date("2024-06-14"), // On time
        }),
        createTestTask({
          status: "completed",
          deadline: new Date("2024-06-15"),
          completedAt: new Date("2024-06-16"), // Late
        }),
      ]

      const rate = calculateOnTimeRate(tasks)
      expect(rate).toBe(50)
    })

    it("should calculate average completion time", () => {
      const tasks = [
        createTestTask({ status: "completed", actualMinutes: 30 }),
        createTestTask({ status: "completed", actualMinutes: 60 }),
      ]

      const avg = calculateAverageCompletionTime(tasks)
      expect(avg).toBe(45)
    })

    it("should calculate streak", () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)

      const dates = [today, yesterday, twoDaysAgo]
      const { current, longest } = calculateStreak(dates, today)

      expect(current).toBeGreaterThanOrEqual(2)
      expect(longest).toBeGreaterThanOrEqual(current)
    })

    it("should calculate points", () => {
      const stats = {
        tasksCompleted: 10,
        onTimeRate: 80,
        streak: 5,
      }

      const points = calculatePoints(stats)
      expect(points).toBeGreaterThan(100) // Base + bonuses
    })

    it("should calculate member stats", () => {
      const member = createTestMember()
      const tasks = [
        createTestTask({ assigneeId: member.id, status: "completed" }),
        createTestTask({ assigneeId: member.id, status: "pending" }),
      ]

      const stats = calculateMemberStats(member, tasks)

      expect(stats.tasksAssigned).toBe(2)
      expect(stats.tasksCompleted).toBe(1)
      expect(stats.completionRate).toBe(50)
    })
  })

  // ---------------------------------------------------------------------------
  // Category Statistics
  // ---------------------------------------------------------------------------

  describe("Category Statistics", () => {
    it("should get unique categories", () => {
      const tasks = [
        createTestTask({ category: "Ménage" }),
        createTestTask({ category: "Cuisine" }),
        createTestTask({ category: "Ménage" }),
      ]

      const categories = getCategories(tasks)
      expect(categories).toHaveLength(2)
      expect(categories).toContain("Ménage")
      expect(categories).toContain("Cuisine")
    })

    it("should calculate category stats", () => {
      const tasks = [
        createTestTask({ category: "Ménage", status: "completed", actualMinutes: 30 }),
        createTestTask({ category: "Ménage", status: "completed", actualMinutes: 60 }),
        createTestTask({ category: "Ménage", status: "pending" }),
      ]

      const stats = calculateCategoryStats("Ménage", tasks)

      expect(stats.totalTasks).toBe(3)
      expect(stats.completedTasks).toBe(2)
      expect(stats.completionRate).toBe(67)
      expect(stats.averageTimeMinutes).toBe(45)
    })
  })

  // ---------------------------------------------------------------------------
  // Time Distribution
  // ---------------------------------------------------------------------------

  describe("Time Distribution", () => {
    it("should calculate time distribution by day", () => {
      const tasks = [
        createTestTask({ createdAt: new Date("2024-06-15"), status: "completed" }),
        createTestTask({ createdAt: new Date("2024-06-15"), status: "completed" }),
        createTestTask({ createdAt: new Date("2024-06-16"), status: "pending" }),
      ]

      const distribution = calculateTimeDistribution(tasks, "day")

      expect(distribution.length).toBe(2)
      const day15 = distribution.find((d) => d.period === "2024-06-15")
      expect(day15?.tasksCreated).toBe(2)
      expect(day15?.tasksCompleted).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Trends
  // ---------------------------------------------------------------------------

  describe("Trends", () => {
    it("should calculate percentage change", () => {
      expect(calculatePercentageChange(120, 100)).toBe(20)
      expect(calculatePercentageChange(80, 100)).toBe(-20)
      expect(calculatePercentageChange(100, 0)).toBe(100)
    })

    it("should calculate completion rate trend", () => {
      const current = [
        createTestTask({ status: "completed" }),
        createTestTask({ status: "completed" }),
        createTestTask({ status: "pending" }),
      ]

      const previous = [
        createTestTask({ status: "completed" }),
        createTestTask({ status: "pending" }),
      ]

      const trend = calculateCompletionRateTrend(current, previous)
      expect(trend.current).toBe(67)
      expect(trend.previous).toBe(50)
      expect(trend.change).toBe(17)
    })
  })

  // ---------------------------------------------------------------------------
  // Full Insights
  // ---------------------------------------------------------------------------

  describe("Full Insights", () => {
    it("should generate complete family insights", () => {
      const members = [createTestMember(), createTestMember({ id: "m2", name: "Bob" })]
      const tasks = [
        createTestTask({ assigneeId: "m1", status: "completed", category: "Ménage" }),
        createTestTask({ assigneeId: "m2", status: "pending", category: "Cuisine" }),
      ]

      const insights = generateFamilyInsights(
        "household_1",
        members,
        tasks,
        "week"
      )

      expect(insights.householdId).toBe("household_1")
      expect(insights.summary.totalTasks).toBe(2)
      expect(insights.memberStats.length).toBe(2)
      expect(insights.categoryStats.length).toBe(2)
    })
  })
})

// =============================================================================
// COMPARISON ENGINE TESTS
// =============================================================================

describe("Comparison Engine", () => {
  // ---------------------------------------------------------------------------
  // Ranking
  // ---------------------------------------------------------------------------

  describe("Ranking", () => {
    it("should get metric value", () => {
      const perf = createTestPerformance()
      expect(getMetricValue(perf, "completion_rate")).toBe(perf.metrics.completionRate)
      expect(getMetricValue(perf, "points")).toBe(perf.metrics.points)
    })

    it("should create ranking", () => {
      const performances = [
        createTestPerformance({ memberId: "m1", completionRate: 90 }),
        createTestPerformance({ memberId: "m2", completionRate: 70 }),
        createTestPerformance({ memberId: "m3", completionRate: 80 }),
      ]

      const ranking = createRanking(performances, "completion_rate")

      expect(ranking[0]!.memberId).toBe("m1")
      expect(ranking[0]!.rank).toBe(1)
      expect(ranking[0]!.medal).toBe("gold")

      expect(ranking[1]!.memberId).toBe("m3")
      expect(ranking[1]!.rank).toBe(2)

      expect(ranking[2]!.memberId).toBe("m2")
      expect(ranking[2]!.rank).toBe(3)
    })

    it("should handle ties in ranking", () => {
      const performances = [
        createTestPerformance({ memberId: "m1", completionRate: 80 }),
        createTestPerformance({ memberId: "m2", completionRate: 80 }),
      ]

      const ranking = createRanking(performances, "completion_rate")

      expect(ranking[0]!.rank).toBe(1)
      expect(ranking[1]!.rank).toBe(1) // Tie
    })

    it("should generate leaderboard", () => {
      const performances = [
        createTestPerformance({ memberId: "m1" }),
        createTestPerformance({ memberId: "m2" }),
      ]

      const leaderboard = generateLeaderboard(
        performances,
        "completion_rate",
        "2024-W25"
      )

      expect(leaderboard.metric).toBe("completion_rate")
      expect(leaderboard.period).toBe("2024-W25")
      expect(leaderboard.entries.length).toBe(2)
    })

    it("should generate all leaderboards", () => {
      const performances = [createTestPerformance()]
      const leaderboards = generateAllLeaderboards(performances, "2024-W25")

      expect(leaderboards.length).toBe(7) // 7 metrics
    })
  })

  // ---------------------------------------------------------------------------
  // Head-to-Head
  // ---------------------------------------------------------------------------

  describe("Head-to-Head Comparison", () => {
    it("should compare two values", () => {
      const { winner, difference, percentageDiff } = compareValues(80, 60)

      expect(winner).toBe("A")
      expect(difference).toBe(20)
      expect(percentageDiff).toBe(33)
    })

    it("should detect tie", () => {
      const { winner } = compareValues(50, 50)
      expect(winner).toBe("tie")
    })

    it("should compare two members", () => {
      const memberA = createTestPerformance({
        memberId: "m1",
        memberName: "Alice",
        completionRate: 90,
        tasksCompleted: 20,
      })

      const memberB = createTestPerformance({
        memberId: "m2",
        memberName: "Bob",
        completionRate: 70,
        tasksCompleted: 25,
      })

      const result = compareTwoMembers(memberA, memberB)

      expect(result.memberA.memberId).toBe("m1")
      expect(result.memberB.memberId).toBe("m2")
      expect(result.comparison.metricComparisons.length).toBe(7)
      expect(result.comparison.overallScore.memberA).toBeGreaterThanOrEqual(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Fair Share
  // ---------------------------------------------------------------------------

  describe("Fair Share Analysis", () => {
    it("should calculate expected share for parent", () => {
      const share = calculateExpectedShare("parent", null, 4)
      expect(share).toBeGreaterThan(25) // More than equal share
    })

    it("should calculate expected share for child", () => {
      const share = calculateExpectedShare("child", 10, 4)
      expect(share).toBeLessThan(25) // Less than equal share
    })

    it("should calculate actual share", () => {
      expect(calculateActualShare(3, 10)).toBe(30)
      expect(calculateActualShare(0, 0)).toBe(0)
    })

    it("should analyze fair share", () => {
      const performances = [
        createTestPerformance({ memberId: "m1", memberName: "Parent", tasksCompleted: 15 }),
        createTestPerformance({ memberId: "m2", memberName: "Child", tasksCompleted: 5 }),
      ]

      const members = [
        { id: "m1", role: "parent", age: null },
        { id: "m2", role: "child", age: 12 },
      ]

      const fairShare = analyzeFairShare(performances, members)

      expect(fairShare.length).toBe(2)
      expect(fairShare.every((fs) => fs.status !== undefined)).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Achievements
  // ---------------------------------------------------------------------------

  describe("Achievements", () => {
    it("should have defined achievements", () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThan(0)
      expect(ACHIEVEMENTS.every((a) => a.id && a.name && a.icon)).toBe(true)
    })

    it("should check achievement eligibility", () => {
      const performance = createTestPerformance({ tasksCompleted: 15 })

      expect(checkAchievementEligibility(
        ACHIEVEMENTS.find((a) => a.id === "first_task")!,
        performance
      )).toBe(true)

      expect(checkAchievementEligibility(
        ACHIEVEMENTS.find((a) => a.id === "ten_tasks")!,
        performance
      )).toBe(true)

      expect(checkAchievementEligibility(
        ACHIEVEMENTS.find((a) => a.id === "fifty_tasks")!,
        performance
      )).toBe(false)
    })

    it("should calculate unlocked achievements", () => {
      const performance = createTestPerformance({
        tasksCompleted: 55,
        streak: 8,
      })
      performance.metrics.streak = 8

      const unlocked = calculateUnlockedAchievements("m1", performance)

      expect(unlocked.length).toBeGreaterThan(0)
      expect(unlocked.some((a) => a.id === "fifty_tasks")).toBe(true)
      expect(unlocked.some((a) => a.id === "streak_7")).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Competition
  // ---------------------------------------------------------------------------

  describe("Competition", () => {
    it("should create competition", () => {
      const competition = createCompetition({
        name: "Défi Semaine",
        description: "Qui complétera le plus de tâches ?",
        metric: "tasks_completed",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        participants: ["m1", "m2"],
        prize: "Choix du film du weekend",
      })

      expect(competition.id).toBeDefined()
      expect(competition.isActive).toBe(true)
      expect(competition.participants.length).toBe(2)
    })

    it("should update competition standings", () => {
      const competition = createCompetition({
        name: "Test",
        description: "Test",
        metric: "tasks_completed",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        participants: ["m1", "m2"],
      })

      const performances = [
        createTestPerformance({ memberId: "m1", tasksCompleted: 10 }),
        createTestPerformance({ memberId: "m2", tasksCompleted: 15 }),
      ]

      const updated = updateCompetitionStandings(competition, performances)

      expect(updated.standings.length).toBe(2)
      expect(updated.standings[0]!.memberId).toBe("m2")
    })
  })
})

// =============================================================================
// RECOMMENDATION ENGINE TESTS
// =============================================================================

describe("Recommendation Engine", () => {
  // ---------------------------------------------------------------------------
  // Task Assignment
  // ---------------------------------------------------------------------------

  describe("Task Assignment", () => {
    it("should calculate member-task fit", () => {
      const member = createTestMemberProfile({
        preferredCategories: ["Ménage"],
        strengths: ["organisation"],
        currentWorkload: 30,
        completionRate: 80,
      })

      const task = createTestTaskContext({
        category: "Ménage",
        skills: ["organisation"],
      })

      const score = calculateMemberTaskFit(member, task)
      expect(score).toBeGreaterThan(50)
    })

    it("should recommend task assignment", () => {
      const members = [
        createTestMemberProfile({
          id: "m1",
          preferredCategories: ["Ménage"],
          currentWorkload: 20,
        }),
        createTestMemberProfile({
          id: "m2",
          preferredCategories: ["Cuisine"],
          currentWorkload: 80,
        }),
      ]

      const task = createTestTaskContext({ category: "Ménage" })

      const recommendation = recommendTaskAssignment(task, members)

      expect(recommendation).not.toBeNull()
      expect(recommendation!.targetMemberId).toBe("m1")
    })
  })

  // ---------------------------------------------------------------------------
  // Workload Balance
  // ---------------------------------------------------------------------------

  describe("Workload Balance", () => {
    it("should calculate workload imbalance", () => {
      const members = [
        createTestMemberProfile({ currentWorkload: 90 }),
        createTestMemberProfile({ currentWorkload: 30 }),
        createTestMemberProfile({ currentWorkload: 50 }),
      ]

      const { overloaded, underloaded, averageWorkload } = calculateWorkloadImbalance(members)

      expect(averageWorkload).toBeCloseTo(56.67, 0)
      expect(overloaded.length).toBe(1)
      expect(underloaded.length).toBe(1)
    })

    it("should generate workload balance recommendations", () => {
      const context = createTestFamilyContext({
        members: [
          createTestMemberProfile({ id: "m1", currentWorkload: 90 }),
          createTestMemberProfile({ id: "m2", currentWorkload: 30 }),
        ],
      })

      const recommendations = generateWorkloadBalanceRecommendations(context)

      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0]!.type).toBe("workload_balance")
    })
  })

  // ---------------------------------------------------------------------------
  // Schedule
  // ---------------------------------------------------------------------------

  describe("Schedule Recommendations", () => {
    it("should determine best time", () => {
      const task = createTestTaskContext({ preferredTime: "morning" })
      const member = createTestMemberProfile({
        availableHours: [8, 9, 10, 11, 14, 15],
      })

      const { time, confidence } = determineBestTime(task, member)

      expect(time).toBe("morning")
      expect(confidence).toBeGreaterThan(0.5)
    })

    it("should generate schedule recommendation", () => {
      const task = createTestTaskContext({
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      })
      const member = createTestMemberProfile()

      const recommendation = generateScheduleRecommendation(task, member)

      expect(recommendation).not.toBeNull()
      expect(recommendation!.type).toBe("schedule")
    })

    it("should generate urgent recommendation for overdue task", () => {
      const task = createTestTaskContext({
        deadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      })
      const member = createTestMemberProfile()

      const recommendation = generateScheduleRecommendation(task, member)

      expect(recommendation).not.toBeNull()
      expect(recommendation!.priority).toBe("urgent")
    })
  })

  // ---------------------------------------------------------------------------
  // Category Focus
  // ---------------------------------------------------------------------------

  describe("Category Focus", () => {
    it("should analyze category performance", () => {
      const context = createTestFamilyContext({
        categoryDistribution: {
          Ménage: 10,
          Cuisine: 2,
          Courses: 8,
        },
      })

      const { neglected, overrepresented } = analyzeCategoryPerformance(context)

      expect(neglected).toContain("Cuisine")
      expect(overrepresented.length).toBe(0) // None significantly over
    })
  })

  // ---------------------------------------------------------------------------
  // Motivation
  // ---------------------------------------------------------------------------

  describe("Motivation Recommendations", () => {
    it("should generate motivation for declining member", () => {
      const context = createTestFamilyContext({
        members: [
          createTestMemberProfile({ id: "m1", recentTrend: "declining" }),
        ],
      })

      const recommendations = generateMotivationRecommendations(context)

      expect(recommendations.some((r) => r.type === "motivation")).toBe(true)
    })

    it("should celebrate improving member", () => {
      const context = createTestFamilyContext({
        members: [
          createTestMemberProfile({ id: "m1", recentTrend: "improving" }),
        ],
      })

      const recommendations = generateMotivationRecommendations(context)

      expect(recommendations.some(
        (r) => r.type === "motivation" && r.title.includes("Féliciter")
      )).toBe(true)
    })

    it("should note weekly goal achievement", () => {
      const context = createTestFamilyContext({
        weeklyGoal: 20,
        currentProgress: 25,
      })

      const recommendations = generateMotivationRecommendations(context)

      expect(recommendations.some(
        (r) => r.title.includes("atteint")
      )).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Efficiency
  // ---------------------------------------------------------------------------

  describe("Efficiency Recommendations", () => {
    it("should flag overdue tasks", () => {
      const context = createTestFamilyContext({
        overdueTasks: 3,
      })

      const recommendations = generateEfficiencyRecommendations(context)

      expect(recommendations.some(
        (r) => r.type === "efficiency" && r.title.includes("retard")
      )).toBe(true)
    })

    it("should flag low completion rate", () => {
      const context = createTestFamilyContext({
        averageCompletionRate: 45,
      })

      const recommendations = generateEfficiencyRecommendations(context)

      expect(recommendations.some(
        (r) => r.title.includes("Taux de complétion")
      )).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Collaboration
  // ---------------------------------------------------------------------------

  describe("Collaboration Recommendations", () => {
    it("should suggest pairing for big tasks", () => {
      const context = createTestFamilyContext({
        members: [
          createTestMemberProfile({ id: "m1" }),
          createTestMemberProfile({ id: "m2" }),
        ],
        pendingTasks: [
          createTestTaskContext({ estimatedMinutes: 90 }),
        ],
      })

      const recommendations = generateCollaborationRecommendations(context)

      expect(recommendations.some(
        (r) => r.type === "collaboration"
      )).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Full Recommendations
  // ---------------------------------------------------------------------------

  describe("Full Recommendations", () => {
    it("should generate all recommendations", () => {
      const context = createTestFamilyContext()
      const recommendations = generateAllRecommendations(context)

      expect(recommendations.length).toBeGreaterThan(0)
    })

    it("should sort recommendations by priority", () => {
      const context = createTestFamilyContext({
        overdueTasks: 5, // Should generate high priority
        members: [createTestMemberProfile({ recentTrend: "improving" })], // Low priority
      })

      const recommendations = generateAllRecommendations(context)

      // First recommendations should be higher priority
      const priorities = recommendations.map((r) => r.priority)
      const urgentIndex = priorities.indexOf("urgent")
      const lowIndex = priorities.indexOf("low")

      if (urgentIndex >= 0 && lowIndex >= 0) {
        expect(urgentIndex).toBeLessThan(lowIndex)
      }
    })

    it("should get top recommendations", () => {
      const context = createTestFamilyContext()
      const all = generateAllRecommendations(context)
      const top = getTopRecommendations(all, 3)

      expect(top.length).toBeLessThanOrEqual(3)
    })

    it("should dismiss recommendation", () => {
      const context = createTestFamilyContext()
      const recommendations = generateAllRecommendations(context)

      if (recommendations.length > 0) {
        const dismissed = dismissRecommendation(recommendations[0]!)
        expect(dismissed.dismissed).toBe(true)
      }
    })
  })
})

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    name: "Alice",
    role: "parent",
    age: 35,
    joinedAt: new Date("2024-01-01"),
    ...overrides,
  }
}

function createTestTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: `task_${Date.now()}`,
    title: "Test Task",
    category: null,
    priority: "medium",
    status: "pending",
    assigneeId: null,
    creatorId: "m1",
    estimatedMinutes: 30,
    actualMinutes: null,
    deadline: null,
    completedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function createTestPerformance(overrides: Partial<{
  memberId: string
  memberName: string
  role: string
  completionRate: number
  tasksCompleted: number
  timeContributedMinutes: number
  onTimeRate: number
  streak: number
  points: number
  productivity: number
}> = {}): MemberPerformance {
  return {
    memberId: overrides.memberId ?? "m1",
    memberName: overrides.memberName ?? "Alice",
    role: overrides.role ?? "parent",
    metrics: {
      completionRate: overrides.completionRate ?? 75,
      tasksCompleted: overrides.tasksCompleted ?? 10,
      timeContributedMinutes: overrides.timeContributedMinutes ?? 300,
      onTimeRate: overrides.onTimeRate ?? 80,
      streak: overrides.streak ?? 3,
      points: overrides.points ?? 150,
      productivity: overrides.productivity ?? 2.5,
    },
  }
}

function createTestMemberProfile(overrides: Partial<MemberProfile> = {}): MemberProfile {
  return {
    id: "m1",
    name: "Alice",
    role: "parent",
    age: 35,
    preferredCategories: ["Ménage", "Cuisine"],
    availableHours: [8, 9, 10, 14, 15, 18, 19],
    strengths: ["organisation", "cuisine"],
    currentWorkload: 50,
    completionRate: 75,
    recentTrend: "stable",
    ...overrides,
  }
}

function createTestTaskContext(overrides: Partial<TaskContext> = {}): TaskContext {
  return {
    id: `task_${Date.now()}`,
    title: "Test Task",
    category: null,
    priority: "medium",
    estimatedMinutes: 30,
    deadline: null,
    skills: [],
    preferredTime: null,
    ...overrides,
  }
}

function createTestFamilyContext(overrides: Partial<FamilyContext> = {}): FamilyContext {
  return {
    householdId: "household_1",
    members: overrides.members ?? [createTestMemberProfile()],
    pendingTasks: overrides.pendingTasks ?? [createTestTaskContext()],
    averageCompletionRate: overrides.averageCompletionRate ?? 70,
    overdueTasks: overrides.overdueTasks ?? 0,
    categoryDistribution: overrides.categoryDistribution ?? { Ménage: 5, Cuisine: 3 },
    weeklyGoal: overrides.weeklyGoal ?? 20,
    currentProgress: overrides.currentProgress ?? 15,
    ...overrides,
  }
}
