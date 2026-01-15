/**
 * Gamification Module Tests
 *
 * Tests for streak engine, joker system, achievements, and leaderboard.
 * Covers 30+ tests across all gamification features.
 */

import { describe, it, expect, beforeEach } from "vitest"

// Streak Engine
import {
  getStartOfDay,
  getDaysDifference,
  isSameDay,
  isYesterday,
  isToday,
  isActiveDay,
  createDailyActivity,
  getActivitySummary,
  calculateStreakStatus,
  detectStreakBreak,
  canRecoverStreak,
  attemptStreakRecovery,
  calculateHouseholdStreak,
  getStreakMilestone,
  checkMilestoneReached,
  calculateStreakPoints,
  getStreakMessage,
  formatStreakDisplay,
  DEFAULT_STREAK_CONFIG,
  type DailyActivity,
  type StreakStatus,
} from "@/lib/gamification/streak-engine"

// Joker System
import {
  createJokerInventory,
  countJokersByType,
  getTotalAvailableJokers,
  createJokerToken,
  addJokerToInventory,
  cleanupExpiredJokers,
  allocateMonthlyJokers,
  getBestJokerToUse,
  useJoker,
  checkGoldenJokerReward,
  formatJokerInventory,
  DEFAULT_JOKER_CONFIG,
  type JokerInventory,
} from "@/lib/gamification/joker-system"

// Achievements
import {
  createUserAchievements,
  updateAchievementProgress,
  updateAchievementsFromStats,
  getUnlockedAchievements,
  getNextAchievements,
  getUserTier,
  getPointsToNextTier,
  formatAchievementsSummary,
  ACHIEVEMENT_DEFINITIONS,
  type UserAchievements,
} from "@/lib/gamification/achievements"

// Leaderboard
import {
  getPeriodDateRange,
  calculateScore,
  generateFamilyLeaderboard,
  getRankChangeIndicator,
  calculatePercentile,
  calculateNormalizedScore,
  formatLeaderboardEntry,
  getLeaderboardMessage,
  type UserStats,
} from "@/lib/gamification/leaderboard"

// =============================================================================
// TEST HELPERS
// =============================================================================

const createTestActivity = (
  daysAgo: number,
  userId: string = "user-1",
  wasActive: boolean = true
): DailyActivity => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    date: getStartOfDay(date),
    userId,
    tasksCompleted: wasActive ? 2 : 0,
    criticalTasksCompleted: 0,
    totalWeight: wasActive ? 5 : 0,
    wasActiveDay: wasActive,
  }
}

const createStreakActivities = (
  userId: string,
  streakDays: number,
  includingToday: boolean = true
): DailyActivity[] => {
  const activities: DailyActivity[] = []
  const startOffset = includingToday ? 0 : 1

  for (let i = startOffset; i < streakDays + startOffset; i++) {
    activities.push(createTestActivity(i, userId, true))
  }

  return activities
}

const createTestUserStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  userId: "user-1",
  userName: "Alice",
  tasksCompleted: 10,
  criticalTasksCompleted: 2,
  totalWeight: 25,
  currentStreak: 7,
  longestStreak: 14,
  totalPoints: 100,
  averageBalanceScore: 75,
  badges: ["🔥", "✅"],
  ...overrides,
})

// =============================================================================
// STREAK ENGINE TESTS
// =============================================================================

describe("Streak Engine", () => {
  describe("Date Helpers", () => {
    it("should get start of day", () => {
      const date = new Date("2024-01-15T14:30:00")
      const startOfDay = getStartOfDay(date)
      expect(startOfDay.getHours()).toBe(0)
      expect(startOfDay.getMinutes()).toBe(0)
    })

    it("should calculate days difference", () => {
      const date1 = new Date("2024-01-15")
      const date2 = new Date("2024-01-18")
      expect(getDaysDifference(date1, date2)).toBe(3)
    })

    it("should check same day", () => {
      const date1 = new Date("2024-01-15T10:00:00")
      const date2 = new Date("2024-01-15T22:00:00")
      expect(isSameDay(date1, date2)).toBe(true)
    })

    it("should check yesterday", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isYesterday(yesterday)).toBe(true)
    })

    it("should check today", () => {
      expect(isToday(new Date())).toBe(true)
    })
  })

  describe("Activity Tracking", () => {
    it("should check active day based on config", () => {
      const activeActivity = createTestActivity(0, "user-1", true)
      const inactiveActivity = createTestActivity(0, "user-1", false)

      expect(isActiveDay(activeActivity, DEFAULT_STREAK_CONFIG)).toBe(true)
      expect(isActiveDay(inactiveActivity, DEFAULT_STREAK_CONFIG)).toBe(false)
    })

    it("should create daily activity", () => {
      const activity = createDailyActivity("user-1", new Date(), 3, 1, 10)
      expect(activity.userId).toBe("user-1")
      expect(activity.tasksCompleted).toBe(3)
      expect(activity.wasActiveDay).toBe(true)
    })

    it("should get activity summary", () => {
      const activities = createStreakActivities("user-1", 7)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const summary = getActivitySummary(activities, "user-1", startDate, endDate)
      expect(summary.activeDays).toBe(7)
      expect(summary.activityRate).toBeGreaterThan(0)
    })
  })

  describe("Streak Calculation", () => {
    it("should calculate current streak", () => {
      const activities = createStreakActivities("user-1", 7, true)
      const status = calculateStreakStatus("user-1", activities)

      expect(status.currentStreak).toBe(7)
      expect(status.isActiveToday).toBe(true)
    })

    it("should return 0 streak for no activities", () => {
      const status = calculateStreakStatus("user-1", [])
      expect(status.currentStreak).toBe(0)
      expect(status.totalDaysActive).toBe(0)
    })

    it("should detect streak at risk", () => {
      const activities = createStreakActivities("user-1", 5, false)
      const status = calculateStreakStatus("user-1", activities)

      expect(status.currentStreak).toBeGreaterThan(0)
      expect(status.isActiveToday).toBe(false)
    })

    it("should calculate longest streak", () => {
      const activities = createStreakActivities("user-1", 10, true)
      const status = calculateStreakStatus("user-1", activities)

      expect(status.longestStreak).toBeGreaterThanOrEqual(status.currentStreak)
    })
  })

  describe("Streak Break Detection", () => {
    it("should detect streak break", () => {
      const previous: StreakStatus = {
        userId: "user-1",
        currentStreak: 10,
        longestStreak: 10,
        lastActiveDate: new Date(),
        streakStartDate: new Date(),
        totalDaysActive: 10,
        isActiveToday: true,
        riskOfBreak: false,
      }

      const current: StreakStatus = {
        ...previous,
        currentStreak: 0,
        isActiveToday: false,
      }

      const breakInfo = detectStreakBreak(previous, current)
      expect(breakInfo).not.toBeNull()
      expect(breakInfo?.previousStreak).toBe(10)
    })

    it("should check if recovery is possible", () => {
      const breakInfo = {
        userId: "user-1",
        breakDate: new Date(),
        previousStreak: 10,
        canRecover: true,
        recoveryDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        recoveryRequirements: { tasksNeeded: 4, weightNeeded: 8 },
      }

      expect(canRecoverStreak(breakInfo)).toBe(true)
    })
  })

  describe("Household Streak", () => {
    it("should calculate combined household streak", () => {
      const memberActivities = new Map<string, DailyActivity[]>()
      memberActivities.set("user-1", createStreakActivities("user-1", 5, true))
      memberActivities.set("user-2", createStreakActivities("user-2", 5, true))

      const householdStreak = calculateHouseholdStreak(
        "household-1",
        memberActivities
      )

      expect(householdStreak.combinedStreak).toBeGreaterThan(0)
      expect(householdStreak.memberStreaks.length).toBe(2)
    })
  })

  describe("Streak Milestones", () => {
    it("should get milestone info", () => {
      const milestone = getStreakMilestone(10)
      expect(milestone).not.toBeNull()
      expect(milestone?.milestone).toBe(7)
      expect(milestone?.nextMilestone).toBe(14)
    })

    it("should check milestone reached", () => {
      const result = checkMilestoneReached(6, 7)
      expect(result.reached).toBe(true)
      expect(result.milestone).toBe(7)
    })

    it("should calculate streak points", () => {
      const points = calculateStreakPoints(6, 7)
      expect(points.totalPoints).toBeGreaterThan(0)
      expect(points.milestonePoints).toBeGreaterThan(0) // Hit 7-day milestone
    })
  })

  describe("Formatting", () => {
    it("should format streak message", () => {
      const status = calculateStreakStatus(
        "user-1",
        createStreakActivities("user-1", 7, true)
      )
      const message = getStreakMessage(status)
      expect(message).toContain("7")
    })

    it("should format streak display", () => {
      const status = calculateStreakStatus(
        "user-1",
        createStreakActivities("user-1", 7, true)
      )
      const display = formatStreakDisplay(status)
      expect(display.value).toBe("7")
      expect(display.color).toBe("green")
    })
  })
})

// =============================================================================
// JOKER SYSTEM TESTS
// =============================================================================

describe("Joker System", () => {
  describe("Inventory Management", () => {
    it("should create empty inventory", () => {
      const inventory = createJokerInventory("user-1")
      expect(inventory.userId).toBe("user-1")
      expect(inventory.available.length).toBe(0)
    })

    it("should count jokers by type", () => {
      const inventory = createJokerInventory("user-1")
      const counts = countJokersByType(inventory)
      expect(counts.standard).toBe(0)
      expect(counts.golden).toBe(0)
    })

    it("should create joker token", () => {
      const joker = createJokerToken("user-1", "standard", "monthly_allocation")
      expect(joker.userId).toBe("user-1")
      expect(joker.type).toBe("standard")
      expect(joker.usedAt).toBeNull()
    })

    it("should add joker to inventory", () => {
      const inventory = createJokerInventory("user-1")
      const joker = createJokerToken("user-1", "standard", "monthly_allocation")

      const { inventory: updated, added } = addJokerToInventory(inventory, joker)
      expect(added).toBe(true)
      expect(updated.available.length).toBe(1)
    })

    it("should respect max storage limit", () => {
      let inventory = createJokerInventory("user-1")

      // Add max jokers
      for (let i = 0; i < DEFAULT_JOKER_CONFIG.maxStorable; i++) {
        const joker = createJokerToken("user-1", "standard", "monthly_allocation")
        const result = addJokerToInventory(inventory, joker)
        inventory = result.inventory
      }

      // Try to add one more
      const extraJoker = createJokerToken("user-1", "standard", "monthly_allocation")
      const { added } = addJokerToInventory(inventory, extraJoker)
      expect(added).toBe(false)
    })
  })

  describe("Monthly Allocation", () => {
    it("should allocate monthly jokers", () => {
      const inventory = createJokerInventory("user-1")
      // Force eligibility by clearing next allocation date
      const eligibleInventory = { ...inventory, nextAllocationDate: new Date(2020, 0, 1) }

      const { result } = allocateMonthlyJokers(eligibleInventory, false)
      expect(result.allocated).toBe(true)
      expect(result.jokersAdded).toBe(DEFAULT_JOKER_CONFIG.monthlyAllocation)
    })

    it("should give premium bonus", () => {
      const inventory = createJokerInventory("user-1")
      const eligibleInventory = { ...inventory, nextAllocationDate: new Date(2020, 0, 1) }

      const { result } = allocateMonthlyJokers(eligibleInventory, true)
      expect(result.jokersAdded).toBe(
        DEFAULT_JOKER_CONFIG.monthlyAllocation + DEFAULT_JOKER_CONFIG.premiumBonus
      )
    })
  })

  describe("Joker Usage", () => {
    it("should find best joker to use", () => {
      const inventory = createJokerInventory("user-1")
      const standardJoker = createJokerToken("user-1", "standard", "monthly_allocation")
      const goldenJoker = createJokerToken("user-1", "golden", "achievement")

      const { inventory: updated } = addJokerToInventory(
        addJokerToInventory(inventory, standardJoker).inventory,
        goldenJoker
      )

      const best = getBestJokerToUse(updated, 10)
      expect(best?.type).toBe("standard") // Should use standard before golden
    })

    it("should use joker to protect streak", () => {
      let inventory = createJokerInventory("user-1")
      const joker = createJokerToken("user-1", "standard", "monthly_allocation")
      inventory = addJokerToInventory(inventory, joker).inventory

      const streakStatus: StreakStatus = {
        userId: "user-1",
        currentStreak: 10,
        longestStreak: 10,
        lastActiveDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        streakStartDate: new Date(),
        totalDaysActive: 10,
        isActiveToday: false,
        riskOfBreak: true,
      }

      const { result } = useJoker(inventory, streakStatus)
      expect(result.success).toBe(true)
      expect(result.streakPreserved).toBe(10)
    })

    it("should not use joker if already active today", () => {
      let inventory = createJokerInventory("user-1")
      const joker = createJokerToken("user-1", "standard", "monthly_allocation")
      inventory = addJokerToInventory(inventory, joker).inventory

      const streakStatus: StreakStatus = {
        userId: "user-1",
        currentStreak: 10,
        longestStreak: 10,
        lastActiveDate: new Date(),
        streakStartDate: new Date(),
        totalDaysActive: 10,
        isActiveToday: true,
        riskOfBreak: false,
      }

      const { result } = useJoker(inventory, streakStatus)
      expect(result.success).toBe(false)
      expect(result.message).toContain("déjà actif")
    })
  })

  describe("Golden Joker Rewards", () => {
    it("should check golden joker reward for milestone", () => {
      const result30 = checkGoldenJokerReward(29, 30)
      expect(result30).toBe(true)

      const result60 = checkGoldenJokerReward(59, 60)
      expect(result60).toBe(true)

      const resultNone = checkGoldenJokerReward(25, 26)
      expect(resultNone).toBe(false)
    })
  })

  describe("Formatting", () => {
    it("should format joker inventory", () => {
      let inventory = createJokerInventory("user-1")
      const joker = createJokerToken("user-1", "standard", "monthly_allocation")
      inventory = addJokerToInventory(inventory, joker).inventory

      const formatted = formatJokerInventory(inventory)
      expect(formatted.total).toBe(1)
      expect(formatted.byType.length).toBe(1)
    })
  })
})

// =============================================================================
// ACHIEVEMENT TESTS
// =============================================================================

describe("Achievements", () => {
  describe("User Achievements", () => {
    it("should create empty user achievements", () => {
      const achievements = createUserAchievements("user-1")
      expect(achievements.userId).toBe("user-1")
      expect(achievements.totalPoints).toBe(0)
      expect(achievements.progress.length).toBeGreaterThan(0)
    })

    it("should update achievement progress", () => {
      const achievements = createUserAchievements("user-1")
      const { achievements: updated, notification } = updateAchievementProgress(
        achievements,
        "streak_7",
        7
      )

      expect(updated.progress.find((p) => p.achievementId === "streak_7")?.percentage).toBe(100)
      expect(notification).not.toBeNull()
    })

    it("should batch update from stats", () => {
      const achievements = createUserAchievements("user-1")
      const { achievements: updated, notifications } = updateAchievementsFromStats(
        achievements,
        { currentStreak: 7, totalTasksCompleted: 10 }
      )

      expect(updated.totalPoints).toBeGreaterThan(0)
      expect(notifications.length).toBeGreaterThan(0)
    })
  })

  describe("Achievement Queries", () => {
    it("should get unlocked achievements", () => {
      let achievements = createUserAchievements("user-1")
      achievements = updateAchievementProgress(achievements, "streak_3", 3).achievements

      const unlocked = getUnlockedAchievements(achievements)
      expect(unlocked.length).toBe(1)
      expect(unlocked[0]?.id).toBe("streak_3")
    })

    it("should get next achievements", () => {
      const achievements = createUserAchievements("user-1")
      // Set some partial progress
      const { achievements: updated } = updateAchievementProgress(
        achievements,
        "streak_7",
        5
      )

      const next = getNextAchievements(updated, 3)
      expect(next.length).toBeGreaterThan(0)
    })
  })

  describe("Tiers", () => {
    it("should get user tier based on points", () => {
      expect(getUserTier(0)).toBe("bronze")
      expect(getUserTier(150)).toBe("silver")
      expect(getUserTier(600)).toBe("gold")
      expect(getUserTier(2000)).toBe("platinum")
      expect(getUserTier(6000)).toBe("diamond")
    })

    it("should calculate points to next tier", () => {
      const tierInfo = getPointsToNextTier(80)
      expect(tierInfo.currentTier).toBe("bronze")
      expect(tierInfo.nextTier).toBe("silver")
      expect(tierInfo.pointsNeeded).toBe(20)
    })
  })

  describe("Formatting", () => {
    it("should format achievements summary", () => {
      let achievements = createUserAchievements("user-1")
      achievements = updateAchievementProgress(achievements, "streak_3", 3).achievements

      const summary = formatAchievementsSummary(achievements)
      expect(summary.totalPoints).toBeGreaterThan(0)
      expect(summary.unlockedCount).toBe(1)
    })
  })
})

// =============================================================================
// LEADERBOARD TESTS
// =============================================================================

describe("Leaderboard", () => {
  describe("Period Helpers", () => {
    it("should get period date range", () => {
      const weekRange = getPeriodDateRange("week")
      expect(weekRange.label).toBe("Cette semaine")

      const monthRange = getPeriodDateRange("month")
      expect(monthRange.label).toBe("Ce mois")
    })
  })

  describe("Score Calculation", () => {
    it("should calculate score by category", () => {
      const stats = createTestUserStats({ totalPoints: 100, currentStreak: 7, tasksCompleted: 20 })

      expect(calculateScore(stats, "points")).toBe(100)
      expect(calculateScore(stats, "streak")).toBe(7)
      expect(calculateScore(stats, "tasks")).toBe(22) // 20 + 2 critical
    })
  })

  describe("Leaderboard Generation", () => {
    it("should generate family leaderboard", () => {
      const memberStats = [
        createTestUserStats({ userId: "1", userName: "Alice", totalPoints: 150 }),
        createTestUserStats({ userId: "2", userName: "Bob", totalPoints: 100 }),
        createTestUserStats({ userId: "3", userName: "Charlie", totalPoints: 75 }),
      ]

      const leaderboard = generateFamilyLeaderboard(
        "household-1",
        memberStats,
        "points",
        "week",
        "2"
      )

      expect(leaderboard.entries.length).toBe(3)
      expect(leaderboard.entries[0]?.userName).toBe("Alice")
      expect(leaderboard.entries[0]?.rank).toBe(1)
      expect(leaderboard.summary.topPerformer).toBe("Alice")
    })

    it("should mark current user", () => {
      const memberStats = [
        createTestUserStats({ userId: "1", userName: "Alice", totalPoints: 150 }),
        createTestUserStats({ userId: "2", userName: "Bob", totalPoints: 100 }),
      ]

      const leaderboard = generateFamilyLeaderboard(
        "household-1",
        memberStats,
        "points",
        "week",
        "2"
      )

      const currentUserEntry = leaderboard.entries.find((e) => e.isCurrentUser)
      expect(currentUserEntry?.userId).toBe("2")
    })
  })

  describe("Rank Indicators", () => {
    it("should get rank change indicator", () => {
      expect(getRankChangeIndicator(1, 3).emoji).toBe("↑")
      expect(getRankChangeIndicator(3, 1).emoji).toBe("↓")
      expect(getRankChangeIndicator(2, 2).emoji).toBe("→")
      expect(getRankChangeIndicator(1, null).emoji).toBe("🆕")
    })
  })

  describe("Percentile Calculation", () => {
    it("should calculate percentile", () => {
      const values = [10, 20, 30, 40, 50]
      expect(calculatePercentile(30, values)).toBe(40)
      expect(calculatePercentile(50, values)).toBe(80)
    })
  })

  describe("Normalized Score", () => {
    it("should calculate normalized score", () => {
      const stats = createTestUserStats({ tasksCompleted: 10, currentStreak: 7 })
      const score = calculateNormalizedScore(stats, 2, 30)
      expect(score).toBeGreaterThan(0)
    })
  })

  describe("Formatting", () => {
    it("should format leaderboard entry", () => {
      const entry = {
        userId: "1",
        userName: "Alice",
        rank: 1,
        previousRank: 2,
        score: 150,
        scoreChange: 25,
        details: { tasksCompleted: 10 },
        isCurrentUser: true,
        badges: ["🔥", "✅"],
      }

      const formatted = formatLeaderboardEntry(entry)
      expect(formatted.rank).toContain("🥇")
      expect(formatted.isHighlighted).toBe(true)
    })

    it("should get motivational message", () => {
      const topEntry = {
        userId: "1",
        userName: "Alice",
        rank: 1,
        previousRank: 2,
        score: 150,
        scoreChange: 25,
        details: {},
        isCurrentUser: true,
        badges: [],
      }

      const message = getLeaderboardMessage(topEntry, 5)
      expect(message).toContain("tête")
    })
  })
})
