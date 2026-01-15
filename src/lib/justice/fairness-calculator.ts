/**
 * Fairness Calculator
 *
 * Family task distribution fairness metrics:
 * - Weekly charge percentage per parent
 * - Historical fairness trends
 * - Category-based fairness
 * - Adjustments for exclusions
 */

import { z } from "zod"

// =============================================================================
// SCHEMAS
// =============================================================================

export const MemberLoadSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  totalWeight: z.number().min(0),
  tasksCompleted: z.number().min(0),
  categoryBreakdown: z.record(z.string(), z.number()),
  percentage: z.number().min(0).max(100),
  exclusionDays: z.number().min(0).default(0),
  adjustedPercentage: z.number().min(0).max(100),
})

export const FairnessScoreSchema = z.object({
  householdId: z.string(),
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(["week", "month", "custom"]),
  }),
  overallScore: z.number().min(0).max(100), // 100 = perfectly fair
  giniCoefficient: z.number().min(0).max(1),
  status: z.enum(["excellent", "good", "fair", "poor", "critical"]),
  memberLoads: z.array(MemberLoadSchema),
  categoryFairness: z.record(z.string(), z.number()),
  imbalanceDetails: z.object({
    mostLoaded: z.string().nullable(),
    leastLoaded: z.string().nullable(),
    gap: z.number(),
    gapPercentage: z.number(),
  }),
})

export const FairnessTrendSchema = z.object({
  householdId: z.string(),
  periods: z.array(
    z.object({
      startDate: z.date(),
      endDate: z.date(),
      score: z.number(),
      gini: z.number(),
    })
  ),
  trend: z.enum(["improving", "stable", "declining"]),
  averageScore: z.number(),
  bestPeriod: z.object({
    startDate: z.date(),
    score: z.number(),
  }).nullable(),
  worstPeriod: z.object({
    startDate: z.date(),
    score: z.number(),
  }).nullable(),
})

export const CategoryFairnessSchema = z.object({
  category: z.string(),
  totalWeight: z.number(),
  memberDistribution: z.array(
    z.object({
      userId: z.string(),
      userName: z.string(),
      weight: z.number(),
      percentage: z.number(),
    })
  ),
  fairnessScore: z.number(),
  dominantMember: z.string().nullable(),
  recommendation: z.string().nullable(),
})

export const ExclusionAdjustmentSchema = z.object({
  userId: z.string(),
  totalDaysInPeriod: z.number(),
  excludedDays: z.number(),
  availableDays: z.number(),
  adjustmentFactor: z.number(), // 0-1, proportion of time available
  reason: z.string().nullable(),
})

// =============================================================================
// TYPES
// =============================================================================

export type MemberLoad = z.infer<typeof MemberLoadSchema>
export type FairnessScore = z.infer<typeof FairnessScoreSchema>
export type FairnessTrend = z.infer<typeof FairnessTrendSchema>
export type CategoryFairness = z.infer<typeof CategoryFairnessSchema>
export type ExclusionAdjustment = z.infer<typeof ExclusionAdjustmentSchema>

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface TaskCompletion {
  taskId: string
  userId: string
  category: string
  weight: number
  completedAt: Date
}

export interface MemberExclusion {
  userId: string
  startDate: Date
  endDate: Date
  reason?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const FAIRNESS_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 55,
  poor: 40,
  // Below poor = critical
} as const

export const CATEGORY_NAMES: Record<string, string> = {
  ecole: "École",
  sante: "Santé",
  administratif: "Administratif",
  quotidien: "Quotidien",
  social: "Social",
  loisirs: "Loisirs",
  transport: "Transport",
  menage: "Ménage",
  courses: "Courses",
}

// =============================================================================
// GINI COEFFICIENT CALCULATION
// =============================================================================

/**
 * Calculate Gini coefficient for distribution fairness
 * 0 = perfect equality, 1 = perfect inequality
 */
export function calculateGini(values: number[]): number {
  if (values.length === 0) return 0
  if (values.length === 1) return 0

  const sortedValues = [...values].sort((a, b) => a - b)
  const n = sortedValues.length
  const total = sortedValues.reduce((sum, v) => sum + v, 0)

  if (total === 0) return 0

  let cumulativeSum = 0
  let giniSum = 0

  for (let i = 0; i < n; i++) {
    cumulativeSum += sortedValues[i]!
    giniSum += cumulativeSum
  }

  const gini = (n + 1 - (2 * giniSum) / total) / n
  return Math.max(0, Math.min(1, gini))
}

/**
 * Convert Gini to fairness score (0-100)
 */
export function giniToFairnessScore(gini: number): number {
  // Gini 0 = 100 score, Gini 1 = 0 score
  return Math.round((1 - gini) * 100)
}

// =============================================================================
// EXCLUSION ADJUSTMENTS
// =============================================================================

/**
 * Calculate exclusion adjustment for a member
 */
export function calculateExclusionAdjustment(
  userId: string,
  exclusions: MemberExclusion[],
  periodStart: Date,
  periodEnd: Date
): ExclusionAdjustment {
  const totalDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  let excludedDays = 0
  let reason: string | null = null

  for (const exclusion of exclusions.filter((e) => e.userId === userId)) {
    const overlapStart = Math.max(exclusion.startDate.getTime(), periodStart.getTime())
    const overlapEnd = Math.min(exclusion.endDate.getTime(), periodEnd.getTime())

    if (overlapStart < overlapEnd) {
      const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24))
      excludedDays += days
      if (!reason && exclusion.reason) {
        reason = exclusion.reason
      }
    }
  }

  const availableDays = Math.max(0, totalDays - excludedDays)
  const adjustmentFactor = totalDays > 0 ? availableDays / totalDays : 0

  return {
    userId,
    totalDaysInPeriod: totalDays,
    excludedDays,
    availableDays,
    adjustmentFactor,
    reason,
  }
}

/**
 * Get all members' exclusion adjustments
 */
export function getAllExclusionAdjustments(
  memberIds: string[],
  exclusions: MemberExclusion[],
  periodStart: Date,
  periodEnd: Date
): Map<string, ExclusionAdjustment> {
  const adjustments = new Map<string, ExclusionAdjustment>()

  for (const userId of memberIds) {
    adjustments.set(
      userId,
      calculateExclusionAdjustment(userId, exclusions, periodStart, periodEnd)
    )
  }

  return adjustments
}

// =============================================================================
// MEMBER LOAD CALCULATION
// =============================================================================

/**
 * Calculate individual member loads
 */
export function calculateMemberLoads(
  completions: TaskCompletion[],
  memberInfo: Map<string, string>, // userId -> userName
  exclusions: MemberExclusion[],
  periodStart: Date,
  periodEnd: Date
): MemberLoad[] {
  const memberIds = Array.from(memberInfo.keys())

  // Calculate exclusion adjustments
  const adjustments = getAllExclusionAdjustments(
    memberIds,
    exclusions,
    periodStart,
    periodEnd
  )

  // Calculate raw loads
  const rawLoads: Map<
    string,
    { weight: number; tasks: number; categories: Record<string, number> }
  > = new Map()

  for (const userId of memberIds) {
    rawLoads.set(userId, { weight: 0, tasks: 0, categories: {} })
  }

  for (const completion of completions) {
    const load = rawLoads.get(completion.userId)
    if (load) {
      load.weight += completion.weight
      load.tasks++
      load.categories[completion.category] =
        (load.categories[completion.category] ?? 0) + completion.weight
    }
  }

  const totalWeight = Array.from(rawLoads.values()).reduce(
    (sum, l) => sum + l.weight,
    0
  )

  // Calculate percentages and adjust for exclusions
  const loads: MemberLoad[] = []

  for (const userId of memberIds) {
    const load = rawLoads.get(userId)!
    const adjustment = adjustments.get(userId)!
    const userName = memberInfo.get(userId) ?? "Inconnu"

    const percentage = totalWeight > 0 ? (load.weight / totalWeight) * 100 : 0

    // Adjusted percentage accounts for exclusion time
    // If someone was excluded 50% of the time, their expected fair share is 50% of normal
    const adjustedPercentage =
      adjustment.adjustmentFactor > 0
        ? percentage / adjustment.adjustmentFactor
        : percentage

    loads.push({
      userId,
      userName,
      totalWeight: load.weight,
      tasksCompleted: load.tasks,
      categoryBreakdown: load.categories,
      percentage: Math.round(percentage * 10) / 10,
      exclusionDays: adjustment.excludedDays,
      adjustedPercentage: Math.round(adjustedPercentage * 10) / 10,
    })
  }

  return loads.sort((a, b) => b.adjustedPercentage - a.adjustedPercentage)
}

// =============================================================================
// FAIRNESS SCORE CALCULATION
// =============================================================================

/**
 * Get fairness status from score
 */
export function getFairnessStatus(
  score: number
): "excellent" | "good" | "fair" | "poor" | "critical" {
  if (score >= FAIRNESS_THRESHOLDS.excellent) return "excellent"
  if (score >= FAIRNESS_THRESHOLDS.good) return "good"
  if (score >= FAIRNESS_THRESHOLDS.fair) return "fair"
  if (score >= FAIRNESS_THRESHOLDS.poor) return "poor"
  return "critical"
}

/**
 * Calculate overall fairness score
 */
export function calculateFairnessScore(
  householdId: string,
  completions: TaskCompletion[],
  memberInfo: Map<string, string>,
  exclusions: MemberExclusion[],
  periodStart: Date,
  periodEnd: Date,
  periodType: "week" | "month" | "custom" = "week"
): FairnessScore {
  const memberLoads = calculateMemberLoads(
    completions,
    memberInfo,
    exclusions,
    periodStart,
    periodEnd
  )

  // Calculate Gini on adjusted percentages
  const adjustedPercentages = memberLoads.map((l) => l.adjustedPercentage)
  const gini = calculateGini(adjustedPercentages)
  const overallScore = giniToFairnessScore(gini)
  const status = getFairnessStatus(overallScore)

  // Calculate category-level fairness
  const categoryFairness = calculateCategoryFairness(memberLoads)

  // Find most/least loaded
  const mostLoaded = memberLoads.length > 0 ? memberLoads[0]!.userName : null
  const leastLoaded =
    memberLoads.length > 1 ? memberLoads[memberLoads.length - 1]!.userName : null

  const highestPercentage = memberLoads.length > 0 ? memberLoads[0]!.adjustedPercentage : 0
  const lowestPercentage =
    memberLoads.length > 1
      ? memberLoads[memberLoads.length - 1]!.adjustedPercentage
      : 0

  const gap = highestPercentage - lowestPercentage
  const gapPercentage =
    highestPercentage > 0 ? (gap / highestPercentage) * 100 : 0

  return {
    householdId,
    period: {
      startDate: periodStart,
      endDate: periodEnd,
      type: periodType,
    },
    overallScore,
    giniCoefficient: Math.round(gini * 1000) / 1000,
    status,
    memberLoads,
    categoryFairness,
    imbalanceDetails: {
      mostLoaded,
      leastLoaded,
      gap: Math.round(gap * 10) / 10,
      gapPercentage: Math.round(gapPercentage),
    },
  }
}

/**
 * Calculate fairness per category
 */
function calculateCategoryFairness(
  memberLoads: MemberLoad[]
): Record<string, number> {
  const categories = new Set<string>()
  for (const load of memberLoads) {
    for (const cat of Object.keys(load.categoryBreakdown)) {
      categories.add(cat)
    }
  }

  const result: Record<string, number> = {}

  for (const category of categories) {
    const weights = memberLoads.map(
      (l) => l.categoryBreakdown[category] ?? 0
    )
    const gini = calculateGini(weights)
    result[category] = giniToFairnessScore(gini)
  }

  return result
}

// =============================================================================
// CATEGORY ANALYSIS
// =============================================================================

/**
 * Analyze fairness for a specific category
 */
export function analyzeCategoryFairness(
  category: string,
  memberLoads: MemberLoad[]
): CategoryFairness {
  const totalWeight = memberLoads.reduce(
    (sum, l) => sum + (l.categoryBreakdown[category] ?? 0),
    0
  )

  const memberDistribution = memberLoads
    .map((l) => ({
      userId: l.userId,
      userName: l.userName,
      weight: l.categoryBreakdown[category] ?? 0,
      percentage:
        totalWeight > 0
          ? Math.round(((l.categoryBreakdown[category] ?? 0) / totalWeight) * 1000) / 10
          : 0,
    }))
    .filter((m) => m.weight > 0)
    .sort((a, b) => b.percentage - a.percentage)

  const weights = memberDistribution.map((m) => m.weight)
  const gini = calculateGini(weights)
  const fairnessScore = giniToFairnessScore(gini)

  const dominantMember =
    memberDistribution.length > 0 && memberDistribution[0]!.percentage > 60
      ? memberDistribution[0]!.userName
      : null

  let recommendation: string | null = null
  if (dominantMember) {
    recommendation = `Considérer redistribuer quelques tâches "${CATEGORY_NAMES[category] ?? category}" vers d'autres membres.`
  } else if (fairnessScore < 50) {
    recommendation = `La catégorie "${CATEGORY_NAMES[category] ?? category}" pourrait être mieux répartie.`
  }

  return {
    category,
    totalWeight,
    memberDistribution,
    fairnessScore,
    dominantMember,
    recommendation,
  }
}

/**
 * Get all category fairness analyses
 */
export function getAllCategoryFairness(
  memberLoads: MemberLoad[]
): CategoryFairness[] {
  const categories = new Set<string>()
  for (const load of memberLoads) {
    for (const cat of Object.keys(load.categoryBreakdown)) {
      categories.add(cat)
    }
  }

  return Array.from(categories)
    .map((cat) => analyzeCategoryFairness(cat, memberLoads))
    .sort((a, b) => b.totalWeight - a.totalWeight)
}

// =============================================================================
// TREND ANALYSIS
// =============================================================================

/**
 * Calculate fairness trend over multiple periods
 */
export function calculateFairnessTrend(
  householdId: string,
  periodicScores: Array<{ startDate: Date; endDate: Date; score: number; gini: number }>
): FairnessTrend {
  if (periodicScores.length === 0) {
    return {
      householdId,
      periods: [],
      trend: "stable",
      averageScore: 0,
      bestPeriod: null,
      worstPeriod: null,
    }
  }

  const sorted = [...periodicScores].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )

  const averageScore =
    sorted.reduce((sum, p) => sum + p.score, 0) / sorted.length

  const bestPeriod = sorted.reduce(
    (best, p) => (p.score > (best?.score ?? 0) ? p : best),
    null as (typeof sorted)[0] | null
  )

  const worstPeriod = sorted.reduce(
    (worst, p) => (p.score < (worst?.score ?? 100) ? p : worst),
    null as (typeof sorted)[0] | null
  )

  // Calculate trend (last 4 periods vs first 4)
  let trend: "improving" | "stable" | "declining" = "stable"

  if (sorted.length >= 4) {
    const halfPoint = Math.floor(sorted.length / 2)
    const firstHalfAvg =
      sorted.slice(0, halfPoint).reduce((sum, p) => sum + p.score, 0) / halfPoint
    const secondHalfAvg =
      sorted.slice(halfPoint).reduce((sum, p) => sum + p.score, 0) /
      (sorted.length - halfPoint)

    const diff = secondHalfAvg - firstHalfAvg
    if (diff > 5) trend = "improving"
    else if (diff < -5) trend = "declining"
  }

  return {
    householdId,
    periods: sorted.map((p) => ({
      startDate: p.startDate,
      endDate: p.endDate,
      score: p.score,
      gini: p.gini,
    })),
    trend,
    averageScore: Math.round(averageScore),
    bestPeriod: bestPeriod
      ? { startDate: bestPeriod.startDate, score: bestPeriod.score }
      : null,
    worstPeriod: worstPeriod
      ? { startDate: worstPeriod.startDate, score: worstPeriod.score }
      : null,
  }
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Get fairness status label
 */
export function getFairnessStatusLabel(
  status: FairnessScore["status"]
): string {
  const labels: Record<FairnessScore["status"], string> = {
    excellent: "Excellent",
    good: "Bon",
    fair: "Acceptable",
    poor: "À améliorer",
    critical: "Critique",
  }
  return labels[status]
}

/**
 * Get fairness status color
 */
export function getFairnessStatusColor(
  status: FairnessScore["status"]
): "green" | "lime" | "yellow" | "orange" | "red" {
  const colors: Record<
    FairnessScore["status"],
    "green" | "lime" | "yellow" | "orange" | "red"
  > = {
    excellent: "green",
    good: "lime",
    fair: "yellow",
    poor: "orange",
    critical: "red",
  }
  return colors[status]
}

/**
 * Get trend icon
 */
export function getTrendIcon(trend: FairnessTrend["trend"]): string {
  const icons: Record<FairnessTrend["trend"], string> = {
    improving: "📈",
    stable: "➡️",
    declining: "📉",
  }
  return icons[trend]
}

/**
 * Get trend label
 */
export function getTrendLabel(trend: FairnessTrend["trend"]): string {
  const labels: Record<FairnessTrend["trend"], string> = {
    improving: "En amélioration",
    stable: "Stable",
    declining: "En déclin",
  }
  return labels[trend]
}

/**
 * Format fairness score for display
 */
export function formatFairnessScore(score: FairnessScore): {
  score: number
  status: string
  statusColor: string
  emoji: string
  summary: string
} {
  const status = getFairnessStatusLabel(score.status)
  const color = getFairnessStatusColor(score.status)

  const emojis: Record<FairnessScore["status"], string> = {
    excellent: "🌟",
    good: "✅",
    fair: "⚖️",
    poor: "⚠️",
    critical: "🚨",
  }

  let summary: string
  if (score.status === "excellent") {
    summary = "Excellente répartition ! La charge est bien partagée."
  } else if (score.status === "good") {
    summary = "Bonne répartition. Quelques ajustements possibles."
  } else if (score.status === "fair") {
    summary = "Répartition acceptable. Pensez à rééquilibrer."
  } else if (score.status === "poor") {
    summary = "Déséquilibre notable. Un rééquilibrage serait bénéfique."
  } else {
    summary = "Déséquilibre important. Un dialogue sur la répartition s'impose."
  }

  return {
    score: score.overallScore,
    status,
    statusColor: color,
    emoji: emojis[score.status],
    summary,
  }
}

/**
 * Format member load for display
 */
export function formatMemberLoad(load: MemberLoad): {
  name: string
  percentage: string
  tasks: string
  categories: Array<{ name: string; percentage: number }>
  hasExclusions: boolean
  exclusionNote: string | null
} {
  const topCategories = Object.entries(load.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, weight]) => ({
      name: CATEGORY_NAMES[cat] ?? cat,
      percentage: Math.round((weight / load.totalWeight) * 100),
    }))

  return {
    name: load.userName,
    percentage: `${load.adjustedPercentage}%`,
    tasks: `${load.tasksCompleted} tâches`,
    categories: topCategories,
    hasExclusions: load.exclusionDays > 0,
    exclusionNote:
      load.exclusionDays > 0
        ? `Absent ${load.exclusionDays} jour(s) durant la période`
        : null,
  }
}
