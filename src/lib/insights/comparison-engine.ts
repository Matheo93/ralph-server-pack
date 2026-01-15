/**
 * Comparison Engine - Family member comparison and ranking
 * Functional, immutable approach to family comparisons
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const ComparisonMetric = z.enum([
  "completion_rate",
  "tasks_completed",
  "time_contributed",
  "on_time_rate",
  "streak",
  "points",
  "productivity",
])
export type ComparisonMetric = z.infer<typeof ComparisonMetric>

export const MemberPerformanceSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  role: z.string(),
  metrics: z.object({
    completionRate: z.number(),
    tasksCompleted: z.number(),
    timeContributedMinutes: z.number(),
    onTimeRate: z.number(),
    streak: z.number(),
    points: z.number(),
    productivity: z.number(), // tasks per day
  }),
})
export type MemberPerformance = z.infer<typeof MemberPerformanceSchema>

export const RankingEntrySchema = z.object({
  rank: z.number(),
  memberId: z.string(),
  memberName: z.string(),
  value: z.number(),
  change: z.number(), // rank change from previous period
  isTop: z.boolean(),
  medal: z.enum(["gold", "silver", "bronze"]).nullable(),
})
export type RankingEntry = z.infer<typeof RankingEntrySchema>

export const LeaderboardSchema = z.object({
  metric: ComparisonMetric,
  metricLabel: z.string(),
  period: z.string(),
  entries: z.array(RankingEntrySchema),
  generatedAt: z.date(),
})
export type Leaderboard = z.infer<typeof LeaderboardSchema>

export const ComparisonResultSchema = z.object({
  memberA: MemberPerformanceSchema,
  memberB: MemberPerformanceSchema,
  comparison: z.object({
    winner: z.string().nullable(),
    metricComparisons: z.array(z.object({
      metric: z.string(),
      valueA: z.number(),
      valueB: z.number(),
      winner: z.enum(["A", "B", "tie"]),
      difference: z.number(),
      percentageDiff: z.number(),
    })),
    overallScore: z.object({
      memberA: z.number(),
      memberB: z.number(),
    }),
  }),
})
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>

export const AchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.enum(["completion", "consistency", "speed", "collaboration", "special"]),
  unlockedBy: z.array(z.string()),
  unlockedAt: z.date().nullable(),
})
export type Achievement = z.infer<typeof AchievementSchema>

export const FairShareSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  expectedShare: z.number(), // percentage
  actualShare: z.number(),
  deviation: z.number(),
  status: z.enum(["under", "fair", "over"]),
})
export type FairShare = z.infer<typeof FairShareSchema>

// =============================================================================
// METRIC LABELS
// =============================================================================

export const METRIC_LABELS: Record<ComparisonMetric, string> = {
  completion_rate: "Taux de complétion",
  tasks_completed: "Tâches terminées",
  time_contributed: "Temps contribué",
  on_time_rate: "Taux de ponctualité",
  streak: "Série en cours",
  points: "Points",
  productivity: "Productivité",
}

// =============================================================================
// RANKING
// =============================================================================

/**
 * Get metric value from performance
 */
export function getMetricValue(
  performance: MemberPerformance,
  metric: ComparisonMetric
): number {
  switch (metric) {
    case "completion_rate":
      return performance.metrics.completionRate
    case "tasks_completed":
      return performance.metrics.tasksCompleted
    case "time_contributed":
      return performance.metrics.timeContributedMinutes
    case "on_time_rate":
      return performance.metrics.onTimeRate
    case "streak":
      return performance.metrics.streak
    case "points":
      return performance.metrics.points
    case "productivity":
      return performance.metrics.productivity
  }
}

/**
 * Create ranking from performances
 */
export function createRanking(
  performances: MemberPerformance[],
  metric: ComparisonMetric,
  previousRanks?: Map<string, number>
): RankingEntry[] {
  // Sort by metric value (descending)
  const sorted = [...performances].sort(
    (a, b) => getMetricValue(b, metric) - getMetricValue(a, metric)
  )

  const entries: RankingEntry[] = []
  let currentRank = 1
  let previousValue = -1

  for (let i = 0; i < sorted.length; i++) {
    const perf = sorted[i]!
    const value = getMetricValue(perf, metric)

    // Handle ties
    if (value !== previousValue && i > 0) {
      currentRank = i + 1
    }

    const previousRank = previousRanks?.get(perf.memberId) ?? currentRank
    const change = previousRank - currentRank // Positive = improved

    entries.push({
      rank: currentRank,
      memberId: perf.memberId,
      memberName: perf.memberName,
      value,
      change,
      isTop: currentRank <= 3,
      medal: currentRank === 1 ? "gold"
        : currentRank === 2 ? "silver"
        : currentRank === 3 ? "bronze"
        : null,
    })

    previousValue = value
  }

  return entries
}

/**
 * Generate leaderboard
 */
export function generateLeaderboard(
  performances: MemberPerformance[],
  metric: ComparisonMetric,
  period: string,
  previousRanks?: Map<string, number>
): Leaderboard {
  return {
    metric,
    metricLabel: METRIC_LABELS[metric],
    period,
    entries: createRanking(performances, metric, previousRanks),
    generatedAt: new Date(),
  }
}

/**
 * Generate all leaderboards
 */
export function generateAllLeaderboards(
  performances: MemberPerformance[],
  period: string,
  previousRanksMap?: Map<ComparisonMetric, Map<string, number>>
): Leaderboard[] {
  const metrics: ComparisonMetric[] = [
    "completion_rate",
    "tasks_completed",
    "time_contributed",
    "on_time_rate",
    "streak",
    "points",
    "productivity",
  ]

  return metrics.map((metric) =>
    generateLeaderboard(
      performances,
      metric,
      period,
      previousRanksMap?.get(metric)
    )
  )
}

// =============================================================================
// HEAD-TO-HEAD COMPARISON
// =============================================================================

type MetricWinner = "A" | "B" | "tie"

/**
 * Compare two values and determine winner
 */
export function compareValues(
  valueA: number,
  valueB: number
): { winner: MetricWinner; difference: number; percentageDiff: number } {
  const difference = valueA - valueB
  const percentageDiff = valueB !== 0
    ? Math.round(((valueA - valueB) / valueB) * 100)
    : valueA > 0 ? 100 : 0

  let winner: MetricWinner = "tie"
  if (valueA > valueB) winner = "A"
  if (valueB > valueA) winner = "B"

  return { winner, difference, percentageDiff }
}

/**
 * Compare two members
 */
export function compareTwoMembers(
  memberA: MemberPerformance,
  memberB: MemberPerformance
): ComparisonResult {
  const metrics: ComparisonMetric[] = [
    "completion_rate",
    "tasks_completed",
    "time_contributed",
    "on_time_rate",
    "streak",
    "points",
    "productivity",
  ]

  const metricComparisons = metrics.map((metric) => {
    const valueA = getMetricValue(memberA, metric)
    const valueB = getMetricValue(memberB, metric)
    const { winner, difference, percentageDiff } = compareValues(valueA, valueB)

    return {
      metric: METRIC_LABELS[metric],
      valueA,
      valueB,
      winner,
      difference,
      percentageDiff,
    }
  })

  // Calculate overall score (number of metrics won)
  const scoreA = metricComparisons.filter((c) => c.winner === "A").length
  const scoreB = metricComparisons.filter((c) => c.winner === "B").length

  let overallWinner: string | null = null
  if (scoreA > scoreB) overallWinner = memberA.memberId
  else if (scoreB > scoreA) overallWinner = memberB.memberId

  return {
    memberA,
    memberB,
    comparison: {
      winner: overallWinner,
      metricComparisons,
      overallScore: {
        memberA: scoreA,
        memberB: scoreB,
      },
    },
  }
}

// =============================================================================
// FAIR SHARE ANALYSIS
// =============================================================================

/**
 * Calculate expected share based on member profile
 */
export function calculateExpectedShare(
  memberRole: string,
  memberAge: number | null,
  totalMembers: number
): number {
  // Base equal share
  const baseShare = 100 / totalMembers

  // Adjust based on role and age
  let multiplier = 1.0

  if (memberRole === "parent") {
    multiplier = 1.2 // Parents expected to do more
  } else if (memberRole === "child") {
    if (memberAge !== null) {
      if (memberAge < 8) {
        multiplier = 0.3 // Young children do less
      } else if (memberAge < 12) {
        multiplier = 0.5
      } else if (memberAge < 16) {
        multiplier = 0.7
      } else {
        multiplier = 0.9
      }
    } else {
      multiplier = 0.6 // Default child multiplier
    }
  }

  return Math.round(baseShare * multiplier)
}

/**
 * Calculate actual share
 */
export function calculateActualShare(
  memberTasksCompleted: number,
  totalTasksCompleted: number
): number {
  if (totalTasksCompleted === 0) return 0
  return Math.round((memberTasksCompleted / totalTasksCompleted) * 100)
}

/**
 * Analyze fair share for all members
 */
export function analyzeFairShare(
  performances: MemberPerformance[],
  members: Array<{ id: string; role: string; age: number | null }>
): FairShare[] {
  const totalCompleted = performances.reduce(
    (sum, p) => sum + p.metrics.tasksCompleted,
    0
  )

  return performances.map((perf) => {
    const member = members.find((m) => m.id === perf.memberId)
    const expectedShare = calculateExpectedShare(
      member?.role ?? "other",
      member?.age ?? null,
      performances.length
    )
    const actualShare = calculateActualShare(perf.metrics.tasksCompleted, totalCompleted)
    const deviation = actualShare - expectedShare

    let status: "under" | "fair" | "over" = "fair"
    if (deviation < -10) status = "under"
    else if (deviation > 10) status = "over"

    return {
      memberId: perf.memberId,
      memberName: perf.memberName,
      expectedShare,
      actualShare,
      deviation,
      status,
    }
  })
}

// =============================================================================
// ACHIEVEMENTS
// =============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // Completion achievements
  {
    id: "first_task",
    name: "Premier pas",
    description: "Compléter votre première tâche",
    icon: "🎯",
    category: "completion",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "ten_tasks",
    name: "Débutant",
    description: "Compléter 10 tâches",
    icon: "⭐",
    category: "completion",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "fifty_tasks",
    name: "Contributeur",
    description: "Compléter 50 tâches",
    icon: "🌟",
    category: "completion",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "hundred_tasks",
    name: "Champion",
    description: "Compléter 100 tâches",
    icon: "🏆",
    category: "completion",
    unlockedBy: [],
    unlockedAt: null,
  },

  // Consistency achievements
  {
    id: "streak_3",
    name: "Régulier",
    description: "Série de 3 jours",
    icon: "🔥",
    category: "consistency",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "streak_7",
    name: "Assidu",
    description: "Série de 7 jours",
    icon: "🔥🔥",
    category: "consistency",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "streak_30",
    name: "Inarrêtable",
    description: "Série de 30 jours",
    icon: "🔥🔥🔥",
    category: "consistency",
    unlockedBy: [],
    unlockedAt: null,
  },

  // Speed achievements
  {
    id: "speed_demon",
    name: "Éclair",
    description: "Compléter une tâche en moins de 5 minutes",
    icon: "⚡",
    category: "speed",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "perfect_timing",
    name: "Ponctuel",
    description: "Compléter 10 tâches avant leur deadline",
    icon: "⏰",
    category: "speed",
    unlockedBy: [],
    unlockedAt: null,
  },

  // Collaboration achievements
  {
    id: "team_player",
    name: "Esprit d'équipe",
    description: "Aider 5 membres différents",
    icon: "🤝",
    category: "collaboration",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "family_hero",
    name: "Héros de famille",
    description: "Être numéro 1 du classement pendant une semaine",
    icon: "🦸",
    category: "collaboration",
    unlockedBy: [],
    unlockedAt: null,
  },

  // Special achievements
  {
    id: "weekend_warrior",
    name: "Guerrier du weekend",
    description: "Compléter 5 tâches un samedi ou dimanche",
    icon: "⚔️",
    category: "special",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "early_bird",
    name: "Lève-tôt",
    description: "Compléter une tâche avant 7h du matin",
    icon: "🌅",
    category: "special",
    unlockedBy: [],
    unlockedAt: null,
  },
  {
    id: "night_owl",
    name: "Oiseau de nuit",
    description: "Compléter une tâche après 22h",
    icon: "🦉",
    category: "special",
    unlockedBy: [],
    unlockedAt: null,
  },
]

/**
 * Check achievement eligibility
 */
export function checkAchievementEligibility(
  achievement: Achievement,
  performance: MemberPerformance,
  additionalContext?: {
    tasksBeforeDeadline?: number
    helpedMembers?: string[]
    weeklyLeaderRuns?: number
    weekendTasks?: number
    earlyTasks?: number
    lateTasks?: number
    fastTasks?: number
  }
): boolean {
  switch (achievement.id) {
    case "first_task":
      return performance.metrics.tasksCompleted >= 1
    case "ten_tasks":
      return performance.metrics.tasksCompleted >= 10
    case "fifty_tasks":
      return performance.metrics.tasksCompleted >= 50
    case "hundred_tasks":
      return performance.metrics.tasksCompleted >= 100
    case "streak_3":
      return performance.metrics.streak >= 3
    case "streak_7":
      return performance.metrics.streak >= 7
    case "streak_30":
      return performance.metrics.streak >= 30
    case "speed_demon":
      return (additionalContext?.fastTasks ?? 0) >= 1
    case "perfect_timing":
      return (additionalContext?.tasksBeforeDeadline ?? 0) >= 10
    case "team_player":
      return (additionalContext?.helpedMembers?.length ?? 0) >= 5
    case "family_hero":
      return (additionalContext?.weeklyLeaderRuns ?? 0) >= 1
    case "weekend_warrior":
      return (additionalContext?.weekendTasks ?? 0) >= 5
    case "early_bird":
      return (additionalContext?.earlyTasks ?? 0) >= 1
    case "night_owl":
      return (additionalContext?.lateTasks ?? 0) >= 1
    default:
      return false
  }
}

/**
 * Calculate unlocked achievements for a member
 */
export function calculateUnlockedAchievements(
  memberId: string,
  performance: MemberPerformance,
  additionalContext?: Parameters<typeof checkAchievementEligibility>[2]
): Achievement[] {
  const unlocked: Achievement[] = []
  const now = new Date()

  for (const achievement of ACHIEVEMENTS) {
    if (checkAchievementEligibility(achievement, performance, additionalContext)) {
      unlocked.push({
        ...achievement,
        unlockedBy: [memberId],
        unlockedAt: now,
      })
    }
  }

  return unlocked
}

// =============================================================================
// COMPETITION MODE
// =============================================================================

export interface Competition {
  id: string
  name: string
  description: string
  metric: ComparisonMetric
  startDate: Date
  endDate: Date
  participants: string[]
  standings: RankingEntry[]
  prize?: string
  isActive: boolean
}

/**
 * Create a competition
 */
export function createCompetition(params: {
  name: string
  description: string
  metric: ComparisonMetric
  startDate: Date
  endDate: Date
  participants: string[]
  prize?: string
}): Competition {
  return {
    id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: params.name,
    description: params.description,
    metric: params.metric,
    startDate: params.startDate,
    endDate: params.endDate,
    participants: params.participants,
    standings: [],
    prize: params.prize,
    isActive: params.startDate.getTime() <= Date.now() &&
      params.endDate.getTime() >= Date.now(),
  }
}

/**
 * Update competition standings
 */
export function updateCompetitionStandings(
  competition: Competition,
  performances: MemberPerformance[]
): Competition {
  const participantPerformances = performances.filter(
    (p) => competition.participants.includes(p.memberId)
  )

  return {
    ...competition,
    standings: createRanking(participantPerformances, competition.metric),
    isActive: competition.startDate.getTime() <= Date.now() &&
      competition.endDate.getTime() >= Date.now(),
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const comparisonEngine = {
  // Metric labels
  METRIC_LABELS,

  // Ranking
  getMetricValue,
  createRanking,
  generateLeaderboard,
  generateAllLeaderboards,

  // Head-to-head
  compareValues,
  compareTwoMembers,

  // Fair share
  calculateExpectedShare,
  calculateActualShare,
  analyzeFairShare,

  // Achievements
  ACHIEVEMENTS,
  checkAchievementEligibility,
  calculateUnlockedAchievements,

  // Competition
  createCompetition,
  updateCompetitionStandings,
}
