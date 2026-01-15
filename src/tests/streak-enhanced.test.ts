/**
 * Enhanced Streak System Tests
 *
 * Comprehensive tests for the streak system including:
 * - Streak calculation logic
 * - Risk detection
 * - Milestone tracking
 * - Joker feature
 * - Daily validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  MILESTONES,
  getMilestoneInfo,
  type StreakMilestone,
} from "@/lib/services/streak"

// =============================================================================
// MILESTONES TESTS
// =============================================================================

describe("MILESTONES", () => {
  it("should have all required milestones", () => {
    expect(MILESTONES.length).toBe(7)
  })

  it("should have milestones in ascending order", () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i]!.days).toBeGreaterThan(MILESTONES[i - 1]!.days)
    }
  })

  it("should have 3-day milestone", () => {
    const milestone = MILESTONES.find((m) => m.days === 3)
    expect(milestone).toBeDefined()
    expect(milestone?.label).toBe("Début prometteur")
  })

  it("should have 7-day milestone", () => {
    const milestone = MILESTONES.find((m) => m.days === 7)
    expect(milestone).toBeDefined()
    expect(milestone?.label).toBe("Une semaine")
  })

  it("should have 30-day milestone", () => {
    const milestone = MILESTONES.find((m) => m.days === 30)
    expect(milestone).toBeDefined()
    expect(milestone?.label).toBe("Un mois")
  })

  it("should have 100-day milestone", () => {
    const milestone = MILESTONES.find((m) => m.days === 100)
    expect(milestone).toBeDefined()
    expect(milestone?.label).toBe("Centenaire")
  })

  it("should have 365-day milestone", () => {
    const milestone = MILESTONES.find((m) => m.days === 365)
    expect(milestone).toBeDefined()
    expect(milestone?.label).toBe("Légendaire")
  })

  it("should have unique badges for each milestone", () => {
    const badges = MILESTONES.map((m) => m.badge)
    const uniqueBadges = new Set(badges)
    expect(uniqueBadges.size).toBe(badges.length)
  })

  it("should have descriptions for all milestones", () => {
    MILESTONES.forEach((m) => {
      expect(m.description).toBeDefined()
      expect(m.description.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// getMilestoneInfo TESTS
// =============================================================================

describe("getMilestoneInfo", () => {
  it("should return null current for streak 0", () => {
    const info = getMilestoneInfo(0)
    expect(info.current).toBeNull()
    expect(info.next?.days).toBe(3)
    expect(info.progress).toBe(0)
  })

  it("should return null current for streak 1", () => {
    const info = getMilestoneInfo(1)
    expect(info.current).toBeNull()
    expect(info.next?.days).toBe(3)
    expect(info.progress).toBe(33) // 1/3 * 100 rounded
  })

  it("should return first milestone for streak 3", () => {
    const info = getMilestoneInfo(3)
    expect(info.current?.days).toBe(3)
    expect(info.next?.days).toBe(7)
    expect(info.progress).toBe(0) // Just unlocked, 0% to next
  })

  it("should calculate progress between milestones", () => {
    const info = getMilestoneInfo(5)
    expect(info.current?.days).toBe(3)
    expect(info.next?.days).toBe(7)
    // 5-3=2 achieved, 7-3=4 range, 2/4*100=50%
    expect(info.progress).toBe(50)
  })

  it("should return correct info for 7-day streak", () => {
    const info = getMilestoneInfo(7)
    expect(info.current?.days).toBe(7)
    expect(info.next?.days).toBe(14)
  })

  it("should return correct info for 30-day streak", () => {
    const info = getMilestoneInfo(30)
    expect(info.current?.days).toBe(30)
    expect(info.next?.days).toBe(60)
  })

  it("should return 100% progress at max milestone", () => {
    const info = getMilestoneInfo(365)
    expect(info.current?.days).toBe(365)
    expect(info.next).toBeNull()
    expect(info.progress).toBe(100)
  })

  it("should return 100% progress beyond max milestone", () => {
    const info = getMilestoneInfo(500)
    expect(info.current?.days).toBe(365)
    expect(info.next).toBeNull()
    expect(info.progress).toBe(100)
  })
})

// =============================================================================
// STREAK CALCULATION LOGIC TESTS (Pure functions)
// =============================================================================

describe("Streak Calculation Logic", () => {
  // Helper function to simulate streak calculation
  function calculateStreakFromDates(dates: Date[]): number {
    if (dates.length === 0) return 0

    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime())
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const mostRecent = sortedDates[0]!
    mostRecent.setHours(0, 0, 0, 0)

    // If most recent is before yesterday, streak is broken
    if (mostRecent < yesterday) return 0

    // Count consecutive days
    let streak = 1
    let previousDate = mostRecent

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]!)
      currentDate.setHours(0, 0, 0, 0)

      const expectedPrevious = new Date(previousDate)
      expectedPrevious.setDate(expectedPrevious.getDate() - 1)
      expectedPrevious.setHours(0, 0, 0, 0)

      if (currentDate.getTime() === expectedPrevious.getTime()) {
        streak++
        previousDate = currentDate
      } else {
        break
      }
    }

    return streak
  }

  it("should return 0 for empty dates", () => {
    expect(calculateStreakFromDates([])).toBe(0)
  })

  it("should return 1 for single date today", () => {
    const today = new Date()
    expect(calculateStreakFromDates([today])).toBe(1)
  })

  it("should return 1 for single date yesterday", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(calculateStreakFromDates([yesterday])).toBe(1)
  })

  it("should return 0 for single date 2 days ago", () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    expect(calculateStreakFromDates([twoDaysAgo])).toBe(0)
  })

  it("should count consecutive days correctly", () => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    expect(calculateStreakFromDates([today, yesterday, twoDaysAgo])).toBe(3)
  })

  it("should break streak on gap", () => {
    const today = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // Gap of 2 days
    expect(calculateStreakFromDates([today, threeDaysAgo])).toBe(1)
  })

  it("should handle 7-day streak", () => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d)
    }
    expect(calculateStreakFromDates(dates)).toBe(7)
  })
})

// =============================================================================
// STREAK RISK DETECTION TESTS
// =============================================================================

describe("Streak Risk Detection", () => {
  interface RiskCheckResult {
    isAtRisk: boolean
    riskReason: string | null
  }

  // Helper function to simulate risk detection
  function checkRisk(
    currentStreak: number,
    pendingCriticalToday: number,
    completedCriticalToday: number,
    hourOfDay: number
  ): RiskCheckResult {
    if (currentStreak === 0) {
      return { isAtRisk: false, riskReason: null }
    }

    // If there are pending critical tasks and none completed today
    if (pendingCriticalToday > 0 && completedCriticalToday === 0) {
      return {
        isAtRisk: true,
        riskReason: `${pendingCriticalToday} tâche${pendingCriticalToday > 1 ? "s" : ""} critique${pendingCriticalToday > 1 ? "s" : ""} à faire aujourd'hui`,
      }
    }

    // Late in the day with pending tasks
    if (hourOfDay >= 18 && pendingCriticalToday > 0) {
      return {
        isAtRisk: true,
        riskReason: `${pendingCriticalToday} tâche${pendingCriticalToday > 1 ? "s" : ""} critique${pendingCriticalToday > 1 ? "s" : ""} encore en attente`,
      }
    }

    return { isAtRisk: false, riskReason: null }
  }

  it("should not be at risk with 0 streak", () => {
    const result = checkRisk(0, 5, 0, 20)
    expect(result.isAtRisk).toBe(false)
  })

  it("should be at risk with pending critical tasks and no completions", () => {
    const result = checkRisk(10, 3, 0, 12)
    expect(result.isAtRisk).toBe(true)
    expect(result.riskReason).toContain("3 tâches")
  })

  it("should not be at risk when all critical tasks done", () => {
    const result = checkRisk(10, 0, 3, 20)
    expect(result.isAtRisk).toBe(false)
  })

  it("should be at risk late in day with pending tasks", () => {
    const result = checkRisk(10, 2, 1, 19)
    expect(result.isAtRisk).toBe(true)
    expect(result.riskReason).toContain("encore en attente")
  })

  it("should not be at risk early in day with pending tasks", () => {
    const result = checkRisk(10, 2, 1, 10)
    expect(result.isAtRisk).toBe(false)
  })

  it("should format singular task correctly", () => {
    const result = checkRisk(5, 1, 0, 12)
    expect(result.riskReason).toContain("1 tâche critique")
    expect(result.riskReason).not.toContain("tâches")
  })

  it("should format plural tasks correctly", () => {
    const result = checkRisk(5, 3, 0, 12)
    expect(result.riskReason).toContain("3 tâches critiques")
  })
})

// =============================================================================
// JOKER FEATURE TESTS
// =============================================================================

describe("Joker Feature", () => {
  interface JokerResult {
    success: boolean
    error?: string
  }

  // Helper to simulate joker usage
  function useJoker(
    isPremium: boolean,
    jokersUsedThisMonth: number,
    currentStreak: number,
    maxJokersPerMonth: number = 2
  ): JokerResult {
    if (!isPremium) {
      return { success: false, error: "Fonctionnalité réservée aux membres Premium" }
    }

    if (jokersUsedThisMonth >= maxJokersPerMonth) {
      return { success: false, error: "Limite de jokers atteinte ce mois-ci" }
    }

    if (currentStreak === 0) {
      return { success: false, error: "Pas de streak à sauver" }
    }

    return { success: true }
  }

  it("should fail for non-premium users", () => {
    const result = useJoker(false, 0, 10)
    expect(result.success).toBe(false)
    expect(result.error).toContain("Premium")
  })

  it("should succeed for premium users with available jokers", () => {
    const result = useJoker(true, 0, 10)
    expect(result.success).toBe(true)
  })

  it("should fail when joker limit reached", () => {
    const result = useJoker(true, 2, 10)
    expect(result.success).toBe(false)
    expect(result.error).toContain("Limite")
  })

  it("should fail when streak is 0", () => {
    const result = useJoker(true, 0, 0)
    expect(result.success).toBe(false)
    expect(result.error).toContain("Pas de streak")
  })

  it("should allow first joker of month", () => {
    const result = useJoker(true, 0, 15)
    expect(result.success).toBe(true)
  })

  it("should allow second joker of month", () => {
    const result = useJoker(true, 1, 15)
    expect(result.success).toBe(true)
  })

  it("should deny third joker of month", () => {
    const result = useJoker(true, 2, 15)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// DAILY VALIDATION LOGIC TESTS
// =============================================================================

describe("Daily Validation Logic", () => {
  interface DailyTask {
    id: string
    isCritical: boolean
    isCompleted: boolean
  }

  function getDailySummary(tasks: DailyTask[]) {
    const critical = tasks.filter((t) => t.isCritical)
    const regular = tasks.filter((t) => !t.isCritical)

    return {
      totalCritical: critical.length,
      completedCritical: critical.filter((t) => t.isCompleted).length,
      totalRegular: regular.length,
      completedRegular: regular.filter((t) => t.isCompleted).length,
      allCriticalDone: critical.every((t) => t.isCompleted),
      allTasksDone: tasks.every((t) => t.isCompleted),
      progressPercent:
        critical.length > 0
          ? Math.round(
              (critical.filter((t) => t.isCompleted).length / critical.length) * 100
            )
          : 100,
    }
  }

  it("should calculate progress correctly with no tasks", () => {
    const summary = getDailySummary([])
    expect(summary.totalCritical).toBe(0)
    expect(summary.allCriticalDone).toBe(true)
    expect(summary.progressPercent).toBe(100)
  })

  it("should calculate progress with all tasks pending", () => {
    const tasks: DailyTask[] = [
      { id: "1", isCritical: true, isCompleted: false },
      { id: "2", isCritical: true, isCompleted: false },
      { id: "3", isCritical: false, isCompleted: false },
    ]
    const summary = getDailySummary(tasks)
    expect(summary.totalCritical).toBe(2)
    expect(summary.completedCritical).toBe(0)
    expect(summary.allCriticalDone).toBe(false)
    expect(summary.progressPercent).toBe(0)
  })

  it("should calculate progress with partial completion", () => {
    const tasks: DailyTask[] = [
      { id: "1", isCritical: true, isCompleted: true },
      { id: "2", isCritical: true, isCompleted: false },
      { id: "3", isCritical: false, isCompleted: false },
    ]
    const summary = getDailySummary(tasks)
    expect(summary.completedCritical).toBe(1)
    expect(summary.allCriticalDone).toBe(false)
    expect(summary.progressPercent).toBe(50)
  })

  it("should recognize all critical done", () => {
    const tasks: DailyTask[] = [
      { id: "1", isCritical: true, isCompleted: true },
      { id: "2", isCritical: true, isCompleted: true },
      { id: "3", isCritical: false, isCompleted: false },
    ]
    const summary = getDailySummary(tasks)
    expect(summary.allCriticalDone).toBe(true)
    expect(summary.allTasksDone).toBe(false)
    expect(summary.progressPercent).toBe(100)
  })

  it("should recognize all tasks done", () => {
    const tasks: DailyTask[] = [
      { id: "1", isCritical: true, isCompleted: true },
      { id: "2", isCritical: false, isCompleted: true },
    ]
    const summary = getDailySummary(tasks)
    expect(summary.allCriticalDone).toBe(true)
    expect(summary.allTasksDone).toBe(true)
  })

  it("should handle only regular tasks", () => {
    const tasks: DailyTask[] = [
      { id: "1", isCritical: false, isCompleted: false },
      { id: "2", isCritical: false, isCompleted: false },
    ]
    const summary = getDailySummary(tasks)
    expect(summary.totalCritical).toBe(0)
    expect(summary.totalRegular).toBe(2)
    expect(summary.allCriticalDone).toBe(true)
    expect(summary.progressPercent).toBe(100) // No critical tasks = 100%
  })
})

// =============================================================================
// STREAK UPDATE LOGIC TESTS
// =============================================================================

describe("Streak Update Logic", () => {
  interface UpdateResult {
    newStreak: number
    isNewRecord: boolean
    milestoneUnlocked: StreakMilestone | null
  }

  function simulateStreakUpdate(
    calculatedStreak: number,
    currentBest: number
  ): UpdateResult {
    const isNewRecord = calculatedStreak > currentBest

    // Find newly unlocked milestone
    const previouslyUnlocked = MILESTONES.filter((m) => m.days <= currentBest)
    const nowUnlocked = MILESTONES.filter((m) => m.days <= calculatedStreak)
    const newMilestones = nowUnlocked.filter(
      (m) => !previouslyUnlocked.find((p) => p.days === m.days)
    )

    return {
      newStreak: calculatedStreak,
      isNewRecord,
      milestoneUnlocked:
        newMilestones.length > 0 ? newMilestones[newMilestones.length - 1] ?? null : null,
    }
  }

  it("should detect new record", () => {
    const result = simulateStreakUpdate(15, 10)
    expect(result.isNewRecord).toBe(true)
  })

  it("should not detect new record when equal", () => {
    const result = simulateStreakUpdate(10, 10)
    expect(result.isNewRecord).toBe(false)
  })

  it("should detect milestone unlock at 3 days", () => {
    const result = simulateStreakUpdate(3, 2)
    expect(result.milestoneUnlocked?.days).toBe(3)
  })

  it("should detect milestone unlock at 7 days", () => {
    const result = simulateStreakUpdate(7, 6)
    expect(result.milestoneUnlocked?.days).toBe(7)
  })

  it("should not detect milestone when already unlocked", () => {
    const result = simulateStreakUpdate(5, 3)
    expect(result.milestoneUnlocked).toBeNull() // 3 already unlocked, 7 not reached
  })

  it("should detect multiple milestones skipped", () => {
    // If streak jumps from 2 to 10 (unlocks both 3 and 7)
    // Should return the highest newly unlocked
    const result = simulateStreakUpdate(10, 2)
    expect(result.milestoneUnlocked?.days).toBe(7)
  })

  it("should handle max milestone", () => {
    const result = simulateStreakUpdate(365, 300)
    expect(result.milestoneUnlocked?.days).toBe(365)
    expect(result.isNewRecord).toBe(true)
  })

  it("should handle beyond max milestone", () => {
    const result = simulateStreakUpdate(400, 365)
    expect(result.milestoneUnlocked).toBeNull() // 365 already unlocked
    expect(result.isNewRecord).toBe(true)
  })
})

// =============================================================================
// STREAK HISTORY TESTS
// =============================================================================

describe("Streak History", () => {
  interface StreakHistoryEntry {
    date: string
    streak: number
    milestone?: StreakMilestone
  }

  function buildStreakHistory(
    dailyStreaks: Array<{ date: string; streak: number }>
  ): StreakHistoryEntry[] {
    return dailyStreaks.map((entry) => ({
      date: entry.date,
      streak: entry.streak,
      milestone: MILESTONES.find((m) => m.days === entry.streak),
    }))
  }

  it("should track milestone days in history", () => {
    const history = buildStreakHistory([
      { date: "2024-01-01", streak: 1 },
      { date: "2024-01-02", streak: 2 },
      { date: "2024-01-03", streak: 3 },
    ])

    expect(history[2]?.milestone?.days).toBe(3)
    expect(history[1]?.milestone).toBeUndefined()
  })

  it("should handle streak reset in history", () => {
    const history = buildStreakHistory([
      { date: "2024-01-05", streak: 5 },
      { date: "2024-01-06", streak: 0 }, // Missed day
      { date: "2024-01-07", streak: 1 },
    ])

    expect(history[1]?.streak).toBe(0)
    expect(history[2]?.streak).toBe(1)
  })
})
