/**
 * Load Distribution Calculator
 *
 * Calculates task load per parent and provides metrics for fair distribution.
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export interface TaskLoad {
  taskId: string
  title: string
  category: string
  weight: number
  completedAt: Date | null
  assignedTo: string | null
}

export interface ParentLoad {
  userId: string
  userName: string
  totalWeight: number
  taskCount: number
  completedCount: number
  pendingCount: number
  weeklyWeight: number
  monthlyWeight: number
  percentage: number
}

export interface LoadDistribution {
  parents: ParentLoad[]
  totalWeight: number
  totalTasks: number
  balanceScore: number // 0-100, 100 = perfectly balanced
  mostLoaded: ParentLoad | null
  leastLoaded: ParentLoad | null
}

export interface WeeklyStats {
  week: string // ISO week string
  startDate: Date
  endDate: Date
  parents: Array<{
    userId: string
    userName: string
    completedWeight: number
    completedCount: number
  }>
  totalWeight: number
  totalCount: number
}

// =============================================================================
// WEIGHT CONSTANTS
// =============================================================================

/**
 * Default weight by category (1-5 scale)
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  ecole: 3,
  sante: 4,
  administratif: 4,
  quotidien: 2,
  social: 2,
  activites: 3,
  logistique: 2,
  autre: 2,
}

/**
 * Weight multipliers for task characteristics
 */
export const WEIGHT_MULTIPLIERS = {
  urgent: 1.5,
  recurring: 0.8, // Recurring tasks are slightly less impactful
  critical: 1.3,
} as const

// =============================================================================
// LOAD CALCULATION
// =============================================================================

/**
 * Calculate task weight
 */
export function calculateTaskWeight(task: {
  weight?: number
  category?: string
  priority?: number
  critical?: boolean
  recurrence?: string
}): number {
  // Base weight from task or category default
  let weight = task.weight ?? CATEGORY_WEIGHTS[task.category ?? "autre"] ?? 2

  // Apply priority multiplier
  if (task.priority === 1) {
    weight *= WEIGHT_MULTIPLIERS.urgent
  }

  // Apply critical multiplier
  if (task.critical) {
    weight *= WEIGHT_MULTIPLIERS.critical
  }

  // Apply recurring discount
  if (task.recurrence && task.recurrence !== "once") {
    weight *= WEIGHT_MULTIPLIERS.recurring
  }

  return Math.round(weight * 10) / 10
}

/**
 * Calculate load distribution for a household
 */
export function calculateDistribution(
  tasks: TaskLoad[],
  parents: Array<{ userId: string; userName: string }>
): LoadDistribution {
  // Initialize parent loads
  const parentLoads = new Map<string, ParentLoad>()
  for (const parent of parents) {
    parentLoads.set(parent.userId, {
      userId: parent.userId,
      userName: parent.userName,
      totalWeight: 0,
      taskCount: 0,
      completedCount: 0,
      pendingCount: 0,
      weeklyWeight: 0,
      monthlyWeight: 0,
      percentage: 0,
    })
  }

  // Calculate time boundaries
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let totalWeight = 0
  let totalTasks = 0

  // Process each task
  for (const task of tasks) {
    if (!task.assignedTo) continue

    const parentLoad = parentLoads.get(task.assignedTo)
    if (!parentLoad) continue

    parentLoad.taskCount++
    parentLoad.totalWeight += task.weight
    totalWeight += task.weight
    totalTasks++

    if (task.completedAt) {
      parentLoad.completedCount++

      // Weekly stats
      if (task.completedAt >= weekAgo) {
        parentLoad.weeklyWeight += task.weight
      }

      // Monthly stats
      if (task.completedAt >= monthAgo) {
        parentLoad.monthlyWeight += task.weight
      }
    } else {
      parentLoad.pendingCount++
    }
  }

  // Calculate percentages
  for (const [, parentLoad] of parentLoads) {
    parentLoad.percentage =
      totalWeight > 0
        ? Math.round((parentLoad.totalWeight / totalWeight) * 100)
        : 0
  }

  const parentArray = Array.from(parentLoads.values())

  // Calculate balance score
  const balanceScore = calculateBalanceScore(parentArray)

  // Find most and least loaded
  const sortedByLoad = [...parentArray].sort((a, b) => b.totalWeight - a.totalWeight)
  const mostLoaded = sortedByLoad[0] ?? null
  const leastLoaded = sortedByLoad[sortedByLoad.length - 1] ?? null

  return {
    parents: parentArray,
    totalWeight,
    totalTasks,
    balanceScore,
    mostLoaded,
    leastLoaded,
  }
}

/**
 * Calculate balance score (0-100)
 * 100 = perfectly balanced, 0 = completely imbalanced
 */
export function calculateBalanceScore(parents: ParentLoad[]): number {
  if (parents.length === 0) return 100
  if (parents.length === 1) return 100

  const totalWeight = parents.reduce((sum, p) => sum + p.totalWeight, 0)
  if (totalWeight === 0) return 100

  const idealPercentage = 100 / parents.length
  const deviations = parents.map((p) => Math.abs(p.percentage - idealPercentage))
  const averageDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length

  // Convert deviation to score (0 deviation = 100, 50 deviation = 0)
  const score = Math.max(0, 100 - averageDeviation * 2)
  return Math.round(score)
}

// =============================================================================
// WEEKLY STATS
// =============================================================================

/**
 * Get ISO week number
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getFullYear(), week: weekNumber }
}

/**
 * Get week start and end dates
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start

  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Calculate weekly statistics
 */
export function calculateWeeklyStats(
  tasks: TaskLoad[],
  parents: Array<{ userId: string; userName: string }>,
  weekDate: Date = new Date()
): WeeklyStats {
  const { year, week } = getISOWeek(weekDate)
  const { start, end } = getWeekBounds(weekDate)

  // Filter tasks completed in this week
  const weekTasks = tasks.filter((t) => {
    if (!t.completedAt) return false
    return t.completedAt >= start && t.completedAt <= end
  })

  // Calculate per-parent stats
  const parentStats = parents.map((parent) => {
    const parentTasks = weekTasks.filter((t) => t.assignedTo === parent.userId)
    return {
      userId: parent.userId,
      userName: parent.userName,
      completedWeight: parentTasks.reduce((sum, t) => sum + t.weight, 0),
      completedCount: parentTasks.length,
    }
  })

  return {
    week: `${year}-W${week.toString().padStart(2, "0")}`,
    startDate: start,
    endDate: end,
    parents: parentStats,
    totalWeight: weekTasks.reduce((sum, t) => sum + t.weight, 0),
    totalCount: weekTasks.length,
  }
}

/**
 * Get history of weekly stats
 */
export function getWeeklyHistory(
  tasks: TaskLoad[],
  parents: Array<{ userId: string; userName: string }>,
  weeksBack: number = 4
): WeeklyStats[] {
  const history: WeeklyStats[] = []
  const now = new Date()

  for (let i = 0; i < weeksBack; i++) {
    const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    history.push(calculateWeeklyStats(tasks, parents, weekDate))
  }

  return history.reverse()
}

// =============================================================================
// BALANCE ALERTS
// =============================================================================

export type AlertLevel = "none" | "low" | "medium" | "high"

export interface BalanceAlert {
  level: AlertLevel
  message: string
  mostLoaded?: ParentLoad
  leastLoaded?: ParentLoad
  imbalancePercentage: number
}

/**
 * Generate balance alert based on distribution
 */
export function generateBalanceAlert(distribution: LoadDistribution): BalanceAlert {
  const { balanceScore, mostLoaded, leastLoaded, parents } = distribution

  if (parents.length <= 1) {
    return {
      level: "none",
      message: "Répartition équilibrée",
      imbalancePercentage: 0,
    }
  }

  const imbalance = mostLoaded && leastLoaded
    ? mostLoaded.percentage - leastLoaded.percentage
    : 0

  if (balanceScore >= 80) {
    return {
      level: "none",
      message: "La répartition est équilibrée",
      mostLoaded: mostLoaded ?? undefined,
      leastLoaded: leastLoaded ?? undefined,
      imbalancePercentage: imbalance,
    }
  }

  if (balanceScore >= 60) {
    return {
      level: "low",
      message: `Léger déséquilibre : ${mostLoaded?.userName} a ${imbalance}% de charge en plus`,
      mostLoaded: mostLoaded ?? undefined,
      leastLoaded: leastLoaded ?? undefined,
      imbalancePercentage: imbalance,
    }
  }

  if (balanceScore >= 40) {
    return {
      level: "medium",
      message: `Déséquilibre modéré : ${mostLoaded?.userName} a ${imbalance}% de charge en plus que ${leastLoaded?.userName}`,
      mostLoaded: mostLoaded ?? undefined,
      leastLoaded: leastLoaded ?? undefined,
      imbalancePercentage: imbalance,
    }
  }

  return {
    level: "high",
    message: `Déséquilibre important : ${mostLoaded?.userName} assume ${mostLoaded?.percentage}% de la charge mentale`,
    mostLoaded: mostLoaded ?? undefined,
    leastLoaded: leastLoaded ?? undefined,
    imbalancePercentage: imbalance,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format weight for display
 */
export function formatWeight(weight: number): string {
  return weight.toFixed(1)
}

/**
 * Get load level description
 */
export function getLoadLevel(percentage: number): "low" | "balanced" | "high" {
  if (percentage < 40) return "low"
  if (percentage > 60) return "high"
  return "balanced"
}

/**
 * Calculate trend (increasing, decreasing, stable)
 */
export function calculateTrend(
  current: number,
  previous: number
): "increasing" | "decreasing" | "stable" {
  const diff = current - previous
  const threshold = Math.max(previous * 0.1, 1) // 10% or 1

  if (diff > threshold) return "increasing"
  if (diff < -threshold) return "decreasing"
  return "stable"
}
