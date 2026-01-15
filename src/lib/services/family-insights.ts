/**
 * Family Insights Service
 *
 * Provides analytics and insights for family task management:
 * - Monthly statistics
 * - Mental load trends
 * - Week-over-week comparisons
 * - Balance analysis
 * - Achievement tracking
 */

import { z } from "zod"

// ============================================================
// TYPES
// ============================================================

export interface Task {
  id: string
  title: string
  status: "pending" | "in_progress" | "done"
  priority: "low" | "normal" | "high" | "urgent"
  completedAt?: string | Date | null
  createdAt: string | Date
  assignedTo?: string
  childId?: string
  category?: string
  loadWeight?: number
  deadline?: string | Date | null
}

export interface HouseholdMember {
  userId: string
  name: string
  role: "owner" | "co_parent" | "viewer"
}

export interface MemberStats {
  userId: string
  name: string
  tasksCompleted: number
  tasksAssigned: number
  completionRate: number // 0-1
  totalLoadWeight: number
  loadPercentage: number // 0-100
  avgCompletionTime: number // hours
  onTimeRate: number // 0-1 (completed before deadline)
}

export interface CategoryStats {
  category: string
  taskCount: number
  completedCount: number
  avgLoadWeight: number
  totalTime: number // minutes
}

export interface DailyStats {
  date: Date
  tasksCreated: number
  tasksCompleted: number
  totalLoad: number
  completionRate: number
}

export interface WeeklyComparison {
  metric: string
  thisWeek: number
  lastWeek: number
  change: number // percentage change
  trend: "up" | "down" | "stable"
  isPositive: boolean // whether the trend is good
}

export interface MonthlyInsights {
  period: { start: Date; end: Date }
  totalTasks: number
  completedTasks: number
  overallCompletionRate: number
  avgTasksPerDay: number
  busiestDay: { day: string; count: number }
  mostProductiveHour: { hour: number; count: number }
  memberStats: MemberStats[]
  categoryBreakdown: CategoryStats[]
  weeklyTrend: DailyStats[]
  achievements: Achievement[]
  alerts: Alert[]
}

export interface Achievement {
  id: string
  type: "streak" | "milestone" | "improvement" | "balance"
  title: string
  description: string
  achievedAt: Date
  value?: number
}

export interface Alert {
  id: string
  type: "imbalance" | "overdue" | "trending_down" | "burnout_risk"
  severity: "info" | "warning" | "critical"
  message: string
  recommendation: string
}

export interface LoadTrend {
  period: string
  member1Load: number
  member2Load: number
  balance: number // -100 to 100 (0 = perfect balance)
  isBalanced: boolean
}

// ============================================================
// SCHEMAS
// ============================================================

export const TaskForInsightsSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["pending", "in_progress", "done"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  assignedTo: z.string().optional(),
  childId: z.string().optional(),
  category: z.string().optional(),
  loadWeight: z.number().optional(),
  deadline: z.string().nullable().optional(),
})

// ============================================================
// CONSTANTS
// ============================================================

const BALANCE_THRESHOLD = 15 // % difference considered balanced
const BURNOUT_THRESHOLD = 0.85 // 85% capacity
const MIN_TASKS_FOR_INSIGHTS = 5
const DEFAULT_LOAD_WEIGHT = 2

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getDayName(dayIndex: number): string {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
  return days[dayIndex] || "Inconnu"
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// ============================================================
// MEMBER STATISTICS
// ============================================================

/**
 * Calculate statistics for each household member
 */
export function calculateMemberStats(
  tasks: Task[],
  members: HouseholdMember[]
): MemberStats[] {
  const memberMap = new Map<string, {
    completed: number
    assigned: number
    loadWeight: number
    completionTimes: number[]
    onTime: number
    withDeadline: number
  }>()

  // Initialize all members
  for (const member of members) {
    memberMap.set(member.userId, {
      completed: 0,
      assigned: 0,
      loadWeight: 0,
      completionTimes: [],
      onTime: 0,
      withDeadline: 0,
    })
  }

  // Count tasks
  for (const task of tasks) {
    if (!task.assignedTo) continue

    const stats = memberMap.get(task.assignedTo)
    if (!stats) continue

    stats.assigned++
    stats.loadWeight += task.loadWeight || DEFAULT_LOAD_WEIGHT

    if (task.status === "done" && task.completedAt) {
      stats.completed++

      // Calculate completion time
      const created = new Date(task.createdAt).getTime()
      const completed = new Date(task.completedAt).getTime()
      const hours = (completed - created) / (1000 * 60 * 60)
      stats.completionTimes.push(hours)

      // Check if on time
      if (task.deadline) {
        stats.withDeadline++
        if (new Date(task.completedAt) <= new Date(task.deadline)) {
          stats.onTime++
        }
      }
    }
  }

  // Calculate totals for percentages
  const totalLoad = [...memberMap.values()].reduce((sum, s) => sum + s.loadWeight, 0)

  // Build results
  const results: MemberStats[] = []

  for (const member of members) {
    const stats = memberMap.get(member.userId)!
    const avgTime = stats.completionTimes.length > 0
      ? stats.completionTimes.reduce((a, b) => a + b, 0) / stats.completionTimes.length
      : 0

    results.push({
      userId: member.userId,
      name: member.name,
      tasksCompleted: stats.completed,
      tasksAssigned: stats.assigned,
      completionRate: stats.assigned > 0 ? stats.completed / stats.assigned : 0,
      totalLoadWeight: stats.loadWeight,
      loadPercentage: totalLoad > 0 ? (stats.loadWeight / totalLoad) * 100 : 0,
      avgCompletionTime: avgTime,
      onTimeRate: stats.withDeadline > 0 ? stats.onTime / stats.withDeadline : 1,
    })
  }

  return results.sort((a, b) => b.loadPercentage - a.loadPercentage)
}

// ============================================================
// CATEGORY BREAKDOWN
// ============================================================

/**
 * Break down tasks by category
 */
export function calculateCategoryBreakdown(tasks: Task[]): CategoryStats[] {
  const categoryMap = new Map<string, {
    count: number
    completed: number
    totalWeight: number
    totalTime: number
  }>()

  for (const task of tasks) {
    const category = task.category || "Sans catégorie"
    const stats = categoryMap.get(category) || {
      count: 0,
      completed: 0,
      totalWeight: 0,
      totalTime: 0,
    }

    stats.count++
    stats.totalWeight += task.loadWeight || DEFAULT_LOAD_WEIGHT

    if (task.status === "done" && task.completedAt) {
      stats.completed++
      const created = new Date(task.createdAt).getTime()
      const completed = new Date(task.completedAt).getTime()
      stats.totalTime += (completed - created) / (1000 * 60)
    }

    categoryMap.set(category, stats)
  }

  return [...categoryMap.entries()].map(([category, stats]) => ({
    category,
    taskCount: stats.count,
    completedCount: stats.completed,
    avgLoadWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0,
    totalTime: stats.totalTime,
  })).sort((a, b) => b.taskCount - a.taskCount)
}

// ============================================================
// DAILY STATISTICS
// ============================================================

/**
 * Calculate daily statistics for a period
 */
export function calculateDailyStats(
  tasks: Task[],
  startDate: Date,
  endDate: Date
): DailyStats[] {
  const dailyMap = new Map<string, DailyStats>()

  // Initialize all days in range
  const current = new Date(startDate)
  while (current <= endDate) {
    const key = current.toDateString()
    dailyMap.set(key, {
      date: new Date(current),
      tasksCreated: 0,
      tasksCompleted: 0,
      totalLoad: 0,
      completionRate: 0,
    })
    current.setDate(current.getDate() + 1)
  }

  // Count tasks
  for (const task of tasks) {
    const createdDate = getStartOfDay(new Date(task.createdAt))
    const createdKey = createdDate.toDateString()

    if (dailyMap.has(createdKey)) {
      const stats = dailyMap.get(createdKey)!
      stats.tasksCreated++
      stats.totalLoad += task.loadWeight || DEFAULT_LOAD_WEIGHT
    }

    if (task.status === "done" && task.completedAt) {
      const completedDate = getStartOfDay(new Date(task.completedAt))
      const completedKey = completedDate.toDateString()

      if (dailyMap.has(completedKey)) {
        const stats = dailyMap.get(completedKey)!
        stats.tasksCompleted++
      }
    }
  }

  // Calculate completion rates
  for (const stats of dailyMap.values()) {
    stats.completionRate = stats.tasksCreated > 0
      ? stats.tasksCompleted / stats.tasksCreated
      : 0
  }

  return [...dailyMap.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ============================================================
// WEEKLY COMPARISON
// ============================================================

/**
 * Compare this week to last week
 */
export function calculateWeeklyComparison(
  tasks: Task[],
  referenceDate: Date = new Date()
): WeeklyComparison[] {
  const thisWeekStart = getStartOfWeek(referenceDate)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setMilliseconds(-1)

  // Separate tasks by week
  const thisWeekTasks = tasks.filter(t => {
    const created = new Date(t.createdAt)
    return created >= thisWeekStart && created <= referenceDate
  })

  const lastWeekTasks = tasks.filter(t => {
    const created = new Date(t.createdAt)
    return created >= lastWeekStart && created <= lastWeekEnd
  })

  // Calculate metrics
  const thisCompleted = thisWeekTasks.filter(t => t.status === "done").length
  const lastCompleted = lastWeekTasks.filter(t => t.status === "done").length

  const thisLoad = thisWeekTasks.reduce((sum, t) => sum + (t.loadWeight || DEFAULT_LOAD_WEIGHT), 0)
  const lastLoad = lastWeekTasks.reduce((sum, t) => sum + (t.loadWeight || DEFAULT_LOAD_WEIGHT), 0)

  const thisRate = thisWeekTasks.length > 0 ? thisCompleted / thisWeekTasks.length : 0
  const lastRate = lastWeekTasks.length > 0 ? lastCompleted / lastWeekTasks.length : 0

  const comparisons: WeeklyComparison[] = [
    {
      metric: "Tâches créées",
      thisWeek: thisWeekTasks.length,
      lastWeek: lastWeekTasks.length,
      change: calculatePercentageChange(thisWeekTasks.length, lastWeekTasks.length),
      trend: thisWeekTasks.length > lastWeekTasks.length ? "up" : thisWeekTasks.length < lastWeekTasks.length ? "down" : "stable",
      isPositive: true, // More tasks isn't inherently bad
    },
    {
      metric: "Tâches complétées",
      thisWeek: thisCompleted,
      lastWeek: lastCompleted,
      change: calculatePercentageChange(thisCompleted, lastCompleted),
      trend: thisCompleted > lastCompleted ? "up" : thisCompleted < lastCompleted ? "down" : "stable",
      isPositive: thisCompleted >= lastCompleted,
    },
    {
      metric: "Taux de complétion",
      thisWeek: Math.round(thisRate * 100),
      lastWeek: Math.round(lastRate * 100),
      change: calculatePercentageChange(thisRate, lastRate),
      trend: thisRate > lastRate ? "up" : thisRate < lastRate ? "down" : "stable",
      isPositive: thisRate >= lastRate,
    },
    {
      metric: "Charge totale",
      thisWeek: thisLoad,
      lastWeek: lastLoad,
      change: calculatePercentageChange(thisLoad, lastLoad),
      trend: thisLoad > lastLoad ? "up" : thisLoad < lastLoad ? "down" : "stable",
      isPositive: thisLoad <= lastLoad, // Less load is better
    },
  ]

  return comparisons
}

// ============================================================
// LOAD BALANCE ANALYSIS
// ============================================================

/**
 * Analyze load balance between members over time
 */
export function calculateLoadTrends(
  tasks: Task[],
  members: HouseholdMember[],
  weeks: number = 4
): LoadTrend[] {
  if (members.length < 2) {
    return []
  }

  const trends: LoadTrend[] = []
  const now = new Date()

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - (i * 7))
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 7)

    const weekTasks = tasks.filter(t => {
      const created = new Date(t.createdAt)
      return created >= weekStart && created < weekEnd
    })

    // Calculate load per member
    const memberLoads = new Map<string, number>()
    for (const member of members) {
      memberLoads.set(member.userId, 0)
    }

    for (const task of weekTasks) {
      if (task.assignedTo && memberLoads.has(task.assignedTo)) {
        const current = memberLoads.get(task.assignedTo) || 0
        memberLoads.set(task.assignedTo, current + (task.loadWeight || DEFAULT_LOAD_WEIGHT))
      }
    }

    const loads = [...memberLoads.values()]
    const totalLoad = loads.reduce((a, b) => a + b, 0)

    const member1Load = totalLoad > 0 ? (loads[0] || 0) / totalLoad * 100 : 50
    const member2Load = totalLoad > 0 ? (loads[1] || 0) / totalLoad * 100 : 50
    const balance = member1Load - member2Load

    trends.push({
      period: `Semaine ${weeks - i}`,
      member1Load: Math.round(member1Load),
      member2Load: Math.round(member2Load),
      balance: Math.round(balance),
      isBalanced: Math.abs(balance) <= BALANCE_THRESHOLD,
    })
  }

  return trends
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

/**
 * Check for achievements
 */
export function checkAchievements(
  tasks: Task[],
  memberStats: MemberStats[],
  previousStats?: { completionRate: number; avgTasksPerDay: number }
): Achievement[] {
  const achievements: Achievement[] = []
  const now = new Date()

  const completedTasks = tasks.filter(t => t.status === "done")
  const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0

  // Streak achievements (simplified - would need streak data)
  if (completedTasks.length >= 7) {
    achievements.push({
      id: `streak-7-${now.getTime()}`,
      type: "streak",
      title: "Une semaine productive !",
      description: "7 tâches complétées ou plus cette semaine",
      achievedAt: now,
      value: completedTasks.length,
    })
  }

  // Milestone achievements
  const totalCompleted = completedTasks.length
  const milestones = [10, 25, 50, 100, 250, 500, 1000]
  for (const milestone of milestones) {
    if (totalCompleted >= milestone && totalCompleted < milestone + 10) {
      achievements.push({
        id: `milestone-${milestone}-${now.getTime()}`,
        type: "milestone",
        title: `${milestone} tâches !`,
        description: `Vous avez complété ${milestone} tâches`,
        achievedAt: now,
        value: milestone,
      })
    }
  }

  // Improvement achievements
  if (previousStats && completionRate > previousStats.completionRate * 1.1) {
    achievements.push({
      id: `improvement-rate-${now.getTime()}`,
      type: "improvement",
      title: "En progression !",
      description: "Votre taux de complétion a augmenté de 10%",
      achievedAt: now,
      value: Math.round((completionRate - previousStats.completionRate) * 100),
    })
  }

  // Balance achievement
  if (memberStats.length >= 2) {
    const loads = memberStats.map(m => m.loadPercentage)
    const maxDiff = Math.max(...loads) - Math.min(...loads)
    if (maxDiff <= 10) {
      achievements.push({
        id: `balance-${now.getTime()}`,
        type: "balance",
        title: "Équilibre parfait !",
        description: "La charge est équitablement répartie",
        achievedAt: now,
      })
    }
  }

  return achievements
}

// ============================================================
// ALERTS
// ============================================================

/**
 * Generate alerts based on analysis
 */
export function generateAlerts(
  tasks: Task[],
  memberStats: MemberStats[],
  weeklyComparison: WeeklyComparison[]
): Alert[] {
  const alerts: Alert[] = []

  // Check for imbalance
  if (memberStats.length >= 2) {
    const loads = memberStats.map(m => m.loadPercentage)
    const maxDiff = Math.max(...loads) - Math.min(...loads)

    if (maxDiff > 30) {
      const highestMember = memberStats.find(m => m.loadPercentage === Math.max(...loads))
      alerts.push({
        id: `imbalance-${Date.now()}`,
        type: "imbalance",
        severity: "warning",
        message: `${highestMember?.name || "Un membre"} porte ${Math.round(maxDiff)}% de charge en plus`,
        recommendation: "Envisagez de redistribuer certaines tâches pour plus d'équilibre",
      })
    }
  }

  // Check for overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (t.status === "done" || !t.deadline) return false
    return new Date(t.deadline) < new Date()
  })

  if (overdueTasks.length > 0) {
    alerts.push({
      id: `overdue-${Date.now()}`,
      type: "overdue",
      severity: overdueTasks.length > 3 ? "critical" : "warning",
      message: `${overdueTasks.length} tâche(s) en retard`,
      recommendation: "Priorisez ces tâches ou ajustez les deadlines",
    })
  }

  // Check for declining trend
  const completionComparison = weeklyComparison.find(w => w.metric === "Taux de complétion")
  if (completionComparison && completionComparison.change < -20) {
    alerts.push({
      id: `trending-${Date.now()}`,
      type: "trending_down",
      severity: "info",
      message: "Le taux de complétion a diminué de 20% cette semaine",
      recommendation: "Vous avez peut-être trop de tâches ? Essayez de prioriser",
    })
  }

  // Check for burnout risk
  for (const member of memberStats) {
    if (member.loadPercentage > BURNOUT_THRESHOLD * 100 && member.completionRate < 0.6) {
      alerts.push({
        id: `burnout-${member.userId}-${Date.now()}`,
        type: "burnout_risk",
        severity: "warning",
        message: `${member.name} a beaucoup de charge mais un taux de complétion faible`,
        recommendation: "Pensez à redistribuer quelques tâches ou reporter certaines deadlines",
      })
    }
  }

  return alerts.slice(0, 5) // Max 5 alerts
}

// ============================================================
// MONTHLY INSIGHTS
// ============================================================

/**
 * Generate comprehensive monthly insights
 */
export function generateMonthlyInsights(
  tasks: Task[],
  members: HouseholdMember[],
  referenceDate: Date = new Date()
): MonthlyInsights {
  const monthStart = getStartOfMonth(referenceDate)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  monthEnd.setMilliseconds(-1)

  // Filter tasks for this month
  const monthTasks = tasks.filter(t => {
    const created = new Date(t.createdAt)
    return created >= monthStart && created <= monthEnd
  })

  const completedTasks = monthTasks.filter(t => t.status === "done")
  const completionRate = monthTasks.length > 0 ? completedTasks.length / monthTasks.length : 0

  // Find busiest day
  const dayCount = new Map<number, number>()
  for (const task of monthTasks) {
    const day = new Date(task.createdAt).getDay()
    dayCount.set(day, (dayCount.get(day) || 0) + 1)
  }
  const busiestDayEntry = [...dayCount.entries()].sort((a, b) => b[1] - a[1])[0]
  const busiestDay = busiestDayEntry
    ? { day: getDayName(busiestDayEntry[0]), count: busiestDayEntry[1] }
    : { day: "N/A", count: 0 }

  // Find most productive hour
  const hourCount = new Map<number, number>()
  for (const task of completedTasks) {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours()
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1)
    }
  }
  const productiveHourEntry = [...hourCount.entries()].sort((a, b) => b[1] - a[1])[0]
  const mostProductiveHour = productiveHourEntry
    ? { hour: productiveHourEntry[0], count: productiveHourEntry[1] }
    : { hour: 10, count: 0 }

  // Calculate all stats
  const memberStats = calculateMemberStats(monthTasks, members)
  const categoryBreakdown = calculateCategoryBreakdown(monthTasks)
  const dailyStats = calculateDailyStats(monthTasks, monthStart, monthEnd)
  const weeklyComparison = calculateWeeklyComparison(tasks, referenceDate)
  const achievements = checkAchievements(monthTasks, memberStats)
  const alerts = generateAlerts(monthTasks, memberStats, weeklyComparison)

  // Calculate days in period for average
  const daysInMonth = (monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)

  return {
    period: { start: monthStart, end: monthEnd },
    totalTasks: monthTasks.length,
    completedTasks: completedTasks.length,
    overallCompletionRate: completionRate,
    avgTasksPerDay: monthTasks.length / Math.max(daysInMonth, 1),
    busiestDay,
    mostProductiveHour,
    memberStats,
    categoryBreakdown,
    weeklyTrend: dailyStats,
    achievements,
    alerts,
  }
}

// ============================================================
// FAMILY INSIGHTS CLASS
// ============================================================

export class FamilyInsights {
  private tasks: Task[]
  private members: HouseholdMember[]

  constructor(tasks: Task[] = [], members: HouseholdMember[] = []) {
    this.tasks = tasks
    this.members = members
  }

  /**
   * Update data
   */
  setData(tasks: Task[], members: HouseholdMember[]): void {
    this.tasks = tasks
    this.members = members
  }

  /**
   * Get monthly insights
   */
  getMonthlyInsights(referenceDate?: Date): MonthlyInsights {
    return generateMonthlyInsights(this.tasks, this.members, referenceDate)
  }

  /**
   * Get weekly comparison
   */
  getWeeklyComparison(referenceDate?: Date): WeeklyComparison[] {
    return calculateWeeklyComparison(this.tasks, referenceDate)
  }

  /**
   * Get member statistics
   */
  getMemberStats(): MemberStats[] {
    return calculateMemberStats(this.tasks, this.members)
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(): CategoryStats[] {
    return calculateCategoryBreakdown(this.tasks)
  }

  /**
   * Get load trends
   */
  getLoadTrends(weeks?: number): LoadTrend[] {
    return calculateLoadTrends(this.tasks, this.members, weeks)
  }

  /**
   * Check load balance
   */
  isBalanced(): { balanced: boolean; difference: number; message: string } {
    const stats = this.getMemberStats()

    if (stats.length < 2) {
      return { balanced: true, difference: 0, message: "Un seul membre actif" }
    }

    const loads = stats.map(s => s.loadPercentage)
    const difference = Math.max(...loads) - Math.min(...loads)
    const balanced = difference <= BALANCE_THRESHOLD

    let message = "Charge équilibrée"
    if (!balanced) {
      const highest = stats.find(s => s.loadPercentage === Math.max(...loads))
      message = `${highest?.name || "Un membre"} a ${Math.round(difference)}% de charge en plus`
    }

    return { balanced, difference, message }
  }

  /**
   * Get quick summary
   */
  getQuickSummary(): {
    tasksThisWeek: number
    completedThisWeek: number
    completionRate: number
    trend: "up" | "down" | "stable"
    balance: "balanced" | "imbalanced"
  } {
    const comparison = this.getWeeklyComparison()
    const balance = this.isBalanced()

    const completionComp = comparison.find(c => c.metric === "Taux de complétion")
    const tasksComp = comparison.find(c => c.metric === "Tâches complétées")

    return {
      tasksThisWeek: tasksComp?.thisWeek || 0,
      completedThisWeek: completionComp?.thisWeek || 0,
      completionRate: completionComp?.thisWeek || 0,
      trend: completionComp?.trend || "stable",
      balance: balance.balanced ? "balanced" : "imbalanced",
    }
  }
}

/**
 * Create a family insights instance
 */
export function createFamilyInsights(
  tasks: Task[] = [],
  members: HouseholdMember[] = []
): FamilyInsights {
  return new FamilyInsights(tasks, members)
}
