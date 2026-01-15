/**
 * Streak System Tests
 *
 * Tests for streak calculation, milestones, and joker system.
 */

import { describe, test, expect } from "vitest"
import {
  getStreakDate,
  isSameStreakDay,
  isConsecutiveDay,
  getDaysBetween,
  calculateStreak,
  isStreakBroken,
  canUseJoker,
  getNextMilestone,
  isAtMilestone,
  getAchievedMilestones,
  getMilestoneProgress,
  buildStreakHistory,
  STREAK_MILESTONES,
} from "@/lib/streak/calculator"

// =============================================================================
// DATE HELPER TESTS
// =============================================================================

describe("Date Helpers", () => {
  test("getStreakDate returns same day for afternoon", () => {
    const date = new Date("2024-01-15T14:30:00")
    const streakDate = getStreakDate(date, 4)

    expect(streakDate.getDate()).toBe(15)
  })

  test("getStreakDate returns previous day for early morning within grace period", () => {
    const date = new Date("2024-01-15T02:30:00")
    const streakDate = getStreakDate(date, 4)

    expect(streakDate.getDate()).toBe(14)
  })

  test("isSameStreakDay returns true for same day", () => {
    const date1 = new Date("2024-01-15T10:00:00")
    const date2 = new Date("2024-01-15T18:00:00")

    expect(isSameStreakDay(date1, date2)).toBe(true)
  })

  test("isSameStreakDay returns true for late night and early morning", () => {
    const date1 = new Date("2024-01-15T23:00:00")
    const date2 = new Date("2024-01-16T02:00:00")

    expect(isSameStreakDay(date1, date2, 4)).toBe(true)
  })

  test("isConsecutiveDay detects consecutive days", () => {
    const date1 = new Date("2024-01-16T12:00:00")
    const date2 = new Date("2024-01-15T12:00:00")

    expect(isConsecutiveDay(date1, date2)).toBe(true)
  })

  test("isConsecutiveDay returns false for same day", () => {
    const date1 = new Date("2024-01-15T10:00:00")
    const date2 = new Date("2024-01-15T20:00:00")

    expect(isConsecutiveDay(date1, date2)).toBe(false)
  })

  test("getDaysBetween calculates correctly", () => {
    const date1 = new Date("2024-01-20T12:00:00")
    const date2 = new Date("2024-01-15T12:00:00")

    expect(getDaysBetween(date1, date2)).toBe(5)
  })
})

// =============================================================================
// STREAK CALCULATION TESTS
// =============================================================================

describe("Streak Calculation", () => {
  test("returns 0 for empty completions", () => {
    const status = calculateStreak([])

    expect(status.currentStreak).toBe(0)
    expect(status.longestStreak).toBe(0)
    expect(status.isActive).toBe(false)
  })

  test("returns 1 for single completion today", () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const status = calculateStreak([today])

    expect(status.currentStreak).toBe(1)
    expect(status.isActive).toBe(true)
  })

  test("calculates consecutive streak correctly", () => {
    const now = new Date()
    now.setHours(12, 0, 0, 0)

    const dates = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dates.push(d)
    }

    const status = calculateStreak(dates)

    expect(status.currentStreak).toBe(5)
    expect(status.isActive).toBe(true)
  })

  test("detects broken streak", () => {
    const now = new Date()
    now.setHours(12, 0, 0, 0)

    const dates = []
    // Skip today, yesterday
    for (let i = 3; i < 8; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dates.push(d)
    }

    const status = calculateStreak(dates)

    expect(status.currentStreak).toBe(0)
    expect(status.isActive).toBe(false)
    expect(status.longestStreak).toBe(5)
  })

  test("calculates longest streak from history", () => {
    const now = new Date()
    now.setHours(12, 0, 0, 0)

    const dates = []
    // Current streak: 3 days
    for (let i = 0; i < 3; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dates.push(d)
    }
    // Old streak: 5 days (with gap)
    for (let i = 10; i < 15; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dates.push(d)
    }

    const status = calculateStreak(dates)

    expect(status.currentStreak).toBe(3)
    expect(status.longestStreak).toBe(5)
  })

  test("isStreakBroken returns true for null", () => {
    expect(isStreakBroken(null)).toBe(true)
  })

  test("isStreakBroken returns false for yesterday", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(12, 0, 0, 0)

    expect(isStreakBroken(yesterday)).toBe(false)
  })

  test("isStreakBroken returns true for 3 days ago", () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(12, 0, 0, 0)

    expect(isStreakBroken(threeDaysAgo)).toBe(true)
  })
})

// =============================================================================
// JOKER TESTS
// =============================================================================

describe("Joker System", () => {
  test("non-premium user cannot use joker", () => {
    const status = {
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: new Date(),
      isActive: false,
      expiresAt: null,
      jokerAvailable: false,
      jokerUsedToday: false,
      daysUntilJokerReset: 7,
    }

    const result = canUseJoker(status, null, { isPremium: false })

    expect(result.canUse).toBe(false)
    expect(result.reason).toContain("premium")
  })

  test("premium user can use joker when streak is broken", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 2)

    const status = {
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: yesterday,
      isActive: false,
      expiresAt: null,
      jokerAvailable: true,
      jokerUsedToday: false,
      daysUntilJokerReset: 0,
    }

    const result = canUseJoker(status, null, { isPremium: true })

    expect(result.canUse).toBe(true)
  })

  test("joker has cooldown period", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 2)

    const jokerUsedRecently = new Date()
    jokerUsedRecently.setDate(jokerUsedRecently.getDate() - 3)

    const status = {
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: yesterday,
      isActive: false,
      expiresAt: null,
      jokerAvailable: true,
      jokerUsedToday: false,
      daysUntilJokerReset: 4,
    }

    const result = canUseJoker(status, jokerUsedRecently, { isPremium: true, jokerResetDays: 7 })

    expect(result.canUse).toBe(false)
    expect(result.reason).toContain("jour")
  })
})

// =============================================================================
// MILESTONE TESTS
// =============================================================================

describe("Milestones", () => {
  test("getNextMilestone returns first milestone for 0", () => {
    expect(getNextMilestone(0)).toBe(STREAK_MILESTONES[0])
  })

  test("getNextMilestone returns correct next milestone", () => {
    expect(getNextMilestone(5)).toBe(7)
    expect(getNextMilestone(7)).toBe(14)
    expect(getNextMilestone(30)).toBe(60)
  })

  test("getNextMilestone returns null for max streak", () => {
    expect(getNextMilestone(365)).toBe(null)
    expect(getNextMilestone(1000)).toBe(null)
  })

  test("isAtMilestone detects milestones", () => {
    expect(isAtMilestone(7)).toBe(true)
    expect(isAtMilestone(30)).toBe(true)
    expect(isAtMilestone(8)).toBe(false)
    expect(isAtMilestone(25)).toBe(false)
  })

  test("getAchievedMilestones returns correct list", () => {
    expect(getAchievedMilestones(10)).toEqual([3, 7])
    expect(getAchievedMilestones(35)).toEqual([3, 7, 14, 30])
    expect(getAchievedMilestones(2)).toEqual([])
  })

  test("getMilestoneProgress calculates correctly", () => {
    const progress = getMilestoneProgress(10)

    expect(progress.nextMilestone).toBe(14)
    expect(progress.daysRemaining).toBe(4)
    expect(progress.progress).toBeGreaterThan(0)
    expect(progress.progress).toBeLessThan(100)
  })
})

// =============================================================================
// HISTORY TESTS
// =============================================================================

describe("Streak History", () => {
  test("buildStreakHistory returns correct day count", () => {
    const completions = [
      { date: new Date(), count: 3 },
    ]

    const history = buildStreakHistory(completions, 7)

    expect(history.days.length).toBe(7)
  })

  test("buildStreakHistory calculates completed days", () => {
    const now = new Date()
    now.setHours(12, 0, 0, 0)

    const completions = [
      { date: now, count: 2 },
      { date: new Date(now.getTime() - 86400000), count: 1 },
    ]

    const history = buildStreakHistory(completions, 7, { minTasksPerDay: 1 })

    expect(history.totalDaysCompleted).toBe(2)
  })

  test("buildStreakHistory calculates average tasks per day", () => {
    const now = new Date()
    now.setHours(12, 0, 0, 0)

    const completions = [
      { date: now, count: 5 },
      { date: new Date(now.getTime() - 86400000), count: 3 },
    ]

    const history = buildStreakHistory(completions, 2)

    expect(history.averageTasksPerDay).toBe(4)
  })
})
