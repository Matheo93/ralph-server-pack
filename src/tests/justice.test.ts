/**
 * Family Justice Module Tests
 *
 * Tests for:
 * - Fairness calculator (Gini coefficient, exclusions, categories)
 * - Messaging engine (non-culpabilizing messages)
 * - Report generator (weekly/monthly reports)
 */

import { describe, it, expect } from "vitest"
import {
  // Fairness Calculator
  calculateGini,
  giniToFairnessScore,
  calculateMemberLoads,
  calculateFairnessScore,
  calculateFairnessTrend,
  getFairnessStatus,
  analyzeCategoryFairness,
  getAllCategoryFairness,
  calculateExclusionAdjustment,
  getFairnessStatusLabel,
  getFairnessStatusColor,
  getTrendLabel,
  formatFairnessScore,
  type TaskCompletion,
  type MemberExclusion,
  type MemberLoad,
  // Messaging Engine
  generateEncouragementMessage,
  generateCelebrationMessage,
  generateSuggestionMessage,
  generateObservationMessage,
  generateScoreBasedMessages,
  generateMemberMessages,
  generateWeeklySummary,
  generateNotificationMessage,
  generateEmailSubject,
  // Report Generator
  generateWeeklyReport,
  generateMonthlyReport,
  formatWeeklyReportHTML,
  formatWeeklyReportMarkdown,
  createReportDelivery,
  markDeliverySent,
  markDeliveryFailed,
  generateWeeklyReportEmail,
  type WeeklyScoreData,
} from "@/lib/justice"

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestMemberLoad(overrides: Partial<MemberLoad> = {}): MemberLoad {
  return {
    userId: overrides.userId ?? "user-1",
    userName: overrides.userName ?? "Alice",
    tasksCompleted: overrides.tasksCompleted ?? 10,
    totalWeight: overrides.totalWeight ?? 30,
    percentage: overrides.percentage ?? 50,
    adjustedPercentage: overrides.adjustedPercentage ?? 50,
    exclusionDays: overrides.exclusionDays ?? 0,
    categoryBreakdown: overrides.categoryBreakdown ?? { menage: 15, cuisine: 15 },
  }
}

// =============================================================================
// GINI COEFFICIENT TESTS
// =============================================================================

describe("Gini Coefficient", () => {
  it("should return 0 for perfect equality", () => {
    const values = [25, 25, 25, 25]
    const gini = calculateGini(values)
    expect(gini).toBe(0)
  })

  it("should return close to 1 for perfect inequality", () => {
    const values = [100, 0, 0, 0]
    const gini = calculateGini(values)
    expect(gini).toBeGreaterThan(0.7)
  })

  it("should return 0 for empty array", () => {
    const gini = calculateGini([])
    expect(gini).toBe(0)
  })

  it("should return 0 for single value", () => {
    const gini = calculateGini([100])
    expect(gini).toBe(0)
  })

  it("should return moderate value for moderate inequality", () => {
    const values = [40, 30, 20, 10]
    const gini = calculateGini(values)
    expect(gini).toBeGreaterThan(0.1)
    expect(gini).toBeLessThan(0.5)
  })

  it("should handle all zeros", () => {
    const values = [0, 0, 0, 0]
    const gini = calculateGini(values)
    expect(gini).toBe(0)
  })
})

// =============================================================================
// GINI TO FAIRNESS SCORE TESTS
// =============================================================================

describe("Gini to Fairness Score", () => {
  it("should return 100 for gini 0", () => {
    const score = giniToFairnessScore(0)
    expect(score).toBe(100)
  })

  it("should return 0 for gini 1", () => {
    const score = giniToFairnessScore(1)
    expect(score).toBe(0)
  })

  it("should return 50 for gini 0.5", () => {
    const score = giniToFairnessScore(0.5)
    expect(score).toBe(50)
  })
})

// =============================================================================
// MEMBER LOAD TESTS
// =============================================================================

describe("Member Load Calculations", () => {
  it("should calculate basic member loads", () => {
    const taskCompletions: TaskCompletion[] = [
      { taskId: "1", userId: "user-1", category: "menage", weight: 3, completedAt: new Date() },
      { taskId: "2", userId: "user-1", category: "menage", weight: 2, completedAt: new Date() },
      { taskId: "3", userId: "user-2", category: "cuisine", weight: 5, completedAt: new Date() },
    ]

    const memberInfo = new Map([
      ["user-1", "Alice"],
      ["user-2", "Bob"],
    ])

    const periodStart = new Date("2024-01-01")
    const periodEnd = new Date("2024-01-07")

    const loads = calculateMemberLoads(taskCompletions, memberInfo, [], periodStart, periodEnd)

    expect(loads).toHaveLength(2)

    const alice = loads.find((l) => l.userId === "user-1")
    expect(alice).toBeDefined()
    expect(alice!.tasksCompleted).toBe(2)
    expect(alice!.totalWeight).toBe(5)

    const bob = loads.find((l) => l.userId === "user-2")
    expect(bob).toBeDefined()
    expect(bob!.tasksCompleted).toBe(1)
    expect(bob!.totalWeight).toBe(5)
  })

  it("should calculate percentages correctly", () => {
    const taskCompletions: TaskCompletion[] = [
      { taskId: "1", userId: "user-1", category: "menage", weight: 5, completedAt: new Date() },
      { taskId: "2", userId: "user-2", category: "cuisine", weight: 5, completedAt: new Date() },
    ]

    const memberInfo = new Map([
      ["user-1", "Alice"],
      ["user-2", "Bob"],
    ])

    const loads = calculateMemberLoads(taskCompletions, memberInfo, [], new Date(), new Date())

    expect(loads[0]!.percentage).toBe(50)
    expect(loads[1]!.percentage).toBe(50)
  })

  it("should handle empty task list with members", () => {
    const memberInfo = new Map([["user-1", "Alice"]])
    const loads = calculateMemberLoads([], memberInfo, [], new Date(), new Date())
    expect(loads).toHaveLength(1)
    expect(loads[0]!.percentage).toBe(0)
  })
})

// =============================================================================
// FAIRNESS STATUS TESTS
// =============================================================================

describe("Fairness Status", () => {
  it("should return excellent for high scores", () => {
    const status = getFairnessStatus(90)
    expect(status).toBe("excellent")
  })

  it("should return good for decent scores", () => {
    const status = getFairnessStatus(75)
    expect(status).toBe("good")
  })

  it("should return fair for mediocre scores", () => {
    const status = getFairnessStatus(60)
    expect(status).toBe("fair")
  })

  it("should return poor for low scores", () => {
    const status = getFairnessStatus(45)
    expect(status).toBe("poor")
  })

  it("should return critical for very low scores", () => {
    const status = getFairnessStatus(30)
    expect(status).toBe("critical")
  })
})

// =============================================================================
// FAIRNESS SCORE CALCULATION TESTS
// =============================================================================

describe("Fairness Score Calculation", () => {
  it("should calculate excellent score for balanced loads", () => {
    const taskCompletions: TaskCompletion[] = [
      { taskId: "1", userId: "user-1", category: "menage", weight: 5, completedAt: new Date() },
      { taskId: "2", userId: "user-2", category: "menage", weight: 5, completedAt: new Date() },
      { taskId: "3", userId: "user-3", category: "menage", weight: 5, completedAt: new Date() },
    ]

    const memberInfo = new Map([
      ["user-1", "Alice"],
      ["user-2", "Bob"],
      ["user-3", "Charlie"],
    ])

    const score = calculateFairnessScore(
      "household-1",
      taskCompletions,
      memberInfo,
      [],
      new Date("2024-01-01"),
      new Date("2024-01-07")
    )

    expect(score.status).toBe("excellent")
    expect(score.overallScore).toBeGreaterThan(80)
  })

  it("should calculate poor score for imbalanced loads", () => {
    const taskCompletions: TaskCompletion[] = [
      { taskId: "1", userId: "user-1", category: "menage", weight: 8, completedAt: new Date() },
      { taskId: "2", userId: "user-2", category: "menage", weight: 2, completedAt: new Date() },
    ]

    const memberInfo = new Map([
      ["user-1", "Alice"],
      ["user-2", "Bob"],
    ])

    const score = calculateFairnessScore(
      "household-1",
      taskCompletions,
      memberInfo,
      [],
      new Date("2024-01-01"),
      new Date("2024-01-07")
    )

    expect(score.overallScore).toBeLessThanOrEqual(70)
  })

  it("should include member loads in score", () => {
    const taskCompletions: TaskCompletion[] = [
      { taskId: "1", userId: "user-1", category: "menage", weight: 5, completedAt: new Date() },
    ]

    const memberInfo = new Map([["user-1", "Alice"]])

    const score = calculateFairnessScore(
      "household-1",
      taskCompletions,
      memberInfo,
      [],
      new Date("2024-01-01"),
      new Date("2024-01-07")
    )

    expect(score.memberLoads).toHaveLength(1)
    expect(score.memberLoads[0]!.userName).toBe("Alice")
  })
})

// =============================================================================
// EXCLUSION ADJUSTMENT TESTS
// =============================================================================

describe("Exclusion Adjustments", () => {
  it("should calculate exclusion days correctly", () => {
    const exclusions: MemberExclusion[] = [
      {
        userId: "user-1",
        startDate: new Date("2024-01-02"),
        endDate: new Date("2024-01-04"),
        reason: "Vacances",
      },
    ]

    const adjustment = calculateExclusionAdjustment(
      "user-1",
      exclusions,
      new Date("2024-01-01"),
      new Date("2024-01-07")
    )

    expect(adjustment.excludedDays).toBe(2)
    expect(adjustment.reason).toBe("Vacances")
  })

  it("should return 0 for no exclusions", () => {
    const adjustment = calculateExclusionAdjustment(
      "user-1",
      [],
      new Date("2024-01-01"),
      new Date("2024-01-07")
    )

    expect(adjustment.excludedDays).toBe(0)
    expect(adjustment.adjustmentFactor).toBe(1)
  })
})

// =============================================================================
// CATEGORY FAIRNESS TESTS
// =============================================================================

describe("Category Fairness Analysis", () => {
  it("should analyze category fairness", () => {
    const memberLoads: MemberLoad[] = [
      createTestMemberLoad({
        userId: "user-1",
        userName: "Alice",
        categoryBreakdown: { menage: 10, cuisine: 5 },
      }),
      createTestMemberLoad({
        userId: "user-2",
        userName: "Bob",
        categoryBreakdown: { menage: 10, cuisine: 5 },
      }),
    ]

    const analysis = analyzeCategoryFairness("menage", memberLoads)

    expect(analysis.category).toBe("menage")
    expect(analysis.totalWeight).toBe(20)
    expect(analysis.fairnessScore).toBeGreaterThan(80)
  })

  it("should detect imbalanced category", () => {
    const memberLoads: MemberLoad[] = [
      createTestMemberLoad({
        userId: "user-1",
        userName: "Alice",
        categoryBreakdown: { menage: 18 },
      }),
      createTestMemberLoad({
        userId: "user-2",
        userName: "Bob",
        categoryBreakdown: { menage: 2 },
      }),
    ]

    const analysis = analyzeCategoryFairness("menage", memberLoads)

    expect(analysis.fairnessScore).toBeLessThanOrEqual(60)
    expect(analysis.dominantMember).toBe("Alice")
  })

  it("should get all category fairness analyses", () => {
    const memberLoads: MemberLoad[] = [
      createTestMemberLoad({
        categoryBreakdown: { menage: 10, cuisine: 5 },
      }),
    ]

    const analyses = getAllCategoryFairness(memberLoads)

    expect(analyses).toHaveLength(2)
    expect(analyses.map((a) => a.category)).toContain("menage")
    expect(analyses.map((a) => a.category)).toContain("cuisine")
  })
})

// =============================================================================
// FAIRNESS TREND TESTS
// =============================================================================

describe("Fairness Trend", () => {
  it("should detect improving trend", () => {
    const periodicScores = [
      { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-07"), score: 50, gini: 0.5 },
      { startDate: new Date("2024-01-08"), endDate: new Date("2024-01-14"), score: 60, gini: 0.4 },
      { startDate: new Date("2024-01-15"), endDate: new Date("2024-01-21"), score: 70, gini: 0.3 },
      { startDate: new Date("2024-01-22"), endDate: new Date("2024-01-28"), score: 80, gini: 0.2 },
    ]

    const trend = calculateFairnessTrend("household-1", periodicScores)

    expect(trend.trend).toBe("improving")
  })

  it("should detect declining trend", () => {
    const periodicScores = [
      { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-07"), score: 80, gini: 0.2 },
      { startDate: new Date("2024-01-08"), endDate: new Date("2024-01-14"), score: 70, gini: 0.3 },
      { startDate: new Date("2024-01-15"), endDate: new Date("2024-01-21"), score: 60, gini: 0.4 },
      { startDate: new Date("2024-01-22"), endDate: new Date("2024-01-28"), score: 50, gini: 0.5 },
    ]

    const trend = calculateFairnessTrend("household-1", periodicScores)

    expect(trend.trend).toBe("declining")
  })

  it("should detect stable trend", () => {
    const periodicScores = [
      { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-07"), score: 70, gini: 0.3 },
      { startDate: new Date("2024-01-08"), endDate: new Date("2024-01-14"), score: 72, gini: 0.28 },
      { startDate: new Date("2024-01-15"), endDate: new Date("2024-01-21"), score: 68, gini: 0.32 },
      { startDate: new Date("2024-01-22"), endDate: new Date("2024-01-28"), score: 71, gini: 0.29 },
    ]

    const trend = calculateFairnessTrend("household-1", periodicScores)

    expect(trend.trend).toBe("stable")
  })

  it("should handle empty history", () => {
    const trend = calculateFairnessTrend("household-1", [])

    expect(trend.trend).toBe("stable")
    expect(trend.averageScore).toBe(0)
  })

  it("should calculate average score", () => {
    const periodicScores = [
      { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-07"), score: 60, gini: 0.4 },
      { startDate: new Date("2024-01-08"), endDate: new Date("2024-01-14"), score: 80, gini: 0.2 },
    ]

    const trend = calculateFairnessTrend("household-1", periodicScores)

    expect(trend.averageScore).toBe(70)
  })

  it("should find best and worst periods", () => {
    const periodicScores = [
      { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-07"), score: 50, gini: 0.5 },
      { startDate: new Date("2024-01-08"), endDate: new Date("2024-01-14"), score: 90, gini: 0.1 },
      { startDate: new Date("2024-01-15"), endDate: new Date("2024-01-21"), score: 70, gini: 0.3 },
    ]

    const trend = calculateFairnessTrend("household-1", periodicScores)

    expect(trend.bestPeriod?.score).toBe(90)
    expect(trend.worstPeriod?.score).toBe(50)
  })
})

// =============================================================================
// FORMATTING TESTS
// =============================================================================

describe("Formatting Functions", () => {
  it("should get status label", () => {
    expect(getFairnessStatusLabel("excellent")).toBe("Excellent")
    expect(getFairnessStatusLabel("good")).toBe("Bon")
    expect(getFairnessStatusLabel("fair")).toBe("Acceptable")
    expect(getFairnessStatusLabel("poor")).toBe("À améliorer")
    expect(getFairnessStatusLabel("critical")).toBe("Critique")
  })

  it("should get status color", () => {
    expect(getFairnessStatusColor("excellent")).toBe("green")
    expect(getFairnessStatusColor("critical")).toBe("red")
  })

  it("should get trend label", () => {
    expect(getTrendLabel("improving")).toBe("En amélioration")
    expect(getTrendLabel("stable")).toBe("Stable")
    expect(getTrendLabel("declining")).toBe("En déclin")
  })
})

// =============================================================================
// ENCOURAGEMENT MESSAGE TESTS
// =============================================================================

describe("Encouragement Messages", () => {
  it("should generate high score message", () => {
    const message = generateEncouragementMessage(90, "stable")

    expect(message.type).toBe("encouragement")
    expect(message.priority).toBeLessThanOrEqual(2)
    expect(message.text.length).toBeGreaterThan(0)
  })

  it("should generate improvement message when improving", () => {
    const message = generateEncouragementMessage(60, "improving")

    expect(message.type).toBe("encouragement")
    expect(message.emoji).toBe("📈")
  })

  it("should generate good score message", () => {
    const message = generateEncouragementMessage(75, "stable")

    expect(message.type).toBe("encouragement")
    expect(message.priority).toBe(3)
  })
})

// =============================================================================
// CELEBRATION MESSAGE TESTS
// =============================================================================

describe("Celebration Messages", () => {
  it("should generate milestone celebration", () => {
    const message = generateCelebrationMessage("milestone", {
      milestone: "100 tâches complétées !",
    })

    expect(message.type).toBe("celebration")
    expect(message.text).toContain("100 tâches complétées")
    expect(message.priority).toBe(1)
  })

  it("should generate personal best celebration", () => {
    const message = generateCelebrationMessage("personalBest", {
      userName: "Alice",
    })

    expect(message.type).toBe("celebration")
    expect(message.text).toContain("Alice")
  })

  it("should generate team effort celebration", () => {
    const message = generateCelebrationMessage("teamEffort")

    expect(message.type).toBe("celebration")
    expect(message.emoji).toBe("🎉")
  })
})

// =============================================================================
// SUGGESTION MESSAGE TESTS
// =============================================================================

describe("Suggestion Messages", () => {
  it("should generate category balance suggestion", () => {
    const message = generateSuggestionMessage("balanceCategory", {
      category: "Ménage",
    })

    expect(message.type).toBe("suggestion")
    expect(message.text).toContain("Ménage")
  })

  it("should generate support member suggestion", () => {
    const message = generateSuggestionMessage("supportMember", {
      userName: "Bob",
    })

    expect(message.type).toBe("suggestion")
    expect(message.text).toContain("Bob")
  })

  it("should generate general suggestion", () => {
    const message = generateSuggestionMessage("general")

    expect(message.type).toBe("suggestion")
    expect(message.priority).toBe(4)
  })
})

// =============================================================================
// OBSERVATION MESSAGE TESTS
// =============================================================================

describe("Observation Messages", () => {
  it("should generate most active observation", () => {
    const message = generateObservationMessage("mostActive", {
      userName: "Alice",
      userId: "user-1",
    })

    expect(message.type).toBe("observation")
    expect(message.text).toContain("Alice")
  })

  it("should generate category leader observation", () => {
    const message = generateObservationMessage("categoryLeader", {
      userName: "Bob",
      category: "Cuisine",
    })

    expect(message.type).toBe("observation")
    expect(message.text).toContain("Bob")
    expect(message.text).toContain("Cuisine")
  })
})

// =============================================================================
// MEMBER MESSAGES TESTS
// =============================================================================

describe("Member Messages", () => {
  it("should generate message for overloaded member", () => {
    const memberLoads: MemberLoad[] = [
      createTestMemberLoad({ userId: "user-1", userName: "Alice", adjustedPercentage: 70 }),
      createTestMemberLoad({ userId: "user-2", userName: "Bob", adjustedPercentage: 30 }),
    ]

    const messages = generateMemberMessages(memberLoads)

    expect(messages.length).toBeGreaterThan(0)
    expect(messages.some((m) => m.text.includes("Alice"))).toBe(true)
  })

  it("should return empty for balanced members", () => {
    const memberLoads: MemberLoad[] = [
      createTestMemberLoad({ userId: "user-1", adjustedPercentage: 35 }),
      createTestMemberLoad({ userId: "user-2", adjustedPercentage: 35 }),
      createTestMemberLoad({ userId: "user-3", adjustedPercentage: 30 }),
    ]

    const messages = generateMemberMessages(memberLoads)

    // No significant imbalance, so no support suggestion
    expect(messages.length).toBe(0)
  })

  it("should handle empty member list", () => {
    const messages = generateMemberMessages([])
    expect(messages).toHaveLength(0)
  })
})

// =============================================================================
// NOTIFICATION MESSAGE TESTS
// =============================================================================

describe("Notification Message", () => {
  it("should generate notification for excellent score", () => {
    const score = calculateFairnessScore(
      "household-1",
      [{ taskId: "1", userId: "user-1", category: "menage", weight: 5, completedAt: new Date() }],
      new Map([["user-1", "Alice"]]),
      [],
      new Date(),
      new Date()
    )
    // Force status for testing
    const modifiedScore = { ...score, status: "excellent" as const, overallScore: 95 }

    const notification = generateNotificationMessage(modifiedScore)

    expect(notification.title).toContain("🌟")
    expect(notification.body).toContain("95")
  })

  it("should generate notification for poor score", () => {
    const score = calculateFairnessScore(
      "household-1",
      [{ taskId: "1", userId: "user-1", category: "menage", weight: 5, completedAt: new Date() }],
      new Map([["user-1", "Alice"]]),
      [],
      new Date(),
      new Date()
    )
    const modifiedScore = { ...score, status: "poor" as const, overallScore: 40 }

    const notification = generateNotificationMessage(modifiedScore)

    expect(notification.title).toContain("💬")
  })
})

// =============================================================================
// EMAIL SUBJECT TESTS
// =============================================================================

describe("Email Subject", () => {
  it("should generate subject for excellent score", () => {
    const subject = generateEmailSubject("Famille Dupont", 3, 90)

    expect(subject).toContain("Famille Dupont")
    expect(subject).toContain("Semaine 3")
    expect(subject).toContain("🌟")
  })

  it("should generate subject for poor score", () => {
    const subject = generateEmailSubject("Famille Martin", 5, 45)

    expect(subject).toContain("Famille Martin")
    expect(subject).toContain("améliorer")
  })
})

// =============================================================================
// REPORT DELIVERY TESTS
// =============================================================================

describe("Report Delivery", () => {
  it("should create delivery record", () => {
    const delivery = createReportDelivery(
      "report-1",
      "household-1",
      "email",
      [{ userId: "user-1", email: "alice@example.com" }]
    )

    expect(delivery.reportId).toBe("report-1")
    expect(delivery.status).toBe("pending")
    expect(delivery.recipients).toHaveLength(1)
  })

  it("should mark delivery as sent", () => {
    const delivery = createReportDelivery("report-1", "household-1", "push", [])
    const sent = markDeliverySent(delivery)

    expect(sent.status).toBe("sent")
    expect(sent.sentAt).toBeDefined()
  })

  it("should mark delivery as failed", () => {
    const delivery = createReportDelivery("report-1", "household-1", "email", [])
    const failed = markDeliveryFailed(delivery, "SMTP error")

    expect(failed.status).toBe("failed")
    expect(failed.error).toBe("SMTP error")
  })
})

// =============================================================================
// FORMAT FAIRNESS SCORE TESTS
// =============================================================================

describe("Format Fairness Score", () => {
  it("should format excellent score", () => {
    const score = calculateFairnessScore(
      "household-1",
      [{ taskId: "1", userId: "user-1", category: "menage", weight: 5, completedAt: new Date() }],
      new Map([["user-1", "Alice"]]),
      [],
      new Date(),
      new Date()
    )
    const modifiedScore = { ...score, status: "excellent" as const, overallScore: 95 }

    const formatted = formatFairnessScore(modifiedScore)

    expect(formatted.status).toBe("Excellent")
    expect(formatted.emoji).toBe("🌟")
    expect(formatted.statusColor).toBe("green")
  })

  it("should format critical score", () => {
    const score = calculateFairnessScore(
      "household-1",
      [],
      new Map([["user-1", "Alice"]]),
      [],
      new Date(),
      new Date()
    )
    const modifiedScore = { ...score, status: "critical" as const, overallScore: 20 }

    const formatted = formatFairnessScore(modifiedScore)

    expect(formatted.status).toBe("Critique")
    expect(formatted.emoji).toBe("🚨")
    expect(formatted.statusColor).toBe("red")
  })
})
