/**
 * Joker Streak Feature Tests
 *
 * Unit tests for the joker streak feature including:
 * - Joker availability logic
 * - Premium subscription checks
 * - Monthly joker usage tracking
 * - Streak preservation logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// =============================================================================
// MOCK TYPES
// =============================================================================

interface JokerStatus {
  available: boolean
  usedThisMonth: boolean
  isPremium: boolean
  currentStreak: number
  streakAtRisk: boolean
  lastStreakUpdate: string | null
}

interface Household {
  id: string
  subscription_status: string
  streak_current: number
  streak_best: number
  streak_last_update: string | null
}

// =============================================================================
// MOCK DATA
// =============================================================================

const createMockHousehold = (
  overrides: Partial<Household> = {}
): Household => ({
  id: "household-1",
  subscription_status: "active",
  streak_current: 15,
  streak_best: 20,
  streak_last_update: new Date().toISOString().split("T")[0] ?? null,
  ...overrides,
})

// =============================================================================
// HELPER FUNCTIONS (Mirroring service logic for testing)
// =============================================================================

function calculateJokerAvailability(
  household: Household,
  jokerUsedThisMonth: boolean
): JokerStatus {
  const isPremium = ["active", "trial"].includes(household.subscription_status)

  const today = new Date()
  const lastUpdate = household.streak_last_update
    ? new Date(household.streak_last_update)
    : null

  let streakAtRisk = false
  if (lastUpdate) {
    const daysSinceUpdate = Math.floor(
      (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    )
    streakAtRisk = daysSinceUpdate >= 1 && household.streak_current > 0
  }

  return {
    available: isPremium && !jokerUsedThisMonth,
    usedThisMonth: jokerUsedThisMonth,
    isPremium,
    currentStreak: household.streak_current,
    streakAtRisk,
    lastStreakUpdate: household.streak_last_update,
  }
}

function canUseJoker(status: JokerStatus): { canUse: boolean; reason: string } {
  if (!status.isPremium) {
    return { canUse: false, reason: "Fonctionnalité réservée aux abonnés Premium" }
  }
  if (status.usedThisMonth) {
    return { canUse: false, reason: "Joker déjà utilisé ce mois-ci" }
  }
  return { canUse: true, reason: "Joker disponible" }
}

function calculateStreakAfterJoker(
  currentStreak: number,
  lastUpdate: Date | null,
  today: Date,
  jokerUsed: boolean
): number {
  if (!lastUpdate) return currentStreak
  if (jokerUsed) return currentStreak // Streak preserved

  const daysDiff = Math.floor(
    (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysDiff === 0) return currentStreak
  if (daysDiff === 1) return currentStreak + 1
  return 1 // Streak broken
}

// =============================================================================
// JOKER AVAILABILITY TESTS
// =============================================================================

describe("Joker Availability", () => {
  describe("Premium status", () => {
    it("should be available for active subscription", () => {
      const household = createMockHousehold({ subscription_status: "active" })
      const status = calculateJokerAvailability(household, false)
      expect(status.isPremium).toBe(true)
      expect(status.available).toBe(true)
    })

    it("should be available for trial subscription", () => {
      const household = createMockHousehold({ subscription_status: "trial" })
      const status = calculateJokerAvailability(household, false)
      expect(status.isPremium).toBe(true)
      expect(status.available).toBe(true)
    })

    it("should NOT be available for cancelled subscription", () => {
      const household = createMockHousehold({ subscription_status: "cancelled" })
      const status = calculateJokerAvailability(household, false)
      expect(status.isPremium).toBe(false)
      expect(status.available).toBe(false)
    })

    it("should NOT be available for expired subscription", () => {
      const household = createMockHousehold({ subscription_status: "expired" })
      const status = calculateJokerAvailability(household, false)
      expect(status.isPremium).toBe(false)
      expect(status.available).toBe(false)
    })
  })

  describe("Monthly usage", () => {
    it("should be available if not used this month", () => {
      const household = createMockHousehold()
      const status = calculateJokerAvailability(household, false)
      expect(status.usedThisMonth).toBe(false)
      expect(status.available).toBe(true)
    })

    it("should NOT be available if already used this month", () => {
      const household = createMockHousehold()
      const status = calculateJokerAvailability(household, true)
      expect(status.usedThisMonth).toBe(true)
      expect(status.available).toBe(false)
    })

    it("should reset availability in new month", () => {
      // This tests the concept - actual reset happens on month change
      const household = createMockHousehold()
      const statusUsed = calculateJokerAvailability(household, true)
      const statusNewMonth = calculateJokerAvailability(household, false)

      expect(statusUsed.available).toBe(false)
      expect(statusNewMonth.available).toBe(true)
    })
  })
})

// =============================================================================
// STREAK RISK DETECTION TESTS
// =============================================================================

describe("Streak Risk Detection", () => {
  it("should detect streak at risk when no activity today", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const household = createMockHousehold({
      streak_last_update: yesterday.toISOString().split("T")[0],
    })
    const status = calculateJokerAvailability(household, false)
    expect(status.streakAtRisk).toBe(true)
  })

  it("should NOT be at risk when activity today", () => {
    const today = new Date()
    const household = createMockHousehold({
      streak_last_update: today.toISOString().split("T")[0],
    })
    const status = calculateJokerAvailability(household, false)
    expect(status.streakAtRisk).toBe(false)
  })

  it("should be at risk when more than one day since last activity", () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const household = createMockHousehold({
      streak_last_update: twoDaysAgo.toISOString().split("T")[0],
    })
    const status = calculateJokerAvailability(household, false)
    expect(status.streakAtRisk).toBe(true)
  })

  it("should NOT be at risk when streak is zero", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const household = createMockHousehold({
      streak_current: 0,
      streak_last_update: yesterday.toISOString().split("T")[0],
    })
    const status = calculateJokerAvailability(household, false)
    expect(status.streakAtRisk).toBe(false)
  })

  it("should NOT be at risk when no last update", () => {
    const household = createMockHousehold({
      streak_last_update: null,
    })
    const status = calculateJokerAvailability(household, false)
    expect(status.streakAtRisk).toBe(false)
  })
})

// =============================================================================
// JOKER USAGE VALIDATION TESTS
// =============================================================================

describe("Joker Usage Validation", () => {
  describe("canUseJoker", () => {
    it("should allow usage for premium with available joker", () => {
      const status: JokerStatus = {
        available: true,
        usedThisMonth: false,
        isPremium: true,
        currentStreak: 10,
        streakAtRisk: true,
        lastStreakUpdate: null,
      }
      const result = canUseJoker(status)
      expect(result.canUse).toBe(true)
    })

    it("should deny usage for non-premium", () => {
      const status: JokerStatus = {
        available: false,
        usedThisMonth: false,
        isPremium: false,
        currentStreak: 10,
        streakAtRisk: true,
        lastStreakUpdate: null,
      }
      const result = canUseJoker(status)
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain("Premium")
    })

    it("should deny usage when already used this month", () => {
      const status: JokerStatus = {
        available: false,
        usedThisMonth: true,
        isPremium: true,
        currentStreak: 10,
        streakAtRisk: true,
        lastStreakUpdate: null,
      }
      const result = canUseJoker(status)
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain("déjà utilisé")
    })
  })
})

// =============================================================================
// STREAK PRESERVATION TESTS
// =============================================================================

describe("Streak Preservation", () => {
  it("should preserve streak when joker is used", () => {
    const lastUpdate = new Date()
    lastUpdate.setDate(lastUpdate.getDate() - 2) // 2 days ago - streak would break

    const today = new Date()
    const currentStreak = 15

    // Without joker - streak breaks
    const withoutJoker = calculateStreakAfterJoker(
      currentStreak,
      lastUpdate,
      today,
      false
    )
    expect(withoutJoker).toBe(1) // Reset to 1

    // With joker - streak preserved
    const withJoker = calculateStreakAfterJoker(
      currentStreak,
      lastUpdate,
      today,
      true
    )
    expect(withJoker).toBe(15) // Preserved
  })

  it("should still increment streak on consecutive days", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const today = new Date()
    const currentStreak = 10

    const result = calculateStreakAfterJoker(currentStreak, yesterday, today, false)
    expect(result).toBe(11) // Incremented
  })

  it("should not change streak on same day", () => {
    const today = new Date()
    const currentStreak = 10

    const result = calculateStreakAfterJoker(currentStreak, today, today, false)
    expect(result).toBe(10) // Unchanged
  })

  it("should reset streak without joker after gap", () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const today = new Date()
    const currentStreak = 50

    const result = calculateStreakAfterJoker(currentStreak, threeDaysAgo, today, false)
    expect(result).toBe(1) // Reset
  })
})

// =============================================================================
// JOKER STATUS OBJECT TESTS
// =============================================================================

describe("Joker Status Object", () => {
  it("should have all required properties", () => {
    const household = createMockHousehold()
    const status = calculateJokerAvailability(household, false)

    expect(status).toHaveProperty("available")
    expect(status).toHaveProperty("usedThisMonth")
    expect(status).toHaveProperty("isPremium")
    expect(status).toHaveProperty("currentStreak")
    expect(status).toHaveProperty("streakAtRisk")
    expect(status).toHaveProperty("lastStreakUpdate")
  })

  it("should return correct current streak", () => {
    const household = createMockHousehold({ streak_current: 42 })
    const status = calculateJokerAvailability(household, false)
    expect(status.currentStreak).toBe(42)
  })

  it("should handle zero streak", () => {
    const household = createMockHousehold({ streak_current: 0 })
    const status = calculateJokerAvailability(household, false)
    expect(status.currentStreak).toBe(0)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("should handle new household with no streak history", () => {
    const household = createMockHousehold({
      streak_current: 0,
      streak_best: 0,
      streak_last_update: null,
    })
    const status = calculateJokerAvailability(household, false)

    expect(status.currentStreak).toBe(0)
    expect(status.streakAtRisk).toBe(false)
    expect(status.lastStreakUpdate).toBeNull()
  })

  it("should handle very long streak", () => {
    const household = createMockHousehold({
      streak_current: 365,
      streak_best: 365,
    })
    const status = calculateJokerAvailability(household, false)
    expect(status.currentStreak).toBe(365)
  })

  it("should handle subscription status edge cases", () => {
    const statuses = ["active", "trial", "cancelled", "expired", "past_due", "unknown"]
    const premiumStatuses = ["active", "trial"]

    statuses.forEach((subscriptionStatus) => {
      const household = createMockHousehold({ subscription_status: subscriptionStatus })
      const status = calculateJokerAvailability(household, false)

      if (premiumStatuses.includes(subscriptionStatus)) {
        expect(status.isPremium).toBe(true)
      } else {
        expect(status.isPremium).toBe(false)
      }
    })
  })
})

// =============================================================================
// MONTHLY RESET SIMULATION
// =============================================================================

describe("Monthly Reset Simulation", () => {
  it("should allow joker usage in January after December use", () => {
    // This simulates month rollover
    const household = createMockHousehold()

    // December - joker was used
    const decemberStatus = calculateJokerAvailability(household, true)
    expect(decemberStatus.available).toBe(false)

    // January - new month, joker reset
    const januaryStatus = calculateJokerAvailability(household, false)
    expect(januaryStatus.available).toBe(true)
  })

  it("should track joker usage per month correctly", () => {
    const household = createMockHousehold()

    // First use in month
    const beforeUse = calculateJokerAvailability(household, false)
    expect(beforeUse.available).toBe(true)
    expect(beforeUse.usedThisMonth).toBe(false)

    // After use
    const afterUse = calculateJokerAvailability(household, true)
    expect(afterUse.available).toBe(false)
    expect(afterUse.usedThisMonth).toBe(true)
  })
})
