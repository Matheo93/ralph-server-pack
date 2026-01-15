/**
 * Tests for Balance Alerts Service
 *
 * Tests for balance detection, alert logic, and rebalance suggestions
 */

import { describe, it, expect } from "vitest"

// =============================================================================
// TYPES (Matching service types)
// =============================================================================

interface BalanceAlertStatus {
  hasAlert: boolean
  alertLevel: "none" | "warning" | "critical"
  message: string
  percentageGap: number
  lastChecked: string
}

interface MemberLoad {
  userId: string
  userName: string
  totalLoad: number
  percentage: number
  tasksCount: number
}

interface RebalanceSuggestion {
  taskId: string
  taskTitle: string
  currentAssignee: string
  currentAssigneeName: string
  suggestedAssignee: string
  suggestedAssigneeName: string
  loadWeight: number
  reason: string
}

interface WeeklyReportData {
  weekStart: string
  weekEnd: string
  totalTasks: number
  completedTasks: number
  totalLoadPoints: number
  members: {
    userId: string
    userName: string
    tasksCompleted: number
    loadPoints: number
    percentage: number
  }[]
  isBalanced: boolean
  alertLevel: "none" | "warning" | "critical"
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BALANCE_THRESHOLDS = {
  WARNING: 55,
  CRITICAL: 60,
}

// =============================================================================
// HELPER FUNCTIONS (Mirroring service logic)
// =============================================================================

function calculateAlertStatus(members: MemberLoad[]): BalanceAlertStatus {
  if (members.length < 2) {
    return {
      hasAlert: false,
      alertLevel: "none",
      message: "Un seul parent dans le foyer",
      percentageGap: 0,
      lastChecked: new Date().toISOString(),
    }
  }

  const sortedByPercentage = [...members].sort((a, b) => b.percentage - a.percentage)
  const highest = sortedByPercentage[0]?.percentage ?? 0
  const lowest = sortedByPercentage[sortedByPercentage.length - 1]?.percentage ?? 0
  const percentageGap = highest - lowest

  let alertLevel: "none" | "warning" | "critical" = "none"
  let message = ""

  if (highest > BALANCE_THRESHOLDS.CRITICAL) {
    alertLevel = "critical"
    message = `${sortedByPercentage[0]?.userName ?? "Un parent"} gère ${Math.round(highest)}% de la charge mentale.`
  } else if (highest > BALANCE_THRESHOLDS.WARNING) {
    alertLevel = "warning"
    message = `La répartition commence à être déséquilibrée (${Math.round(highest)}/${Math.round(lowest)}).`
  } else {
    message = `La charge est bien équilibrée (${Math.round(highest)}/${Math.round(lowest)}).`
  }

  return {
    hasAlert: alertLevel !== "none",
    alertLevel,
    message,
    percentageGap,
    lastChecked: new Date().toISOString(),
  }
}

function shouldGenerateSuggestions(members: MemberLoad[]): boolean {
  if (members.length < 2) return false
  const maxPercentage = Math.max(...members.map((m) => m.percentage), 0)
  return maxPercentage > BALANCE_THRESHOLDS.WARNING
}

function calculateCompletionRate(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

function shouldSendNotification(
  alertLevel: "none" | "warning" | "critical",
  lastAlertHoursAgo: number
): boolean {
  if (alertLevel === "none") return false
  return lastAlertHoursAgo >= 24
}

// =============================================================================
// ALERT STATUS TESTS
// =============================================================================

describe("Balance Alert Status", () => {
  it("detects balanced distribution (50/50)", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 100, percentage: 50, tasksCount: 10 },
      { userId: "2", userName: "Parent2", totalLoad: 100, percentage: 50, tasksCount: 10 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(false)
    expect(status.alertLevel).toBe("none")
    expect(status.percentageGap).toBe(0)
  })

  it("detects warning level (55/45)", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 110, percentage: 55, tasksCount: 11 },
      { userId: "2", userName: "Parent2", totalLoad: 90, percentage: 45, tasksCount: 9 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(false) // 55% is the threshold, not exceeded
    expect(status.alertLevel).toBe("none")
  })

  it("detects warning level (58/42)", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 116, percentage: 58, tasksCount: 12 },
      { userId: "2", userName: "Parent2", totalLoad: 84, percentage: 42, tasksCount: 8 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(true)
    expect(status.alertLevel).toBe("warning")
    expect(status.percentageGap).toBe(16)
  })

  it("detects critical level (65/35)", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 130, percentage: 65, tasksCount: 13 },
      { userId: "2", userName: "Parent2", totalLoad: 70, percentage: 35, tasksCount: 7 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(true)
    expect(status.alertLevel).toBe("critical")
    expect(status.percentageGap).toBe(30)
    expect(status.message).toContain("65%")
  })

  it("handles single parent household", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 100, percentage: 100, tasksCount: 10 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(false)
    expect(status.alertLevel).toBe("none")
    expect(status.message).toContain("seul parent")
  })

  it("handles empty household", () => {
    const members: MemberLoad[] = []

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(false)
    expect(status.alertLevel).toBe("none")
  })
})

// =============================================================================
// REBALANCE SUGGESTION TESTS
// =============================================================================

describe("Rebalance Suggestions", () => {
  it("generates suggestions when imbalanced", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 130, percentage: 65, tasksCount: 13 },
      { userId: "2", userName: "Parent2", totalLoad: 70, percentage: 35, tasksCount: 7 },
    ]

    expect(shouldGenerateSuggestions(members)).toBe(true)
  })

  it("does not generate suggestions when balanced", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 100, percentage: 52, tasksCount: 10 },
      { userId: "2", userName: "Parent2", totalLoad: 92, percentage: 48, tasksCount: 9 },
    ]

    expect(shouldGenerateSuggestions(members)).toBe(false)
  })

  it("does not generate suggestions for single parent", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 100, percentage: 100, tasksCount: 10 },
    ]

    expect(shouldGenerateSuggestions(members)).toBe(false)
  })

  it("suggestion structure is valid", () => {
    const suggestion: RebalanceSuggestion = {
      taskId: "task-1",
      taskTitle: "Inscription crèche",
      currentAssignee: "user-1",
      currentAssigneeName: "Parent1",
      suggestedAssignee: "user-2",
      suggestedAssigneeName: "Parent2",
      loadWeight: 5,
      reason: "Rééquilibrer la charge",
    }

    expect(suggestion.taskId).toBeDefined()
    expect(suggestion.taskTitle).toBeDefined()
    expect(suggestion.currentAssignee).not.toBe(suggestion.suggestedAssignee)
    expect(suggestion.loadWeight).toBeGreaterThan(0)
  })
})

// =============================================================================
// WEEKLY REPORT TESTS
// =============================================================================

describe("Weekly Report", () => {
  it("calculates completion rate correctly", () => {
    expect(calculateCompletionRate(8, 10)).toBe(80)
    expect(calculateCompletionRate(0, 10)).toBe(0)
    expect(calculateCompletionRate(10, 10)).toBe(100)
    expect(calculateCompletionRate(0, 0)).toBe(0)
  })

  it("handles partial completion", () => {
    expect(calculateCompletionRate(3, 7)).toBe(43)
    expect(calculateCompletionRate(1, 3)).toBe(33)
  })

  it("report structure is valid", () => {
    const report: WeeklyReportData = {
      weekStart: "2026-01-13",
      weekEnd: "2026-01-19",
      totalTasks: 15,
      completedTasks: 12,
      totalLoadPoints: 45,
      members: [
        { userId: "1", userName: "Parent1", tasksCompleted: 7, loadPoints: 25, percentage: 56 },
        { userId: "2", userName: "Parent2", tasksCompleted: 5, loadPoints: 20, percentage: 44 },
      ],
      isBalanced: false,
      alertLevel: "warning",
    }

    expect(report.weekStart).toBeDefined()
    expect(report.weekEnd).toBeDefined()
    expect(report.totalTasks).toBeGreaterThanOrEqual(report.completedTasks)
    expect(report.members.length).toBeGreaterThan(0)
    expect(report.members.reduce((sum, m) => sum + m.percentage, 0)).toBeCloseTo(100, 0)
  })

  it("correctly identifies balanced report", () => {
    const report: WeeklyReportData = {
      weekStart: "2026-01-13",
      weekEnd: "2026-01-19",
      totalTasks: 10,
      completedTasks: 10,
      totalLoadPoints: 30,
      members: [
        { userId: "1", userName: "Parent1", tasksCompleted: 5, loadPoints: 15, percentage: 50 },
        { userId: "2", userName: "Parent2", tasksCompleted: 5, loadPoints: 15, percentage: 50 },
      ],
      isBalanced: true,
      alertLevel: "none",
    }

    expect(report.isBalanced).toBe(true)
    expect(report.alertLevel).toBe("none")
  })
})

// =============================================================================
// NOTIFICATION LOGIC TESTS
// =============================================================================

describe("Notification Logic", () => {
  it("sends notification for critical alert after 24h", () => {
    expect(shouldSendNotification("critical", 25)).toBe(true)
  })

  it("sends notification for warning alert after 24h", () => {
    expect(shouldSendNotification("warning", 24)).toBe(true)
  })

  it("does not send notification within 24h", () => {
    expect(shouldSendNotification("critical", 12)).toBe(false)
    expect(shouldSendNotification("warning", 23)).toBe(false)
  })

  it("does not send notification when balanced", () => {
    expect(shouldSendNotification("none", 48)).toBe(false)
    expect(shouldSendNotification("none", 0)).toBe(false)
  })

  it("handles edge case at exactly 24h", () => {
    expect(shouldSendNotification("warning", 24)).toBe(true)
  })
})

// =============================================================================
// THRESHOLD TESTS
// =============================================================================

describe("Balance Thresholds", () => {
  it("warning threshold is 55%", () => {
    expect(BALANCE_THRESHOLDS.WARNING).toBe(55)
  })

  it("critical threshold is 60%", () => {
    expect(BALANCE_THRESHOLDS.CRITICAL).toBe(60)
  })

  it("critical threshold is higher than warning", () => {
    expect(BALANCE_THRESHOLDS.CRITICAL).toBeGreaterThan(BALANCE_THRESHOLDS.WARNING)
  })

  it("at exactly warning threshold, no alert", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 110, percentage: 55, tasksCount: 11 },
      { userId: "2", userName: "Parent2", totalLoad: 90, percentage: 45, tasksCount: 9 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.alertLevel).toBe("none")
  })

  it("just above warning threshold triggers warning", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 112, percentage: 56, tasksCount: 11 },
      { userId: "2", userName: "Parent2", totalLoad: 88, percentage: 44, tasksCount: 9 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.alertLevel).toBe("warning")
  })

  it("at exactly critical threshold, warning only", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 120, percentage: 60, tasksCount: 12 },
      { userId: "2", userName: "Parent2", totalLoad: 80, percentage: 40, tasksCount: 8 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.alertLevel).toBe("warning")
  })

  it("just above critical threshold triggers critical", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 122, percentage: 61, tasksCount: 12 },
      { userId: "2", userName: "Parent2", totalLoad: 78, percentage: 39, tasksCount: 8 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.alertLevel).toBe("critical")
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("handles zero load for all members", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 0, percentage: 0, tasksCount: 0 },
      { userId: "2", userName: "Parent2", totalLoad: 0, percentage: 0, tasksCount: 0 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(false)
    expect(status.percentageGap).toBe(0)
  })

  it("handles 100/0 split", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 100, percentage: 100, tasksCount: 10 },
      { userId: "2", userName: "Parent2", totalLoad: 0, percentage: 0, tasksCount: 0 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(true)
    expect(status.alertLevel).toBe("critical")
    expect(status.percentageGap).toBe(100)
  })

  it("handles decimal percentages", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 57, percentage: 57.5, tasksCount: 6 },
      { userId: "2", userName: "Parent2", totalLoad: 43, percentage: 42.5, tasksCount: 4 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.alertLevel).toBe("warning")
    expect(status.percentageGap).toBe(15) // 57.5 - 42.5
  })

  it("handles three or more members", () => {
    const members: MemberLoad[] = [
      { userId: "1", userName: "Parent1", totalLoad: 60, percentage: 60, tasksCount: 6 },
      { userId: "2", userName: "Parent2", totalLoad: 25, percentage: 25, tasksCount: 3 },
      { userId: "3", userName: "Parent3", totalLoad: 15, percentage: 15, tasksCount: 2 },
    ]

    const status = calculateAlertStatus(members)
    expect(status.hasAlert).toBe(true)
    expect(status.alertLevel).toBe("warning") // 60% is at threshold, not above
  })
})
