/**
 * Enhanced Load Calculator V2
 *
 * Advanced load calculation with:
 * - Category weight multipliers
 * - Time-weighted scoring (recency)
 * - Historical load tracking
 * - Fatigue factor integration
 * - Contextual adjustments
 */

import { z } from "zod"

// =============================================================================
// SCHEMAS
// =============================================================================

export const CategoryWeightSchema = z.object({
  category: z.string(),
  baseWeight: z.number().min(1).max(10),
  energyCost: z.number().min(0).max(1), // 0 = light, 1 = exhausting
  mentalLoad: z.number().min(0).max(1), // 0 = simple, 1 = complex
  timeRequired: z.number().min(0).max(1), // 0 = quick, 1 = time-consuming
})

export const TaskWeightInputSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  category: z.string(),
  priority: z.number().min(1).max(3).default(2),
  estimatedMinutes: z.number().min(0).optional(),
  dueDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
  isCritical: z.boolean().default(false),
  childId: z.string().optional(),
  requiresCoordination: z.boolean().default(false),
  hasDeadlinePressure: z.boolean().default(false),
})

export const HistoricalLoadEntrySchema = z.object({
  date: z.date(),
  userId: z.string(),
  taskId: z.string(),
  category: z.string(),
  weight: z.number(),
  wasCompleted: z.boolean(),
  minutesSpent: z.number().optional(),
})

export const FatigueStateSchema = z.object({
  userId: z.string(),
  currentFatigue: z.number().min(0).max(100), // 0 = rested, 100 = exhausted
  consecutiveHighLoadDays: z.number(),
  lastRestDay: z.date().optional(),
  recentAverageLoad: z.number(),
  weeklyLoadTrend: z.enum(["decreasing", "stable", "increasing"]),
})

export const LoadCalculationResultSchema = z.object({
  taskId: z.string(),
  baseWeight: z.number(),
  adjustedWeight: z.number(),
  components: z.object({
    categoryWeight: z.number(),
    priorityMultiplier: z.number(),
    deadlineMultiplier: z.number(),
    complexityMultiplier: z.number(),
    fatigueMultiplier: z.number(),
  }),
  explanation: z.array(z.string()),
})

export const UserLoadSummarySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  currentLoad: z.number(),
  weeklyLoad: z.number(),
  monthlyLoad: z.number(),
  loadTrend: z.enum(["decreasing", "stable", "increasing"]),
  fatigueLevel: z.number(),
  balancePercentage: z.number(),
  pendingTasks: z.number(),
  completedTasks: z.number(),
  categoryBreakdown: z.record(z.string(), z.number()),
})

// =============================================================================
// TYPES
// =============================================================================

export type CategoryWeight = z.infer<typeof CategoryWeightSchema>
export type TaskWeightInput = z.infer<typeof TaskWeightInputSchema>
export type HistoricalLoadEntry = z.infer<typeof HistoricalLoadEntrySchema>
export type FatigueState = z.infer<typeof FatigueStateSchema>
export type LoadCalculationResult = z.infer<typeof LoadCalculationResultSchema>
export type UserLoadSummary = z.infer<typeof UserLoadSummarySchema>

export interface TimeWeightedScore {
  score: number
  decayFactor: number
  ageInDays: number
}

export interface LoadDistributionV2 {
  householdId: string
  calculatedAt: Date
  totalWeight: number
  users: UserLoadSummary[]
  balanceScore: number // 0-100
  giniCoefficient: number // 0-1 (0 = perfect equality)
  alerts: LoadAlert[]
  recommendations: LoadRecommendation[]
}

export interface LoadAlert {
  type: "imbalance" | "overload" | "underload" | "fatigue" | "trend" | "inactivity"
  severity: "low" | "medium" | "high" | "critical"
  userId?: string
  userName?: string
  message: string
  metric: number
}

export interface LoadRecommendation {
  type: "reassign" | "delay" | "share" | "rest" | "balance"
  priority: number
  description: string
  affectedTasks?: string[]
  fromUser?: string
  toUser?: string
  expectedImprovement: number
}

// =============================================================================
// CATEGORY WEIGHT DEFINITIONS
// =============================================================================

/**
 * Default category weights with multi-dimensional scoring
 */
export const CATEGORY_WEIGHTS_V2: Record<string, CategoryWeight> = {
  ecole: {
    category: "ecole",
    baseWeight: 3,
    energyCost: 0.4,
    mentalLoad: 0.6,
    timeRequired: 0.5,
  },
  sante: {
    category: "sante",
    baseWeight: 4,
    energyCost: 0.5,
    mentalLoad: 0.7,
    timeRequired: 0.6,
  },
  administratif: {
    category: "administratif",
    baseWeight: 4,
    energyCost: 0.3,
    mentalLoad: 0.8,
    timeRequired: 0.4,
  },
  quotidien: {
    category: "quotidien",
    baseWeight: 2,
    energyCost: 0.6,
    mentalLoad: 0.2,
    timeRequired: 0.3,
  },
  social: {
    category: "social",
    baseWeight: 2,
    energyCost: 0.4,
    mentalLoad: 0.3,
    timeRequired: 0.4,
  },
  activites: {
    category: "activites",
    baseWeight: 3,
    energyCost: 0.5,
    mentalLoad: 0.4,
    timeRequired: 0.6,
  },
  logistique: {
    category: "logistique",
    baseWeight: 2,
    energyCost: 0.7,
    mentalLoad: 0.2,
    timeRequired: 0.3,
  },
  autre: {
    category: "autre",
    baseWeight: 2,
    energyCost: 0.4,
    mentalLoad: 0.4,
    timeRequired: 0.4,
  },
}

// =============================================================================
// MULTIPLIER CONSTANTS
// =============================================================================

export const MULTIPLIERS = {
  // Priority multipliers
  priority: {
    high: 1.5, // Priority 1
    normal: 1.0, // Priority 2
    low: 0.8, // Priority 3
  },
  // Deadline pressure
  deadline: {
    overdue: 1.8,
    today: 1.5,
    tomorrow: 1.3,
    thisWeek: 1.1,
    noDeadline: 1.0,
  },
  // Recurring task discount
  recurring: {
    daily: 0.6, // Routine, less mental overhead
    weekly: 0.8,
    monthly: 0.9,
    once: 1.0,
  },
  // Critical task multiplier
  critical: 1.4,
  // Coordination overhead
  coordination: 1.2,
  // Fatigue impact
  fatigue: {
    rested: 1.0, // 0-20
    normal: 1.1, // 21-40
    tired: 1.2, // 41-60
    exhausted: 1.4, // 61-80
    burnout: 1.6, // 81-100
  },
} as const

// Time decay constants
export const TIME_DECAY = {
  halfLifeDays: 14, // Load importance halves every 2 weeks
  maxAgeDays: 90, // Loads older than 90 days count minimally
  recentWindowDays: 7, // Recent window for trend analysis
} as const

// =============================================================================
// CORE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Get category weight with fallback
 */
export function getCategoryWeight(category: string): CategoryWeight {
  return CATEGORY_WEIGHTS_V2[category] ?? CATEGORY_WEIGHTS_V2["autre"]!
}

/**
 * Calculate time decay factor
 * Recent loads count more than older ones
 */
export function calculateTimeDecay(ageInDays: number): number {
  if (ageInDays <= 0) return 1.0
  if (ageInDays >= TIME_DECAY.maxAgeDays) return 0.1

  // Exponential decay with half-life
  return Math.pow(0.5, ageInDays / TIME_DECAY.halfLifeDays)
}

/**
 * Calculate deadline pressure multiplier
 */
export function calculateDeadlineMultiplier(dueDate: Date | undefined): number {
  if (!dueDate) return MULTIPLIERS.deadline.noDeadline

  const now = new Date()
  const daysUntilDue = Math.floor(
    (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  )

  if (daysUntilDue < 0) return MULTIPLIERS.deadline.overdue
  if (daysUntilDue === 0) return MULTIPLIERS.deadline.today
  if (daysUntilDue === 1) return MULTIPLIERS.deadline.tomorrow
  if (daysUntilDue <= 7) return MULTIPLIERS.deadline.thisWeek
  return MULTIPLIERS.deadline.noDeadline
}

/**
 * Calculate fatigue multiplier based on user's fatigue state
 */
export function calculateFatigueMultiplier(fatigueLevel: number): number {
  if (fatigueLevel <= 20) return MULTIPLIERS.fatigue.rested
  if (fatigueLevel <= 40) return MULTIPLIERS.fatigue.normal
  if (fatigueLevel <= 60) return MULTIPLIERS.fatigue.tired
  if (fatigueLevel <= 80) return MULTIPLIERS.fatigue.exhausted
  return MULTIPLIERS.fatigue.burnout
}

/**
 * Calculate priority multiplier
 */
export function calculatePriorityMultiplier(priority: number): number {
  switch (priority) {
    case 1:
      return MULTIPLIERS.priority.high
    case 3:
      return MULTIPLIERS.priority.low
    default:
      return MULTIPLIERS.priority.normal
  }
}

/**
 * Calculate recurring task discount
 */
export function calculateRecurringMultiplier(
  isRecurring: boolean,
  pattern?: string
): number {
  if (!isRecurring) return MULTIPLIERS.recurring.once

  switch (pattern?.toLowerCase()) {
    case "daily":
    case "jour":
    case "quotidien":
      return MULTIPLIERS.recurring.daily
    case "weekly":
    case "semaine":
    case "hebdomadaire":
      return MULTIPLIERS.recurring.weekly
    case "monthly":
    case "mois":
    case "mensuel":
      return MULTIPLIERS.recurring.monthly
    default:
      return MULTIPLIERS.recurring.weekly
  }
}

/**
 * Calculate comprehensive task weight with all factors
 */
export function calculateTaskWeight(
  input: TaskWeightInput,
  fatigueLevel: number = 0
): LoadCalculationResult {
  const validatedInput = TaskWeightInputSchema.parse(input)
  const categoryWeight = getCategoryWeight(validatedInput.category)
  const explanation: string[] = []

  // Base weight from category
  let baseWeight = categoryWeight.baseWeight
  explanation.push(`Base: ${baseWeight} (catégorie ${validatedInput.category})`)

  // Calculate individual multipliers
  const priorityMultiplier = calculatePriorityMultiplier(validatedInput.priority)
  const deadlineMultiplier = calculateDeadlineMultiplier(validatedInput.dueDate)
  const recurringMultiplier = calculateRecurringMultiplier(
    validatedInput.isRecurring,
    validatedInput.recurrencePattern
  )
  const fatigueMultiplier = calculateFatigueMultiplier(fatigueLevel)

  // Complexity multiplier from category dimensions
  const complexityMultiplier =
    1 +
    (categoryWeight.energyCost * 0.2 +
      categoryWeight.mentalLoad * 0.3 +
      categoryWeight.timeRequired * 0.2)

  // Apply all multipliers
  let adjustedWeight = baseWeight

  // Priority
  adjustedWeight *= priorityMultiplier
  if (priorityMultiplier !== 1.0) {
    explanation.push(
      `Priorité ${validatedInput.priority}: x${priorityMultiplier}`
    )
  }

  // Deadline
  adjustedWeight *= deadlineMultiplier
  if (deadlineMultiplier !== 1.0) {
    explanation.push(`Échéance: x${deadlineMultiplier}`)
  }

  // Recurring discount
  adjustedWeight *= recurringMultiplier
  if (recurringMultiplier !== 1.0) {
    explanation.push(`Récurrence: x${recurringMultiplier}`)
  }

  // Critical task
  if (validatedInput.isCritical) {
    adjustedWeight *= MULTIPLIERS.critical
    explanation.push(`Critique: x${MULTIPLIERS.critical}`)
  }

  // Coordination overhead
  if (validatedInput.requiresCoordination) {
    adjustedWeight *= MULTIPLIERS.coordination
    explanation.push(`Coordination: x${MULTIPLIERS.coordination}`)
  }

  // Complexity
  adjustedWeight *= complexityMultiplier
  explanation.push(`Complexité: x${complexityMultiplier.toFixed(2)}`)

  // Fatigue impact (for assignment decisions)
  if (fatigueLevel > 20) {
    adjustedWeight *= fatigueMultiplier
    explanation.push(`Fatigue (${fatigueLevel}%): x${fatigueMultiplier}`)
  }

  return {
    taskId: validatedInput.taskId,
    baseWeight: Math.round(baseWeight * 10) / 10,
    adjustedWeight: Math.round(adjustedWeight * 10) / 10,
    components: {
      categoryWeight: categoryWeight.baseWeight,
      priorityMultiplier,
      deadlineMultiplier,
      complexityMultiplier: Math.round(complexityMultiplier * 100) / 100,
      fatigueMultiplier,
    },
    explanation,
  }
}

// =============================================================================
// HISTORICAL LOAD TRACKING
// =============================================================================

/**
 * Calculate time-weighted historical load
 */
export function calculateTimeWeightedLoad(
  entries: HistoricalLoadEntry[],
  userId: string,
  referenceDate: Date = new Date()
): TimeWeightedScore {
  const userEntries = entries.filter((e) => e.userId === userId)

  if (userEntries.length === 0) {
    return { score: 0, decayFactor: 1, ageInDays: 0 }
  }

  let weightedSum = 0
  let totalDecay = 0

  for (const entry of userEntries) {
    const ageInDays = Math.floor(
      (referenceDate.getTime() - entry.date.getTime()) / (24 * 60 * 60 * 1000)
    )
    const decay = calculateTimeDecay(ageInDays)
    weightedSum += entry.weight * decay
    totalDecay += decay
  }

  const avgAgeInDays =
    userEntries.reduce((sum, e) => {
      return (
        sum +
        Math.floor(
          (referenceDate.getTime() - e.date.getTime()) / (24 * 60 * 60 * 1000)
        )
      )
    }, 0) / userEntries.length

  return {
    score: Math.round(weightedSum * 10) / 10,
    decayFactor: totalDecay / userEntries.length,
    ageInDays: Math.round(avgAgeInDays),
  }
}

/**
 * Calculate load by category with time weighting
 */
export function calculateCategoryLoad(
  entries: HistoricalLoadEntry[],
  userId: string,
  referenceDate: Date = new Date()
): Record<string, number> {
  const userEntries = entries.filter((e) => e.userId === userId)
  const categoryLoads: Record<string, number> = {}

  for (const entry of userEntries) {
    const ageInDays = Math.floor(
      (referenceDate.getTime() - entry.date.getTime()) / (24 * 60 * 60 * 1000)
    )
    const decay = calculateTimeDecay(ageInDays)
    const weightedLoad = entry.weight * decay

    categoryLoads[entry.category] =
      (categoryLoads[entry.category] ?? 0) + weightedLoad
  }

  // Round values
  for (const category of Object.keys(categoryLoads)) {
    categoryLoads[category] = Math.round(categoryLoads[category]! * 10) / 10
  }

  return categoryLoads
}

/**
 * Calculate load trend (increasing, stable, decreasing)
 */
export function calculateLoadTrend(
  entries: HistoricalLoadEntry[],
  userId: string,
  windowDays: number = TIME_DECAY.recentWindowDays
): "decreasing" | "stable" | "increasing" {
  const now = new Date()
  const userEntries = entries.filter((e) => e.userId === userId)

  // Split into recent and previous periods
  const recentCutoff = new Date(
    now.getTime() - windowDays * 24 * 60 * 60 * 1000
  )
  const previousCutoff = new Date(
    now.getTime() - windowDays * 2 * 24 * 60 * 60 * 1000
  )

  const recentEntries = userEntries.filter((e) => e.date >= recentCutoff)
  const previousEntries = userEntries.filter(
    (e) => e.date >= previousCutoff && e.date < recentCutoff
  )

  const recentLoad = recentEntries.reduce((sum, e) => sum + e.weight, 0)
  const previousLoad = previousEntries.reduce((sum, e) => sum + e.weight, 0)

  // Normalize by days
  const recentDaily = recentLoad / windowDays
  const previousDaily = previousLoad / windowDays

  const threshold = 0.15 // 15% change threshold

  if (previousDaily === 0) {
    return recentDaily > 0 ? "increasing" : "stable"
  }

  const change = (recentDaily - previousDaily) / previousDaily

  if (change > threshold) return "increasing"
  if (change < -threshold) return "decreasing"
  return "stable"
}

// =============================================================================
// FATIGUE CALCULATION
// =============================================================================

/**
 * Calculate fatigue level based on workload history
 */
export function calculateFatigueLevel(
  entries: HistoricalLoadEntry[],
  userId: string,
  lastRestDay?: Date
): number {
  const now = new Date()
  const userEntries = entries.filter((e) => e.userId === userId)

  // Base fatigue from recent load
  const recentWindow = 7 // days
  const recentCutoff = new Date(
    now.getTime() - recentWindow * 24 * 60 * 60 * 1000
  )
  const recentEntries = userEntries.filter((e) => e.date >= recentCutoff)

  const recentLoad = recentEntries.reduce((sum, e) => sum + e.weight, 0)
  const avgDailyLoad = recentLoad / recentWindow

  // Expected healthy daily load is around 10-15 weight units
  const healthyDailyLoad = 12
  let fatigue = Math.min(100, (avgDailyLoad / healthyDailyLoad) * 50)

  // Add fatigue from consecutive high-load days
  const sortedRecent = [...recentEntries].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )
  let consecutiveHighDays = 0
  let prevDate: Date | null = null

  for (const entry of sortedRecent) {
    const entryDate = new Date(entry.date.toDateString())

    if (prevDate && entryDate.getTime() !== prevDate.getTime()) {
      // New day
      if (entry.weight >= healthyDailyLoad * 1.2) {
        consecutiveHighDays++
      } else {
        break
      }
    } else if (!prevDate && entry.weight >= healthyDailyLoad * 1.2) {
      consecutiveHighDays++
    }

    prevDate = entryDate
  }

  fatigue += consecutiveHighDays * 5

  // Add fatigue from lack of rest
  if (lastRestDay) {
    const daysSinceRest = Math.floor(
      (now.getTime() - lastRestDay.getTime()) / (24 * 60 * 60 * 1000)
    )
    if (daysSinceRest > 7) {
      fatigue += Math.min(20, (daysSinceRest - 7) * 2)
    }
  } else {
    // No rest day recorded - assume moderate fatigue
    fatigue += 10
  }

  return Math.min(100, Math.max(0, Math.round(fatigue)))
}

/**
 * Build complete fatigue state for a user
 */
export function buildFatigueState(
  userId: string,
  entries: HistoricalLoadEntry[],
  lastRestDay?: Date
): FatigueState {
  const fatigue = calculateFatigueLevel(entries, userId, lastRestDay)
  const trend = calculateLoadTrend(entries, userId)

  // Calculate consecutive high load days
  const now = new Date()
  const userEntries = entries
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  let consecutiveHighLoadDays = 0
  const healthyDailyLoad = 12
  const dailyLoads = new Map<string, number>()

  for (const entry of userEntries) {
    const dateKey = entry.date.toDateString()
    dailyLoads.set(dateKey, (dailyLoads.get(dateKey) ?? 0) + entry.weight)
  }

  // Check last 14 days
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateKey = checkDate.toDateString()
    const dayLoad = dailyLoads.get(dateKey) ?? 0

    if (dayLoad >= healthyDailyLoad) {
      consecutiveHighLoadDays++
    } else {
      break
    }
  }

  // Calculate recent average
  const recentEntries = userEntries.filter(
    (e) => e.date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  )
  const recentAverage =
    recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.weight, 0) / 7
      : 0

  return {
    userId,
    currentFatigue: fatigue,
    consecutiveHighLoadDays,
    lastRestDay,
    recentAverageLoad: Math.round(recentAverage * 10) / 10,
    weeklyLoadTrend: trend,
  }
}

// =============================================================================
// DISTRIBUTION CALCULATION
// =============================================================================

/**
 * Calculate Gini coefficient for load distribution fairness
 * 0 = perfect equality, 1 = perfect inequality
 */
export function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0
  if (values.every((v) => v === 0)) return 0

  const n = values.length
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / n

  if (mean === 0) return 0

  let sumOfDifferences = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDifferences += Math.abs(sorted[i]! - sorted[j]!)
    }
  }

  return Math.round((sumOfDifferences / (2 * n * n * mean)) * 100) / 100
}

/**
 * Calculate balance score (0-100, 100 = perfectly balanced)
 */
export function calculateBalanceScoreV2(userLoads: number[]): number {
  if (userLoads.length <= 1) return 100
  if (userLoads.every((l) => l === 0)) return 100

  const total = userLoads.reduce((a, b) => a + b, 0)
  if (total === 0) return 100

  const idealPercentage = 100 / userLoads.length
  const percentages = userLoads.map((l) => (l / total) * 100)
  const deviations = percentages.map((p) => Math.abs(p - idealPercentage))
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length

  // Convert deviation to score (0 deviation = 100, 50 deviation = 0)
  return Math.max(0, Math.round(100 - avgDeviation * 2))
}

/**
 * Build user load summary
 */
export function buildUserLoadSummary(
  userId: string,
  userName: string,
  pendingTasks: TaskWeightInput[],
  historicalEntries: HistoricalLoadEntry[],
  totalHouseholdLoad: number,
  lastRestDay?: Date
): UserLoadSummary {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Current pending load
  const currentLoad = pendingTasks.reduce((sum, task) => {
    const result = calculateTaskWeight(task)
    return sum + result.adjustedWeight
  }, 0)

  // Historical loads
  const userHistory = historicalEntries.filter((e) => e.userId === userId)
  const weeklyHistory = userHistory.filter((e) => e.date >= weekAgo)
  const monthlyHistory = userHistory.filter((e) => e.date >= monthAgo)

  const weeklyLoad = weeklyHistory.reduce((sum, e) => sum + e.weight, 0)
  const monthlyLoad = monthlyHistory.reduce((sum, e) => sum + e.weight, 0)

  // Category breakdown
  const categoryBreakdown = calculateCategoryLoad(historicalEntries, userId)

  // Fatigue
  const fatigue = calculateFatigueLevel(historicalEntries, userId, lastRestDay)
  const trend = calculateLoadTrend(historicalEntries, userId)

  // Balance percentage
  const balancePercentage =
    totalHouseholdLoad > 0
      ? Math.round(((currentLoad + weeklyLoad) / totalHouseholdLoad) * 100)
      : 0

  // Task counts
  const completedTasks = userHistory.filter((e) => e.wasCompleted).length
  const pendingCount = pendingTasks.length

  return {
    userId,
    userName,
    currentLoad: Math.round(currentLoad * 10) / 10,
    weeklyLoad: Math.round(weeklyLoad * 10) / 10,
    monthlyLoad: Math.round(monthlyLoad * 10) / 10,
    loadTrend: trend,
    fatigueLevel: fatigue,
    balancePercentage,
    pendingTasks: pendingCount,
    completedTasks,
    categoryBreakdown,
  }
}

// =============================================================================
// ALERT GENERATION
// =============================================================================

/**
 * Generate load alerts based on distribution analysis
 */
export function generateLoadAlerts(
  users: UserLoadSummary[],
  balanceScore: number
): LoadAlert[] {
  const alerts: LoadAlert[] = []

  // Check overall balance
  if (balanceScore < 40) {
    alerts.push({
      type: "imbalance",
      severity: "critical",
      message: `Déséquilibre critique: score de ${balanceScore}/100`,
      metric: balanceScore,
    })
  } else if (balanceScore < 60) {
    alerts.push({
      type: "imbalance",
      severity: "high",
      message: `Déséquilibre important: score de ${balanceScore}/100`,
      metric: balanceScore,
    })
  } else if (balanceScore < 80) {
    alerts.push({
      type: "imbalance",
      severity: "medium",
      message: `Léger déséquilibre: score de ${balanceScore}/100`,
      metric: balanceScore,
    })
  }

  // Check individual user loads
  for (const user of users) {
    // Fatigue alerts
    if (user.fatigueLevel >= 80) {
      alerts.push({
        type: "fatigue",
        severity: "critical",
        userId: user.userId,
        userName: user.userName,
        message: `${user.userName} présente un risque de surcharge (fatigue: ${user.fatigueLevel}%)`,
        metric: user.fatigueLevel,
      })
    } else if (user.fatigueLevel >= 60) {
      alerts.push({
        type: "fatigue",
        severity: "high",
        userId: user.userId,
        userName: user.userName,
        message: `${user.userName} montre des signes de fatigue (${user.fatigueLevel}%)`,
        metric: user.fatigueLevel,
      })
    }

    // Overload check (>60% of household load)
    if (user.balancePercentage > 60) {
      alerts.push({
        type: "overload",
        severity: user.balancePercentage > 70 ? "high" : "medium",
        userId: user.userId,
        userName: user.userName,
        message: `${user.userName} assume ${user.balancePercentage}% de la charge totale`,
        metric: user.balancePercentage,
      })
    }

    // Underload check (<30% when there are multiple users)
    if (users.length > 1 && user.balancePercentage < 30) {
      alerts.push({
        type: "underload",
        severity: "low",
        userId: user.userId,
        userName: user.userName,
        message: `${user.userName} a une charge réduite (${user.balancePercentage}%)`,
        metric: user.balancePercentage,
      })
    }

    // Trend alerts
    if (user.loadTrend === "increasing" && user.fatigueLevel > 40) {
      alerts.push({
        type: "trend",
        severity: "medium",
        userId: user.userId,
        userName: user.userName,
        message: `Charge croissante pour ${user.userName}`,
        metric: user.fatigueLevel,
      })
    }
  }

  // Sort by severity
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
  return alerts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
}

/**
 * Generate recommendations for improving load balance
 */
export function generateRecommendations(
  users: UserLoadSummary[],
  alerts: LoadAlert[]
): LoadRecommendation[] {
  const recommendations: LoadRecommendation[] = []

  if (users.length < 2) return recommendations

  // Find most and least loaded users
  const sortedByLoad = [...users].sort(
    (a, b) => b.balancePercentage - a.balancePercentage
  )
  const mostLoaded = sortedByLoad[0]
  const leastLoaded = sortedByLoad[sortedByLoad.length - 1]

  if (!mostLoaded || !leastLoaded) return recommendations

  // Imbalance recommendations
  const imbalance = mostLoaded.balancePercentage - leastLoaded.balancePercentage

  if (imbalance > 20) {
    recommendations.push({
      type: "reassign",
      priority: 8,
      description: `Réassigner quelques tâches de ${mostLoaded.userName} vers ${leastLoaded.userName}`,
      fromUser: mostLoaded.userId,
      toUser: leastLoaded.userId,
      expectedImprovement: Math.round(imbalance / 3),
    })
  }

  // Fatigue-based recommendations
  const fatigued = users.filter((u) => u.fatigueLevel >= 60)
  for (const user of fatigued) {
    recommendations.push({
      type: "rest",
      priority: user.fatigueLevel >= 80 ? 10 : 7,
      description: `Prévoir une période de repos pour ${user.userName}`,
      fromUser: user.userId,
      expectedImprovement: 20,
    })
  }

  // Balance recommendations
  if (alerts.some((a) => a.type === "imbalance" && a.severity !== "low")) {
    recommendations.push({
      type: "balance",
      priority: 6,
      description:
        "Revoir la répartition des tâches récurrentes pour plus d'équité",
      expectedImprovement: 15,
    })
  }

  // Sort by priority
  return recommendations.sort((a, b) => b.priority - a.priority)
}

// =============================================================================
// MAIN DISTRIBUTION CALCULATION
// =============================================================================

/**
 * Calculate complete load distribution for a household
 */
export function calculateLoadDistributionV2(
  householdId: string,
  users: Array<{ id: string; name: string; lastRestDay?: Date }>,
  pendingTasksByUser: Map<string, TaskWeightInput[]>,
  historicalEntries: HistoricalLoadEntry[]
): LoadDistributionV2 {
  // Calculate total household load
  let totalWeight = 0
  const userLoads: number[] = []
  const userSummaries: UserLoadSummary[] = []

  for (const user of users) {
    const userPendingTasks = pendingTasksByUser.get(user.id) ?? []
    const userPendingWeight = userPendingTasks.reduce((sum, task) => {
      return sum + calculateTaskWeight(task).adjustedWeight
    }, 0)

    const userHistoryWeight = historicalEntries
      .filter((e) => e.userId === user.id)
      .reduce((sum, e) => sum + e.weight * calculateTimeDecay(
        Math.floor((Date.now() - e.date.getTime()) / (24 * 60 * 60 * 1000))
      ), 0)

    const userTotal = userPendingWeight + userHistoryWeight
    totalWeight += userTotal
    userLoads.push(userTotal)
  }

  // Build summaries
  for (const user of users) {
    const summary = buildUserLoadSummary(
      user.id,
      user.name,
      pendingTasksByUser.get(user.id) ?? [],
      historicalEntries,
      totalWeight,
      user.lastRestDay
    )
    userSummaries.push(summary)
  }

  // Calculate metrics
  const balanceScore = calculateBalanceScoreV2(userLoads)
  const gini = calculateGiniCoefficient(userLoads)

  // Generate alerts and recommendations
  const alerts = generateLoadAlerts(userSummaries, balanceScore)
  const recommendations = generateRecommendations(userSummaries, alerts)

  return {
    householdId,
    calculatedAt: new Date(),
    totalWeight: Math.round(totalWeight * 10) / 10,
    users: userSummaries,
    balanceScore,
    giniCoefficient: gini,
    alerts,
    recommendations,
  }
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Format weight for display
 */
export function formatWeight(weight: number): string {
  return weight.toFixed(1)
}

/**
 * Get fatigue level label
 */
export function getFatigueLevelLabel(level: number): string {
  if (level <= 20) return "Reposé"
  if (level <= 40) return "Normal"
  if (level <= 60) return "Fatigué"
  if (level <= 80) return "Épuisé"
  return "Risque de burnout"
}

/**
 * Get balance status label
 */
export function getBalanceStatusLabel(score: number): string {
  if (score >= 80) return "Équilibré"
  if (score >= 60) return "Acceptable"
  if (score >= 40) return "Déséquilibré"
  return "Critique"
}

/**
 * Get trend icon
 */
export function getTrendIcon(trend: "decreasing" | "stable" | "increasing"): string {
  switch (trend) {
    case "decreasing":
      return "↓"
    case "stable":
      return "→"
    case "increasing":
      return "↑"
  }
}
