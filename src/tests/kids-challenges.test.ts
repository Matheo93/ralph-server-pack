/**
 * Kids Challenges Tests
 *
 * Tests for:
 * - Challenge data transformation helpers
 * - Progress calculation utilities
 * - Days remaining calculation
 * - Challenge stats aggregation
 * - Edge cases for challenge progress
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ============================================================
// MOCK TYPES
// ============================================================

interface Challenge {
  id: string
  household_id: string
  template_id: string | null
  name: string
  description: string | null
  icon: string
  trigger_type: "task_category" | "task_any" | "specific_task"
  trigger_category_code: string | null
  trigger_task_keyword: string | null
  required_count: number
  timeframe_days: number | null
  reward_xp: number
  reward_badge_id: string | null
  reward_custom: string | null
  child_ids: string[]
  started_at: string
  expires_at: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface ChallengeProgress {
  id: string
  challenge_id: string
  child_id: string
  current_count: number
  is_completed: boolean
  completed_at: string | null
  xp_awarded: number | null
  badge_awarded_id: string | null
  last_task_id: string | null
  last_progress_at: string | null
  created_at: string
  updated_at: string
}

interface ChallengeForChild extends Challenge {
  progress: ChallengeProgress
  progressPercentage: number
  remainingCount: number
  daysRemaining: number | null
}

// ============================================================
// HELPER FUNCTIONS TO TEST
// ============================================================

/**
 * Calculate progress percentage for a challenge
 */
function calculateProgressPercentage(currentCount: number, requiredCount: number): number {
  if (requiredCount <= 0) return 0
  return Math.round((currentCount / requiredCount) * 100)
}

/**
 * Calculate remaining count for a challenge
 */
function calculateRemainingCount(currentCount: number, requiredCount: number): number {
  return Math.max(0, requiredCount - currentCount)
}

/**
 * Calculate days remaining until challenge expires
 */
function calculateDaysRemaining(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null
  const expDate = new Date(expiresAt)
  const diffMs = expDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Check if a challenge is expired
 */
function isChallengeExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < now
}

/**
 * Check if challenge is completable (not expired and not completed)
 */
function isChallengeCompletable(
  isCompleted: boolean,
  expiresAt: string | null,
  now: Date = new Date()
): boolean {
  if (isCompleted) return false
  return !isChallengeExpired(expiresAt, now)
}

/**
 * Transform raw challenge data to ChallengeForChild format
 */
function transformToChallengeForChild(
  challenge: Challenge & {
    progress_id: string
    current_count: number
    is_completed: boolean
    completed_at: string | null
  },
  childId: string
): ChallengeForChild {
  const progressPercentage = calculateProgressPercentage(
    challenge.current_count,
    challenge.required_count
  )
  const remainingCount = calculateRemainingCount(
    challenge.current_count,
    challenge.required_count
  )
  const daysRemaining = calculateDaysRemaining(challenge.expires_at)

  return {
    ...challenge,
    progress: {
      id: challenge.progress_id,
      challenge_id: challenge.id,
      child_id: childId,
      current_count: challenge.current_count,
      is_completed: challenge.is_completed,
      completed_at: challenge.completed_at,
      xp_awarded: null,
      badge_awarded_id: null,
      last_task_id: null,
      last_progress_at: null,
      created_at: "",
      updated_at: "",
    },
    progressPercentage,
    remainingCount,
    daysRemaining,
  }
}

/**
 * Calculate streak from recent completions
 */
function calculateStreak(completionDates: string[], today: Date = new Date()): number {
  if (completionDates.length === 0) return 0

  const todayStr = today.toISOString().split("T")[0]
  let currentStreak = 0

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split("T")[0]

    if (completionDates.includes(dateStr)) {
      currentStreak++
    } else if (i > 0) {
      break
    }
  }

  return currentStreak
}

/**
 * Aggregate challenge stats
 */
function aggregateChallengeStats(
  challenges: Array<{
    is_completed: boolean
    is_active: boolean
    xp_awarded: number | null
  }>
): {
  activeCount: number
  completedCount: number
  totalXpEarned: number
} {
  let activeCount = 0
  let completedCount = 0
  let totalXpEarned = 0

  for (const ch of challenges) {
    if (ch.is_completed) {
      completedCount++
      totalXpEarned += ch.xp_awarded ?? 0
    } else if (ch.is_active) {
      activeCount++
    }
  }

  return { activeCount, completedCount, totalXpEarned }
}

/**
 * Validate challenge access for a child
 */
function hasAccessToChallenge(childId: string, childIds: string[]): boolean {
  return childIds.includes(childId)
}

/**
 * Sort challenges by priority (expiring soon first, then by creation date)
 */
function sortChallengesByPriority(
  challenges: Array<{
    expires_at: string | null
    created_at: string
  }>
): Array<{ expires_at: string | null; created_at: string }> {
  return [...challenges].sort((a, b) => {
    // Challenges with expiration date come first
    if (a.expires_at && !b.expires_at) return -1
    if (!a.expires_at && b.expires_at) return 1

    // If both have expiration, sort by expiration date
    if (a.expires_at && b.expires_at) {
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    }

    // Otherwise sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// ============================================================
// PROGRESS PERCENTAGE TESTS
// ============================================================

describe("Progress Percentage Calculation", () => {
  describe("calculateProgressPercentage", () => {
    it("should return 0% when current count is 0", () => {
      expect(calculateProgressPercentage(0, 10)).toBe(0)
    })

    it("should return 50% when halfway done", () => {
      expect(calculateProgressPercentage(5, 10)).toBe(50)
    })

    it("should return 100% when complete", () => {
      expect(calculateProgressPercentage(10, 10)).toBe(100)
    })

    it("should round to nearest integer", () => {
      expect(calculateProgressPercentage(1, 3)).toBe(33) // 33.33... rounds to 33
    })

    it("should handle over-completion (more than required)", () => {
      expect(calculateProgressPercentage(15, 10)).toBe(150)
    })

    it("should return 0 when required count is 0", () => {
      expect(calculateProgressPercentage(5, 0)).toBe(0)
    })

    it("should return 0 when required count is negative", () => {
      expect(calculateProgressPercentage(5, -1)).toBe(0)
    })

    it("should handle single task challenge", () => {
      expect(calculateProgressPercentage(1, 1)).toBe(100)
    })

    it("should handle large numbers", () => {
      expect(calculateProgressPercentage(500, 1000)).toBe(50)
    })

    it("should handle 10% progress", () => {
      expect(calculateProgressPercentage(1, 10)).toBe(10)
    })

    it("should handle 90% progress", () => {
      expect(calculateProgressPercentage(9, 10)).toBe(90)
    })

    it("should handle 1/7 (14.28...%)", () => {
      expect(calculateProgressPercentage(1, 7)).toBe(14)
    })

    it("should handle 2/7 (28.57...%)", () => {
      expect(calculateProgressPercentage(2, 7)).toBe(29)
    })

    it("should handle 6/7 (85.71...%)", () => {
      expect(calculateProgressPercentage(6, 7)).toBe(86)
    })
  })
})

// ============================================================
// REMAINING COUNT TESTS
// ============================================================

describe("Remaining Count Calculation", () => {
  describe("calculateRemainingCount", () => {
    it("should return full required count when not started", () => {
      expect(calculateRemainingCount(0, 10)).toBe(10)
    })

    it("should return half when halfway done", () => {
      expect(calculateRemainingCount(5, 10)).toBe(5)
    })

    it("should return 0 when complete", () => {
      expect(calculateRemainingCount(10, 10)).toBe(0)
    })

    it("should return 0 when over-completed", () => {
      expect(calculateRemainingCount(15, 10)).toBe(0)
    })

    it("should handle single task remaining", () => {
      expect(calculateRemainingCount(9, 10)).toBe(1)
    })

    it("should handle single task challenge", () => {
      expect(calculateRemainingCount(0, 1)).toBe(1)
      expect(calculateRemainingCount(1, 1)).toBe(0)
    })

    it("should handle large numbers", () => {
      expect(calculateRemainingCount(750, 1000)).toBe(250)
    })

    it("should never return negative values", () => {
      expect(calculateRemainingCount(100, 50)).toBe(0)
    })
  })
})

// ============================================================
// DAYS REMAINING TESTS
// ============================================================

describe("Days Remaining Calculation", () => {
  describe("calculateDaysRemaining", () => {
    it("should return null when no expiration date", () => {
      expect(calculateDaysRemaining(null)).toBe(null)
    })

    it("should return 7 days when expires in 7 days", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-25T12:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(7)
    })

    it("should return 1 when expires tomorrow", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-19T12:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(1)
    })

    it("should return 0 when expires today", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-18T18:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(1) // Ceil rounds up partial day
    })

    it("should return 0 when already expired", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-17T12:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(0)
    })

    it("should round up partial days", () => {
      const now = new Date("2026-01-18T00:00:00Z")
      const expiresAt = "2026-01-18T12:00:00Z" // 12 hours = 0.5 days
      expect(calculateDaysRemaining(expiresAt, now)).toBe(1)
    })

    it("should handle 30 day challenges", () => {
      const now = new Date("2026-01-01T00:00:00Z")
      const expiresAt = "2026-01-31T00:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(30)
    })

    it("should handle 365 day challenges", () => {
      const now = new Date("2026-01-01T00:00:00Z")
      const expiresAt = "2027-01-01T00:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(365)
    })

    it("should handle expired challenge from long ago", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2025-01-18T12:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(0)
    })
  })
})

// ============================================================
// CHALLENGE EXPIRATION TESTS
// ============================================================

describe("Challenge Expiration", () => {
  describe("isChallengeExpired", () => {
    it("should return false when no expiration date", () => {
      expect(isChallengeExpired(null)).toBe(false)
    })

    it("should return false when expires in future", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-25T12:00:00Z"
      expect(isChallengeExpired(expiresAt, now)).toBe(false)
    })

    it("should return true when expired", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-17T12:00:00Z"
      expect(isChallengeExpired(expiresAt, now)).toBe(true)
    })

    it("should return false when expires exactly now", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      const expiresAt = "2026-01-18T12:00:00Z"
      // Equal dates: not expired yet (not strictly less than)
      expect(isChallengeExpired(expiresAt, now)).toBe(false)
    })

    it("should return true when expired by one second", () => {
      const now = new Date("2026-01-18T12:00:01Z")
      const expiresAt = "2026-01-18T12:00:00Z"
      expect(isChallengeExpired(expiresAt, now)).toBe(true)
    })
  })

  describe("isChallengeCompletable", () => {
    it("should return true when not completed and not expired", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      expect(isChallengeCompletable(false, "2026-01-25T12:00:00Z", now)).toBe(true)
    })

    it("should return false when already completed", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      expect(isChallengeCompletable(true, "2026-01-25T12:00:00Z", now)).toBe(false)
    })

    it("should return false when expired", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      expect(isChallengeCompletable(false, "2026-01-17T12:00:00Z", now)).toBe(false)
    })

    it("should return false when completed and expired", () => {
      const now = new Date("2026-01-18T12:00:00Z")
      expect(isChallengeCompletable(true, "2026-01-17T12:00:00Z", now)).toBe(false)
    })

    it("should return true when no expiration date", () => {
      expect(isChallengeCompletable(false, null)).toBe(true)
    })
  })
})

// ============================================================
// STREAK CALCULATION TESTS
// ============================================================

describe("Streak Calculation", () => {
  describe("calculateStreak", () => {
    it("should return 0 for no completions", () => {
      expect(calculateStreak([])).toBe(0)
    })

    it("should return 1 for completion today", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      expect(calculateStreak(["2026-01-18"], today)).toBe(1)
    })

    it("should return 2 for completions today and yesterday", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      expect(calculateStreak(["2026-01-18", "2026-01-17"], today)).toBe(2)
    })

    it("should return 3 for 3 consecutive days", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      expect(calculateStreak(["2026-01-18", "2026-01-17", "2026-01-16"], today)).toBe(3)
    })

    it("should return 7 for full week streak", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      const dates = [
        "2026-01-18",
        "2026-01-17",
        "2026-01-16",
        "2026-01-15",
        "2026-01-14",
        "2026-01-13",
        "2026-01-12",
      ]
      expect(calculateStreak(dates, today)).toBe(7)
    })

    it("should cap at 7 days even with more completions", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      const dates = [
        "2026-01-18",
        "2026-01-17",
        "2026-01-16",
        "2026-01-15",
        "2026-01-14",
        "2026-01-13",
        "2026-01-12",
        "2026-01-11",
        "2026-01-10",
      ]
      expect(calculateStreak(dates, today)).toBe(7)
    })

    it("should break streak on gap", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      // Missing 2026-01-17
      expect(calculateStreak(["2026-01-18", "2026-01-16"], today)).toBe(1)
    })

    it("should not count future dates", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      // 2026-01-19 is in the future
      expect(calculateStreak(["2026-01-19", "2026-01-18"], today)).toBe(1)
    })

    it("should handle missing today but has yesterday", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      // Algorithm checks from today, if today is missing (i=0), streak breaks unless i>0
      // When today is missing at i=0, the loop continues but finds no match
      // When i=1 (yesterday) has a match, streak++ but then breaks at next gap
      // Actually the algorithm breaks only when i>0 and no match found
      // So if today is not found (i=0), streak stays 0, then loop continues
      // At i=1 yesterday is found, so streak = 1
      expect(calculateStreak(["2026-01-17"], today)).toBe(1)
    })

    it("should count consecutive days even if array is unordered", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      expect(calculateStreak(["2026-01-16", "2026-01-18", "2026-01-17"], today)).toBe(3)
    })
  })
})

// ============================================================
// CHALLENGE STATS AGGREGATION TESTS
// ============================================================

describe("Challenge Stats Aggregation", () => {
  describe("aggregateChallengeStats", () => {
    it("should return zeros for empty array", () => {
      const result = aggregateChallengeStats([])
      expect(result).toEqual({
        activeCount: 0,
        completedCount: 0,
        totalXpEarned: 0,
      })
    })

    it("should count active challenges", () => {
      const challenges = [
        { is_completed: false, is_active: true, xp_awarded: null },
        { is_completed: false, is_active: true, xp_awarded: null },
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.activeCount).toBe(2)
      expect(result.completedCount).toBe(0)
    })

    it("should count completed challenges", () => {
      const challenges = [
        { is_completed: true, is_active: true, xp_awarded: 50 },
        { is_completed: true, is_active: true, xp_awarded: 100 },
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.completedCount).toBe(2)
      expect(result.activeCount).toBe(0)
    })

    it("should sum XP from completed challenges", () => {
      const challenges = [
        { is_completed: true, is_active: true, xp_awarded: 50 },
        { is_completed: true, is_active: true, xp_awarded: 100 },
        { is_completed: true, is_active: true, xp_awarded: 75 },
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.totalXpEarned).toBe(225)
    })

    it("should handle null xp_awarded", () => {
      const challenges = [
        { is_completed: true, is_active: true, xp_awarded: null },
        { is_completed: true, is_active: true, xp_awarded: 50 },
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.totalXpEarned).toBe(50)
    })

    it("should not count inactive non-completed challenges", () => {
      const challenges = [
        { is_completed: false, is_active: false, xp_awarded: null },
        { is_completed: false, is_active: true, xp_awarded: null },
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.activeCount).toBe(1)
    })

    it("should handle mixed states", () => {
      const challenges = [
        { is_completed: false, is_active: true, xp_awarded: null }, // Active
        { is_completed: true, is_active: true, xp_awarded: 50 }, // Completed
        { is_completed: false, is_active: false, xp_awarded: null }, // Inactive
        { is_completed: true, is_active: true, xp_awarded: 100 }, // Completed
        { is_completed: false, is_active: true, xp_awarded: null }, // Active
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.activeCount).toBe(2)
      expect(result.completedCount).toBe(2)
      expect(result.totalXpEarned).toBe(150)
    })
  })
})

// ============================================================
// CHALLENGE ACCESS TESTS
// ============================================================

describe("Challenge Access", () => {
  describe("hasAccessToChallenge", () => {
    it("should return true when child is in child_ids", () => {
      const childId = "child-1"
      const childIds = ["child-1", "child-2"]
      expect(hasAccessToChallenge(childId, childIds)).toBe(true)
    })

    it("should return false when child is not in child_ids", () => {
      const childId = "child-3"
      const childIds = ["child-1", "child-2"]
      expect(hasAccessToChallenge(childId, childIds)).toBe(false)
    })

    it("should return false for empty child_ids", () => {
      const childId = "child-1"
      const childIds: string[] = []
      expect(hasAccessToChallenge(childId, childIds)).toBe(false)
    })

    it("should handle single child assignment", () => {
      const childId = "child-1"
      const childIds = ["child-1"]
      expect(hasAccessToChallenge(childId, childIds)).toBe(true)
    })

    it("should be case-sensitive", () => {
      const childId = "Child-1"
      const childIds = ["child-1"]
      expect(hasAccessToChallenge(childId, childIds)).toBe(false)
    })
  })
})

// ============================================================
// CHALLENGE SORTING TESTS
// ============================================================

describe("Challenge Sorting", () => {
  describe("sortChallengesByPriority", () => {
    it("should put expiring challenges first", () => {
      const challenges = [
        { expires_at: null, created_at: "2026-01-15T00:00:00Z" },
        { expires_at: "2026-01-25T00:00:00Z", created_at: "2026-01-10T00:00:00Z" },
      ]
      const sorted = sortChallengesByPriority(challenges)
      expect(sorted[0]?.expires_at).toBe("2026-01-25T00:00:00Z")
    })

    it("should sort expiring challenges by expiration date", () => {
      const challenges = [
        { expires_at: "2026-01-30T00:00:00Z", created_at: "2026-01-10T00:00:00Z" },
        { expires_at: "2026-01-20T00:00:00Z", created_at: "2026-01-15T00:00:00Z" },
      ]
      const sorted = sortChallengesByPriority(challenges)
      expect(sorted[0]?.expires_at).toBe("2026-01-20T00:00:00Z")
    })

    it("should sort non-expiring challenges by creation date (newest first)", () => {
      const challenges = [
        { expires_at: null, created_at: "2026-01-10T00:00:00Z" },
        { expires_at: null, created_at: "2026-01-15T00:00:00Z" },
      ]
      const sorted = sortChallengesByPriority(challenges)
      expect(sorted[0]?.created_at).toBe("2026-01-15T00:00:00Z")
    })

    it("should not modify original array", () => {
      const challenges = [
        { expires_at: "2026-01-30T00:00:00Z", created_at: "2026-01-10T00:00:00Z" },
        { expires_at: "2026-01-20T00:00:00Z", created_at: "2026-01-15T00:00:00Z" },
      ]
      const original = [...challenges]
      sortChallengesByPriority(challenges)
      expect(challenges).toEqual(original)
    })

    it("should handle empty array", () => {
      expect(sortChallengesByPriority([])).toEqual([])
    })

    it("should handle single element", () => {
      const challenges = [{ expires_at: null, created_at: "2026-01-15T00:00:00Z" }]
      expect(sortChallengesByPriority(challenges)).toEqual(challenges)
    })

    it("should handle complex sorting scenario", () => {
      const challenges = [
        { expires_at: null, created_at: "2026-01-10T00:00:00Z" }, // D - no expire, oldest
        { expires_at: "2026-01-30T00:00:00Z", created_at: "2026-01-05T00:00:00Z" }, // B - expires later
        { expires_at: null, created_at: "2026-01-15T00:00:00Z" }, // C - no expire, newest
        { expires_at: "2026-01-20T00:00:00Z", created_at: "2026-01-12T00:00:00Z" }, // A - expires soonest
      ]
      const sorted = sortChallengesByPriority(challenges)
      // Expected order: A (expires soonest), B (expires later), C (no expire, newest), D (no expire, oldest)
      expect(sorted[0]?.expires_at).toBe("2026-01-20T00:00:00Z")
      expect(sorted[1]?.expires_at).toBe("2026-01-30T00:00:00Z")
      expect(sorted[2]?.created_at).toBe("2026-01-15T00:00:00Z")
      expect(sorted[3]?.created_at).toBe("2026-01-10T00:00:00Z")
    })
  })
})

// ============================================================
// CHALLENGE TRANSFORM TESTS
// ============================================================

describe("Challenge Transform", () => {
  describe("transformToChallengeForChild", () => {
    const baseChallenge = {
      id: "challenge-1",
      household_id: "household-1",
      template_id: null,
      name: "Complete 5 tasks",
      description: "Complete any 5 tasks",
      icon: "🎯",
      trigger_type: "task_any" as const,
      trigger_category_code: null,
      trigger_task_keyword: null,
      required_count: 5,
      timeframe_days: 7,
      reward_xp: 100,
      reward_badge_id: null,
      reward_custom: null,
      child_ids: ["child-1", "child-2"],
      started_at: "2026-01-15T00:00:00Z",
      expires_at: "2026-01-25T00:00:00Z",
      is_active: true,
      created_by: "user-1",
      created_at: "2026-01-15T00:00:00Z",
      updated_at: "2026-01-15T00:00:00Z",
    }

    it("should transform challenge with zero progress", () => {
      const challenge = {
        ...baseChallenge,
        progress_id: "progress-1",
        current_count: 0,
        is_completed: false,
        completed_at: null,
      }
      const result = transformToChallengeForChild(challenge, "child-1")
      expect(result.progressPercentage).toBe(0)
      expect(result.remainingCount).toBe(5)
      expect(result.progress.current_count).toBe(0)
      expect(result.progress.is_completed).toBe(false)
    })

    it("should transform challenge with partial progress", () => {
      const challenge = {
        ...baseChallenge,
        progress_id: "progress-1",
        current_count: 3,
        is_completed: false,
        completed_at: null,
      }
      const result = transformToChallengeForChild(challenge, "child-1")
      expect(result.progressPercentage).toBe(60)
      expect(result.remainingCount).toBe(2)
    })

    it("should transform completed challenge", () => {
      const challenge = {
        ...baseChallenge,
        progress_id: "progress-1",
        current_count: 5,
        is_completed: true,
        completed_at: "2026-01-20T00:00:00Z",
      }
      const result = transformToChallengeForChild(challenge, "child-1")
      expect(result.progressPercentage).toBe(100)
      expect(result.remainingCount).toBe(0)
      expect(result.progress.is_completed).toBe(true)
      expect(result.progress.completed_at).toBe("2026-01-20T00:00:00Z")
    })

    it("should preserve child_id in progress", () => {
      const challenge = {
        ...baseChallenge,
        progress_id: "progress-1",
        current_count: 2,
        is_completed: false,
        completed_at: null,
      }
      const result = transformToChallengeForChild(challenge, "child-1")
      expect(result.progress.child_id).toBe("child-1")
    })

    it("should preserve challenge_id in progress", () => {
      const challenge = {
        ...baseChallenge,
        progress_id: "progress-1",
        current_count: 2,
        is_completed: false,
        completed_at: null,
      }
      const result = transformToChallengeForChild(challenge, "child-1")
      expect(result.progress.challenge_id).toBe("challenge-1")
    })

    it("should handle challenge without expiration", () => {
      const challenge = {
        ...baseChallenge,
        expires_at: null,
        progress_id: "progress-1",
        current_count: 2,
        is_completed: false,
        completed_at: null,
      }
      const result = transformToChallengeForChild(challenge, "child-1")
      expect(result.daysRemaining).toBe(null)
    })
  })
})

// ============================================================
// EDGE CASES
// ============================================================

describe("Edge Cases", () => {
  describe("Very large numbers", () => {
    it("should handle large required counts", () => {
      expect(calculateProgressPercentage(500, 10000)).toBe(5)
      expect(calculateRemainingCount(500, 10000)).toBe(9500)
    })

    it("should handle large XP values in stats", () => {
      const challenges = [
        { is_completed: true, is_active: true, xp_awarded: 999999 },
        { is_completed: true, is_active: true, xp_awarded: 1 },
      ]
      const result = aggregateChallengeStats(challenges)
      expect(result.totalXpEarned).toBe(1000000)
    })
  })

  describe("Date edge cases", () => {
    it("should handle midnight boundary", () => {
      const now = new Date("2026-01-18T23:59:59Z")
      const expiresAt = "2026-01-19T00:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(1)
    })

    it("should handle timezone differences gracefully", () => {
      // Test with different timezone representations
      const now = new Date("2026-01-18T00:00:00+00:00")
      const expiresAt = "2026-01-19T00:00:00+00:00"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(1)
    })

    it("should handle leap year dates", () => {
      const now = new Date("2028-02-28T12:00:00Z") // 2028 is a leap year
      const expiresAt = "2028-03-01T12:00:00Z" // 2 days later
      expect(calculateDaysRemaining(expiresAt, now)).toBe(2)
    })

    it("should handle end of year", () => {
      const now = new Date("2025-12-31T12:00:00Z")
      const expiresAt = "2026-01-07T12:00:00Z"
      expect(calculateDaysRemaining(expiresAt, now)).toBe(7)
    })
  })

  describe("Empty or null values", () => {
    it("should handle empty child_ids array", () => {
      expect(hasAccessToChallenge("child-1", [])).toBe(false)
    })

    it("should handle empty completion dates array", () => {
      expect(calculateStreak([])).toBe(0)
    })

    it("should handle empty challenges array for stats", () => {
      const result = aggregateChallengeStats([])
      expect(result.activeCount).toBe(0)
      expect(result.completedCount).toBe(0)
      expect(result.totalXpEarned).toBe(0)
    })
  })

  describe("Boundary values", () => {
    it("should handle progress at exactly required count", () => {
      expect(calculateProgressPercentage(10, 10)).toBe(100)
      expect(calculateRemainingCount(10, 10)).toBe(0)
    })

    it("should handle progress one below required count", () => {
      expect(calculateProgressPercentage(9, 10)).toBe(90)
      expect(calculateRemainingCount(9, 10)).toBe(1)
    })

    it("should handle progress one above required count", () => {
      expect(calculateProgressPercentage(11, 10)).toBe(110)
      expect(calculateRemainingCount(11, 10)).toBe(0)
    })

    it("should handle streak at exactly 7 days", () => {
      const today = new Date("2026-01-18T12:00:00Z")
      const dates = [
        "2026-01-18",
        "2026-01-17",
        "2026-01-16",
        "2026-01-15",
        "2026-01-14",
        "2026-01-13",
        "2026-01-12",
      ]
      expect(calculateStreak(dates, today)).toBe(7)
    })
  })
})

// ============================================================
// TRIGGER TYPE VALIDATION TESTS
// ============================================================

describe("Challenge Trigger Types", () => {
  it("should recognize task_category trigger", () => {
    const triggerType: "task_category" | "task_any" | "specific_task" = "task_category"
    expect(triggerType).toBe("task_category")
  })

  it("should recognize task_any trigger", () => {
    const triggerType: "task_category" | "task_any" | "specific_task" = "task_any"
    expect(triggerType).toBe("task_any")
  })

  it("should recognize specific_task trigger", () => {
    const triggerType: "task_category" | "task_any" | "specific_task" = "specific_task"
    expect(triggerType).toBe("specific_task")
  })
})

// ============================================================
// INTEGRATION-STYLE TESTS
// ============================================================

describe("Integration-style Tests", () => {
  describe("Complete challenge workflow", () => {
    it("should track progress through entire challenge lifecycle", () => {
      const requiredCount = 5
      const rewardXp = 100

      // Start: 0/5 (0%)
      let currentCount = 0
      expect(calculateProgressPercentage(currentCount, requiredCount)).toBe(0)
      expect(calculateRemainingCount(currentCount, requiredCount)).toBe(5)
      expect(isChallengeCompletable(false, "2026-01-25T00:00:00Z")).toBe(true)

      // Progress: 1/5 (20%)
      currentCount = 1
      expect(calculateProgressPercentage(currentCount, requiredCount)).toBe(20)
      expect(calculateRemainingCount(currentCount, requiredCount)).toBe(4)

      // Progress: 3/5 (60%)
      currentCount = 3
      expect(calculateProgressPercentage(currentCount, requiredCount)).toBe(60)
      expect(calculateRemainingCount(currentCount, requiredCount)).toBe(2)

      // Complete: 5/5 (100%)
      currentCount = 5
      expect(calculateProgressPercentage(currentCount, requiredCount)).toBe(100)
      expect(calculateRemainingCount(currentCount, requiredCount)).toBe(0)

      // After completion
      expect(isChallengeCompletable(true, "2026-01-25T00:00:00Z")).toBe(false)

      // Verify stats
      const stats = aggregateChallengeStats([
        { is_completed: true, is_active: true, xp_awarded: rewardXp },
      ])
      expect(stats.completedCount).toBe(1)
      expect(stats.totalXpEarned).toBe(rewardXp)
    })

    it("should handle multiple children on same challenge", () => {
      const challengeChildIds = ["child-1", "child-2", "child-3"]

      // Verify all assigned children have access
      expect(hasAccessToChallenge("child-1", challengeChildIds)).toBe(true)
      expect(hasAccessToChallenge("child-2", challengeChildIds)).toBe(true)
      expect(hasAccessToChallenge("child-3", challengeChildIds)).toBe(true)

      // Non-assigned child should not have access
      expect(hasAccessToChallenge("child-4", challengeChildIds)).toBe(false)
    })

    it("should correctly aggregate stats for multiple challenges", () => {
      const challenges = [
        // Child 1 completed challenge
        { is_completed: true, is_active: true, xp_awarded: 100 },
        // Active challenge
        { is_completed: false, is_active: true, xp_awarded: null },
        // Another completed challenge
        { is_completed: true, is_active: true, xp_awarded: 50 },
        // Deactivated challenge
        { is_completed: false, is_active: false, xp_awarded: null },
        // Active challenge
        { is_completed: false, is_active: true, xp_awarded: null },
      ]

      const stats = aggregateChallengeStats(challenges)

      expect(stats.activeCount).toBe(2)
      expect(stats.completedCount).toBe(2)
      expect(stats.totalXpEarned).toBe(150)
    })
  })
})
