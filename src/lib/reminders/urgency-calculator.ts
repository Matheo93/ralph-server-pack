/**
 * Urgency Calculator - Smart urgency scoring for tasks
 * Functional, immutable approach to urgency calculations
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const UrgencyLevel = z.enum(["none", "low", "medium", "high", "critical"])
export type UrgencyLevel = z.infer<typeof UrgencyLevel>

export const TaskInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  deadline: z.date().nullable(),
  estimatedMinutes: z.number().nullable(),
  assigneeId: z.string().nullable(),
  createdAt: z.date(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  dependencyCount: z.number().default(0),
  blockedTasks: z.number().default(0),
  lastActivityAt: z.date().nullable(),
  completionRate: z.number().nullable(), // 0-1 for recurring tasks
})
export type TaskInput = z.infer<typeof TaskInputSchema>

export const UrgencyFactorsSchema = z.object({
  deadlineFactor: z.number().min(0).max(100),
  priorityFactor: z.number().min(0).max(100),
  ageFactor: z.number().min(0).max(100),
  dependencyFactor: z.number().min(0).max(100),
  staleFactor: z.number().min(0).max(100),
  completionFactor: z.number().min(0).max(100),
})
export type UrgencyFactors = z.infer<typeof UrgencyFactorsSchema>

export const UrgencyConfigSchema = z.object({
  weights: z.object({
    deadline: z.number().default(35),
    priority: z.number().default(25),
    age: z.number().default(10),
    dependency: z.number().default(15),
    stale: z.number().default(10),
    completion: z.number().default(5),
  }),
  thresholds: z.object({
    critical: z.number().default(85),
    high: z.number().default(65),
    medium: z.number().default(40),
    low: z.number().default(20),
  }),
  deadlineWindows: z.object({
    criticalHours: z.number().default(2),
    highHours: z.number().default(24),
    mediumHours: z.number().default(72),
    lowHours: z.number().default(168), // 1 week
  }),
  staleThresholdHours: z.number().default(48),
})
export type UrgencyConfig = z.infer<typeof UrgencyConfigSchema>

export const UrgencyScoreSchema = z.object({
  taskId: z.string(),
  totalScore: z.number().min(0).max(100),
  level: UrgencyLevel,
  factors: UrgencyFactorsSchema,
  breakdown: z.object({
    deadline: z.string(),
    priority: z.string(),
    age: z.string(),
    dependency: z.string(),
    stale: z.string(),
    completion: z.string(),
  }),
  recommendations: z.array(z.string()),
  calculatedAt: z.date(),
})
export type UrgencyScore = z.infer<typeof UrgencyScoreSchema>

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_CONFIG: UrgencyConfig = {
  weights: {
    deadline: 35,
    priority: 25,
    age: 10,
    dependency: 15,
    stale: 10,
    completion: 5,
  },
  thresholds: {
    critical: 85,
    high: 65,
    medium: 40,
    low: 20,
  },
  deadlineWindows: {
    criticalHours: 2,
    highHours: 24,
    mediumHours: 72,
    lowHours: 168,
  },
  staleThresholdHours: 48,
}

// =============================================================================
// FACTOR CALCULATIONS
// =============================================================================

/**
 * Calculate deadline urgency factor (0-100)
 */
export function calculateDeadlineFactor(
  deadline: Date | null,
  config: UrgencyConfig,
  now: Date = new Date()
): number {
  if (!deadline) {
    return 0 // No deadline = no deadline urgency
  }

  const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Overdue
  if (hoursUntil < 0) {
    const hoursOverdue = Math.abs(hoursUntil)
    // Escalate for every hour overdue, max at 100
    return Math.min(100, 100 + hoursOverdue * 0.5)
  }

  // Critical window
  if (hoursUntil <= config.deadlineWindows.criticalHours) {
    return 100
  }

  // High window
  if (hoursUntil <= config.deadlineWindows.highHours) {
    const progress = (config.deadlineWindows.highHours - hoursUntil) /
      (config.deadlineWindows.highHours - config.deadlineWindows.criticalHours)
    return 70 + progress * 30
  }

  // Medium window
  if (hoursUntil <= config.deadlineWindows.mediumHours) {
    const progress = (config.deadlineWindows.mediumHours - hoursUntil) /
      (config.deadlineWindows.mediumHours - config.deadlineWindows.highHours)
    return 40 + progress * 30
  }

  // Low window
  if (hoursUntil <= config.deadlineWindows.lowHours) {
    const progress = (config.deadlineWindows.lowHours - hoursUntil) /
      (config.deadlineWindows.lowHours - config.deadlineWindows.mediumHours)
    return 10 + progress * 30
  }

  return 0
}

/**
 * Calculate priority factor (0-100)
 */
export function calculatePriorityFactor(
  priority: TaskInput["priority"]
): number {
  switch (priority) {
    case "urgent":
      return 100
    case "high":
      return 75
    case "medium":
      return 40
    case "low":
      return 15
    default:
      return 0
  }
}

/**
 * Calculate age factor (0-100)
 * Older tasks get higher urgency
 */
export function calculateAgeFactor(
  createdAt: Date,
  now: Date = new Date()
): number {
  const daysOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

  // Exponential growth up to 100
  // 0 days = 0, 7 days = ~25, 30 days = ~70, 60+ days = ~100
  return Math.min(100, Math.pow(daysOld / 60, 0.8) * 100)
}

/**
 * Calculate dependency factor (0-100)
 * Tasks blocking other tasks are more urgent
 */
export function calculateDependencyFactor(
  blockedTasks: number,
  dependencyCount: number
): number {
  // Blocking tasks adds urgency
  const blockingScore = Math.min(50, blockedTasks * 15)

  // Being dependent on other tasks reduces urgency slightly
  // (can't do it until dependencies complete)
  const dependentPenalty = Math.min(20, dependencyCount * 5)

  return Math.max(0, blockingScore - dependentPenalty)
}

/**
 * Calculate stale factor (0-100)
 * Tasks without recent activity are more urgent
 */
export function calculateStaleFactor(
  lastActivityAt: Date | null,
  config: UrgencyConfig,
  now: Date = new Date()
): number {
  if (!lastActivityAt) {
    return 50 // No activity = moderate staleness
  }

  const hoursSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceActivity <= config.staleThresholdHours) {
    return 0
  }

  // Linear increase after threshold, max at 100
  const hoursStale = hoursSinceActivity - config.staleThresholdHours
  return Math.min(100, hoursStale / 2)
}

/**
 * Calculate completion factor (0-100)
 * For recurring tasks, lower completion rate = higher urgency
 */
export function calculateCompletionFactor(
  completionRate: number | null
): number {
  if (completionRate === null) {
    return 0 // Not a recurring task
  }

  // Lower completion rate = higher urgency
  return Math.round((1 - completionRate) * 100)
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

/**
 * Calculate all urgency factors
 */
export function calculateFactors(
  task: TaskInput,
  config: UrgencyConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): UrgencyFactors {
  return {
    deadlineFactor: calculateDeadlineFactor(task.deadline, config, now),
    priorityFactor: calculatePriorityFactor(task.priority),
    ageFactor: calculateAgeFactor(task.createdAt, now),
    dependencyFactor: calculateDependencyFactor(task.blockedTasks, task.dependencyCount),
    staleFactor: calculateStaleFactor(task.lastActivityAt, config, now),
    completionFactor: calculateCompletionFactor(task.completionRate),
  }
}

/**
 * Calculate weighted total score
 */
export function calculateTotalScore(
  factors: UrgencyFactors,
  config: UrgencyConfig = DEFAULT_CONFIG
): number {
  const { weights } = config

  const weightedSum =
    factors.deadlineFactor * weights.deadline +
    factors.priorityFactor * weights.priority +
    factors.ageFactor * weights.age +
    factors.dependencyFactor * weights.dependency +
    factors.staleFactor * weights.stale +
    factors.completionFactor * weights.completion

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  return Math.round(weightedSum / totalWeight)
}

/**
 * Determine urgency level from score
 */
export function scoreToLevel(
  score: number,
  config: UrgencyConfig = DEFAULT_CONFIG
): UrgencyLevel {
  const { thresholds } = config

  if (score >= thresholds.critical) return "critical"
  if (score >= thresholds.high) return "high"
  if (score >= thresholds.medium) return "medium"
  if (score >= thresholds.low) return "low"
  return "none"
}

/**
 * Generate factor breakdown descriptions
 */
export function generateBreakdown(
  factors: UrgencyFactors,
  task: TaskInput,
  config: UrgencyConfig = DEFAULT_CONFIG
): UrgencyScore["breakdown"] {
  const hoursUntil = task.deadline
    ? (task.deadline.getTime() - Date.now()) / (1000 * 60 * 60)
    : null

  return {
    deadline: hoursUntil === null
      ? "Pas d'échéance"
      : hoursUntil < 0
        ? `En retard de ${Math.abs(Math.round(hoursUntil))}h`
        : hoursUntil < 24
          ? `${Math.round(hoursUntil)}h restantes`
          : `${Math.round(hoursUntil / 24)} jours restants`,
    priority: `Priorité ${task.priority}`,
    age: `Créée il y a ${Math.round((Date.now() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24))} jours`,
    dependency: task.blockedTasks > 0
      ? `Bloque ${task.blockedTasks} tâche(s)`
      : "Aucune dépendance",
    stale: factors.staleFactor > 50
      ? "Aucune activité récente"
      : factors.staleFactor > 0
        ? "Activité modérée"
        : "Activité récente",
    completion: task.completionRate !== null
      ? `Taux de complétion: ${Math.round(task.completionRate * 100)}%`
      : "Non récurrente",
  }
}

/**
 * Generate recommendations based on factors
 */
export function generateRecommendations(
  factors: UrgencyFactors,
  task: TaskInput,
  level: UrgencyLevel
): string[] {
  const recommendations: string[] = []

  // Deadline recommendations
  if (factors.deadlineFactor >= 100) {
    if (task.deadline && task.deadline.getTime() < Date.now()) {
      recommendations.push("⚠️ Cette tâche est en retard - action immédiate requise")
    } else {
      recommendations.push("⏰ Échéance imminente - à traiter en priorité")
    }
  } else if (factors.deadlineFactor >= 70) {
    recommendations.push("📅 Échéance proche - planifiez du temps aujourd'hui")
  }

  // Priority recommendations
  if (factors.priorityFactor >= 75 && factors.deadlineFactor < 40) {
    recommendations.push("🎯 Priorité haute mais pas d'urgence de deadline - bon moment pour avancer")
  }

  // Stale recommendations
  if (factors.staleFactor >= 50) {
    recommendations.push("💤 Cette tâche n'a pas eu d'activité récente - besoin de suivi ?")
  }

  // Dependency recommendations
  if (factors.dependencyFactor >= 30) {
    recommendations.push("🔗 Cette tâche bloque d'autres tâches - la traiter libérera du travail")
  }

  // Completion rate recommendations
  if (factors.completionFactor >= 60) {
    recommendations.push("📊 Taux de complétion bas sur cette tâche récurrente - attention requise")
  }

  // Age recommendations
  if (factors.ageFactor >= 70 && level !== "critical") {
    recommendations.push("📆 Tâche ancienne - envisagez de la terminer ou l'archiver")
  }

  // Overall level recommendations
  if (level === "critical" && recommendations.length === 0) {
    recommendations.push("🚨 Urgence critique - nécessite une attention immédiate")
  } else if (level === "none" && recommendations.length === 0) {
    recommendations.push("✅ Pas d'urgence particulière - peut attendre si besoin")
  }

  return recommendations
}

/**
 * Calculate complete urgency score for a task
 */
export function calculateUrgencyScore(
  task: TaskInput,
  config: UrgencyConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): UrgencyScore {
  // Skip completed or cancelled tasks
  if (task.status === "completed" || task.status === "cancelled") {
    return {
      taskId: task.id,
      totalScore: 0,
      level: "none",
      factors: {
        deadlineFactor: 0,
        priorityFactor: 0,
        ageFactor: 0,
        dependencyFactor: 0,
        staleFactor: 0,
        completionFactor: 0,
      },
      breakdown: {
        deadline: "Tâche terminée",
        priority: "-",
        age: "-",
        dependency: "-",
        stale: "-",
        completion: "-",
      },
      recommendations: [],
      calculatedAt: now,
    }
  }

  const factors = calculateFactors(task, config, now)
  const totalScore = calculateTotalScore(factors, config)
  const level = scoreToLevel(totalScore, config)
  const breakdown = generateBreakdown(factors, task, config)
  const recommendations = generateRecommendations(factors, task, level)

  return {
    taskId: task.id,
    totalScore,
    level,
    factors,
    breakdown,
    recommendations,
    calculatedAt: now,
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Calculate urgency scores for multiple tasks
 */
export function calculateBatchScores(
  tasks: TaskInput[],
  config: UrgencyConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): UrgencyScore[] {
  return tasks.map((task) => calculateUrgencyScore(task, config, now))
}

/**
 * Sort tasks by urgency
 */
export function sortByUrgency(
  scores: UrgencyScore[],
  descending: boolean = true
): UrgencyScore[] {
  return [...scores].sort((a, b) =>
    descending
      ? b.totalScore - a.totalScore
      : a.totalScore - b.totalScore
  )
}

/**
 * Filter tasks by urgency level
 */
export function filterByLevel(
  scores: UrgencyScore[],
  minLevel: UrgencyLevel
): UrgencyScore[] {
  const levelOrder: UrgencyLevel[] = ["none", "low", "medium", "high", "critical"]
  const minIndex = levelOrder.indexOf(minLevel)

  return scores.filter((s) => levelOrder.indexOf(s.level) >= minIndex)
}

/**
 * Get top N most urgent tasks
 */
export function getTopUrgent(
  scores: UrgencyScore[],
  count: number
): UrgencyScore[] {
  return sortByUrgency(scores).slice(0, count)
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface UrgencyDistribution {
  none: number
  low: number
  medium: number
  high: number
  critical: number
  average: number
  overdue: number
}

/**
 * Calculate urgency distribution
 */
export function calculateDistribution(scores: UrgencyScore[]): UrgencyDistribution {
  const dist: UrgencyDistribution = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    average: 0,
    overdue: 0,
  }

  if (scores.length === 0) return dist

  let total = 0

  for (const score of scores) {
    dist[score.level]++
    total += score.totalScore

    // Check for overdue
    if (score.factors.deadlineFactor >= 100 && score.breakdown.deadline.includes("retard")) {
      dist.overdue++
    }
  }

  dist.average = Math.round(total / scores.length)

  return dist
}

/**
 * Get urgency trend over time
 */
export function calculateTrend(
  historicalScores: { date: Date; scores: UrgencyScore[] }[]
): { date: Date; average: number }[] {
  return historicalScores.map(({ date, scores }) => ({
    date,
    average: scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length)
      : 0,
  }))
}

// =============================================================================
// EXPORTS
// =============================================================================

export const urgencyCalculator = {
  // Config
  DEFAULT_CONFIG,

  // Factor calculations
  calculateDeadlineFactor,
  calculatePriorityFactor,
  calculateAgeFactor,
  calculateDependencyFactor,
  calculateStaleFactor,
  calculateCompletionFactor,

  // Score calculation
  calculateFactors,
  calculateTotalScore,
  scoreToLevel,
  generateBreakdown,
  generateRecommendations,
  calculateUrgencyScore,

  // Batch operations
  calculateBatchScores,
  sortByUrgency,
  filterByLevel,
  getTopUrgent,

  // Analytics
  calculateDistribution,
  calculateTrend,
}
