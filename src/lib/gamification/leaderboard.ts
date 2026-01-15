/**
 * Leaderboard System
 *
 * Family and global rankings:
 * - Family leaderboard
 * - Weekly/monthly rankings
 * - Fair comparison metrics
 * - Anonymized global stats
 */

import { z } from "zod"
import { getStartOfDay, getDaysDifference } from "./streak-engine"

// =============================================================================
// SCHEMAS
// =============================================================================

export const LeaderboardPeriodSchema = z.enum(["week", "month", "all_time"])

export const LeaderboardCategorySchema = z.enum([
  "points",
  "tasks",
  "streak",
  "balance",
  "team_contribution",
])

export const LeaderboardEntrySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  rank: z.number().min(1),
  previousRank: z.number().nullable(),
  score: z.number(),
  scoreChange: z.number(),
  details: z.object({
    tasksCompleted: z.number().optional(),
    currentStreak: z.number().optional(),
    totalPoints: z.number().optional(),
    averageBalance: z.number().optional(),
    contribution: z.number().optional(),
  }),
  isCurrentUser: z.boolean(),
  badges: z.array(z.string()), // Achievement badge emojis
})

export const FamilyLeaderboardSchema = z.object({
  householdId: z.string(),
  period: LeaderboardPeriodSchema,
  category: LeaderboardCategorySchema,
  entries: z.array(LeaderboardEntrySchema),
  lastUpdated: z.date(),
  summary: z.object({
    totalScore: z.number(),
    averageScore: z.number(),
    topPerformer: z.string(),
    mostImproved: z.string().nullable(),
  }),
})

export const GlobalStatsSchema = z.object({
  totalHouseholds: z.number(),
  totalUsers: z.number(),
  averageStreak: z.number(),
  averageTasksPerWeek: z.number(),
  topStreakPercentile: z.record(z.number(), z.number()), // e.g., { 10: 30, 25: 14, 50: 7 }
  fairnessDistribution: z.object({
    excellent: z.number(), // % of households with >80 balance
    good: z.number(), // 60-80
    fair: z.number(), // 40-60
    poor: z.number(), // <40
  }),
})

export const UserRankingInfoSchema = z.object({
  userId: z.string(),
  householdRank: z.number(),
  householdSize: z.number(),
  globalPercentile: z.number(), // e.g., 85 = top 15%
  streakPercentile: z.number(),
  tasksPercentile: z.number(),
  comparison: z.object({
    vsAverage: z.number(), // % above/below average
    vsTop10: z.number(), // % of top 10% score
  }),
})

// =============================================================================
// TYPES
// =============================================================================

export type LeaderboardPeriod = z.infer<typeof LeaderboardPeriodSchema>
export type LeaderboardCategory = z.infer<typeof LeaderboardCategorySchema>
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>
export type FamilyLeaderboard = z.infer<typeof FamilyLeaderboardSchema>
export type GlobalStats = z.infer<typeof GlobalStatsSchema>
export type UserRankingInfo = z.infer<typeof UserRankingInfoSchema>

// =============================================================================
// PERIOD HELPERS
// =============================================================================

/**
 * Get date range for a period
 */
export function getPeriodDateRange(period: LeaderboardPeriod): {
  startDate: Date
  endDate: Date
  label: string
} {
  const now = new Date()
  const endDate = getStartOfDay(now)

  switch (period) {
    case "week": {
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 7)
      return { startDate, endDate, label: "Cette semaine" }
    }
    case "month": {
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 30)
      return { startDate, endDate, label: "Ce mois" }
    }
    case "all_time": {
      const startDate = new Date(0) // Beginning of time
      return { startDate, endDate, label: "Tout temps" }
    }
  }
}

/**
 * Get the label for a period
 */
export function getPeriodLabel(period: LeaderboardPeriod): string {
  const labels: Record<LeaderboardPeriod, string> = {
    week: "Cette semaine",
    month: "Ce mois",
    all_time: "Tout temps",
  }
  return labels[period]
}

/**
 * Get the label for a category
 */
export function getCategoryLabel(category: LeaderboardCategory): string {
  const labels: Record<LeaderboardCategory, string> = {
    points: "Points",
    tasks: "Tâches",
    streak: "Série",
    balance: "Équilibre",
    team_contribution: "Contribution",
  }
  return labels[category]
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

/**
 * User stats for leaderboard calculation
 */
export interface UserStats {
  userId: string
  userName: string
  tasksCompleted: number
  criticalTasksCompleted: number
  totalWeight: number
  currentStreak: number
  longestStreak: number
  totalPoints: number
  averageBalanceScore: number
  badges: string[]
}

/**
 * Calculate score based on category
 */
export function calculateScore(
  stats: UserStats,
  category: LeaderboardCategory
): number {
  switch (category) {
    case "points":
      return stats.totalPoints
    case "tasks":
      // Weighted: normal tasks = 1, critical = 2
      return stats.tasksCompleted + stats.criticalTasksCompleted
    case "streak":
      return stats.currentStreak
    case "balance":
      return Math.round(stats.averageBalanceScore)
    case "team_contribution":
      // Combination of tasks and balance
      return Math.round(
        stats.totalWeight * 0.7 + stats.averageBalanceScore * 0.3
      )
  }
}

/**
 * Create leaderboard entry from stats
 */
export function createLeaderboardEntry(
  stats: UserStats,
  category: LeaderboardCategory,
  rank: number,
  previousRank: number | null,
  previousScore: number,
  isCurrentUser: boolean
): LeaderboardEntry {
  const score = calculateScore(stats, category)

  return {
    userId: stats.userId,
    userName: stats.userName,
    rank,
    previousRank,
    score,
    scoreChange: score - previousScore,
    details: {
      tasksCompleted: stats.tasksCompleted,
      currentStreak: stats.currentStreak,
      totalPoints: stats.totalPoints,
      averageBalance: stats.averageBalanceScore,
      contribution: stats.totalWeight,
    },
    isCurrentUser,
    badges: stats.badges.slice(0, 3), // Show top 3 badges
  }
}

// =============================================================================
// LEADERBOARD GENERATION
// =============================================================================

/**
 * Generate family leaderboard from user stats
 */
export function generateFamilyLeaderboard(
  householdId: string,
  memberStats: UserStats[],
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  currentUserId: string,
  previousRanks?: Map<string, { rank: number; score: number }>
): FamilyLeaderboard {
  if (memberStats.length === 0) {
    return {
      householdId,
      period,
      category,
      entries: [],
      lastUpdated: new Date(),
      summary: {
        totalScore: 0,
        averageScore: 0,
        topPerformer: "",
        mostImproved: null,
      },
    }
  }

  // Sort by score (descending)
  const sorted = [...memberStats].sort(
    (a, b) => calculateScore(b, category) - calculateScore(a, category)
  )

  // Create entries with ranks
  const entries: LeaderboardEntry[] = sorted.map((stats, index) => {
    const rank = index + 1
    const prev = previousRanks?.get(stats.userId)
    return createLeaderboardEntry(
      stats,
      category,
      rank,
      prev?.rank ?? null,
      prev?.score ?? 0,
      stats.userId === currentUserId
    )
  })

  // Calculate summary
  const totalScore = entries.reduce((sum, e) => sum + e.score, 0)
  const averageScore = totalScore / entries.length

  // Find most improved (biggest positive rank change)
  let mostImproved: string | null = null
  let maxImprovement = 0

  for (const entry of entries) {
    if (entry.previousRank !== null) {
      const improvement = entry.previousRank - entry.rank
      if (improvement > maxImprovement) {
        maxImprovement = improvement
        mostImproved = entry.userName
      }
    }
  }

  return {
    householdId,
    period,
    category,
    entries,
    lastUpdated: new Date(),
    summary: {
      totalScore,
      averageScore: Math.round(averageScore),
      topPerformer: entries[0]?.userName ?? "",
      mostImproved,
    },
  }
}

/**
 * Get rank change indicator
 */
export function getRankChangeIndicator(
  currentRank: number,
  previousRank: number | null
): { emoji: string; text: string; color: "green" | "red" | "gray" } {
  if (previousRank === null) {
    return { emoji: "🆕", text: "Nouveau", color: "gray" }
  }

  const change = previousRank - currentRank

  if (change > 0) {
    return { emoji: "↑", text: `+${change}`, color: "green" }
  }
  if (change < 0) {
    return { emoji: "↓", text: `${change}`, color: "red" }
  }
  return { emoji: "→", text: "=", color: "gray" }
}

// =============================================================================
// GLOBAL STATS
// =============================================================================

/**
 * Calculate percentile rank
 */
export function calculatePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 0

  const sorted = [...allValues].sort((a, b) => a - b)
  let count = 0

  for (const v of sorted) {
    if (v < value) count++
    else break
  }

  return Math.round((count / allValues.length) * 100)
}

/**
 * Create default global stats
 */
export function createDefaultGlobalStats(): GlobalStats {
  return {
    totalHouseholds: 0,
    totalUsers: 0,
    averageStreak: 0,
    averageTasksPerWeek: 0,
    topStreakPercentile: {
      10: 30, // Top 10% have 30+ day streaks
      25: 14, // Top 25% have 14+ day streaks
      50: 7, // Top 50% have 7+ day streaks
    },
    fairnessDistribution: {
      excellent: 15,
      good: 35,
      fair: 35,
      poor: 15,
    },
  }
}

/**
 * Calculate user's ranking info compared to global stats
 */
export function calculateUserRankingInfo(
  userId: string,
  userStats: UserStats,
  householdRank: number,
  householdSize: number,
  globalStats: GlobalStats,
  allStreaks?: number[],
  allTaskCounts?: number[]
): UserRankingInfo {
  // Calculate percentiles
  const streakPercentile = allStreaks
    ? calculatePercentile(userStats.currentStreak, allStreaks)
    : 50

  const tasksPercentile = allTaskCounts
    ? calculatePercentile(userStats.tasksCompleted, allTaskCounts)
    : 50

  // Combined global percentile
  const globalPercentile = Math.round((streakPercentile + tasksPercentile) / 2)

  // Comparison to average
  const vsAverage =
    globalStats.averageStreak > 0
      ? Math.round(
          ((userStats.currentStreak - globalStats.averageStreak) /
            globalStats.averageStreak) *
            100
        )
      : 0

  // Comparison to top 10%
  const top10Threshold = globalStats.topStreakPercentile[10] ?? 30
  const vsTop10 = Math.round((userStats.currentStreak / top10Threshold) * 100)

  return {
    userId,
    householdRank,
    householdSize,
    globalPercentile,
    streakPercentile,
    tasksPercentile,
    comparison: {
      vsAverage,
      vsTop10: Math.min(vsTop10, 100),
    },
  }
}

// =============================================================================
// FAIR COMPARISON
// =============================================================================

/**
 * Normalized score for fair comparison (accounts for household size, etc.)
 */
export function calculateNormalizedScore(
  stats: UserStats,
  householdSize: number,
  daysSinceJoin: number
): number {
  // Base score from tasks
  const taskScore = stats.tasksCompleted * 10

  // Streak bonus (exponential growth)
  const streakBonus = Math.pow(stats.currentStreak, 1.2) * 5

  // Normalize for household size (larger households = more total tasks)
  const sizeMultiplier = Math.max(1, 2 - householdSize * 0.2)

  // Normalize for account age (newer accounts get slight boost)
  const ageMultiplier = daysSinceJoin < 30 ? 1.2 : daysSinceJoin < 90 ? 1.1 : 1

  return Math.round((taskScore + streakBonus) * sizeMultiplier * ageMultiplier)
}

/**
 * Compare two users fairly
 */
export function compareFairly(
  stats1: UserStats,
  stats2: UserStats,
  householdSize1: number,
  householdSize2: number,
  daysSinceJoin1: number,
  daysSinceJoin2: number
): {
  winner: string
  score1: number
  score2: number
  difference: number
  isClose: boolean
} {
  const score1 = calculateNormalizedScore(stats1, householdSize1, daysSinceJoin1)
  const score2 = calculateNormalizedScore(stats2, householdSize2, daysSinceJoin2)

  const difference = Math.abs(score1 - score2)
  const isClose = difference < Math.max(score1, score2) * 0.1 // Within 10%

  return {
    winner: score1 >= score2 ? stats1.userId : stats2.userId,
    score1,
    score2,
    difference,
    isClose,
  }
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format leaderboard entry for display
 */
export function formatLeaderboardEntry(entry: LeaderboardEntry): {
  rank: string
  name: string
  score: string
  change: { emoji: string; text: string; color: string }
  badges: string
  isHighlighted: boolean
} {
  const change = getRankChangeIndicator(entry.rank, entry.previousRank)

  // Format rank with medal emoji for top 3
  let rankDisplay = `${entry.rank}`
  if (entry.rank === 1) rankDisplay = "🥇 1"
  else if (entry.rank === 2) rankDisplay = "🥈 2"
  else if (entry.rank === 3) rankDisplay = "🥉 3"

  return {
    rank: rankDisplay,
    name: entry.userName,
    score: entry.score.toLocaleString(),
    change,
    badges: entry.badges.join(" "),
    isHighlighted: entry.isCurrentUser,
  }
}

/**
 * Get motivational message based on rank
 */
export function getLeaderboardMessage(
  entry: LeaderboardEntry,
  totalEntries: number
): string {
  if (entry.rank === 1) {
    return "🏆 En tête ! Continuez comme ça !"
  }

  if (entry.rank === 2) {
    return "🥈 Excellent ! À un pas du sommet."
  }

  if (entry.rank === 3) {
    return "🥉 Sur le podium ! Bien joué !"
  }

  const positionFromTop = entry.rank - 1
  if (entry.previousRank && entry.rank < entry.previousRank) {
    return `↑ Vous progressez ! Encore ${positionFromTop} place(s) pour le sommet.`
  }

  if (entry.rank > totalEntries / 2) {
    return "💪 Continuez vos efforts, vous pouvez remonter !"
  }

  return `📊 ${entry.rank}ème sur ${totalEntries}. Vous êtes dans la première moitié !`
}

/**
 * Format percentile for display
 */
export function formatPercentile(percentile: number): {
  text: string
  emoji: string
  color: "green" | "yellow" | "gray"
} {
  if (percentile >= 90) {
    return { text: `Top ${100 - percentile}%`, emoji: "🌟", color: "green" }
  }
  if (percentile >= 75) {
    return { text: `Top ${100 - percentile}%`, emoji: "⭐", color: "green" }
  }
  if (percentile >= 50) {
    return {
      text: `Meilleur que ${percentile}%`,
      emoji: "📈",
      color: "yellow",
    }
  }
  return { text: `${percentile}ème percentile`, emoji: "📊", color: "gray" }
}

/**
 * Format summary for display
 */
export function formatLeaderboardSummary(leaderboard: FamilyLeaderboard): {
  period: string
  category: string
  topPerformer: string
  averageScore: number
  totalParticipants: number
  highlights: string[]
} {
  const highlights: string[] = []

  if (leaderboard.summary.topPerformer) {
    highlights.push(
      `🏆 ${leaderboard.summary.topPerformer} mène le classement`
    )
  }

  if (leaderboard.summary.mostImproved) {
    highlights.push(
      `📈 ${leaderboard.summary.mostImproved} a le plus progressé`
    )
  }

  // Check for close competition
  if (leaderboard.entries.length >= 2) {
    const gap =
      leaderboard.entries[0]!.score - leaderboard.entries[1]!.score
    if (gap < leaderboard.entries[0]!.score * 0.05) {
      highlights.push("⚔️ Course serrée pour la première place !")
    }
  }

  return {
    period: getPeriodLabel(leaderboard.period),
    category: getCategoryLabel(leaderboard.category),
    topPerformer: leaderboard.summary.topPerformer,
    averageScore: leaderboard.summary.averageScore,
    totalParticipants: leaderboard.entries.length,
    highlights,
  }
}
