/**
 * Family Analytics - Comprehensive family task analytics
 * Functional, immutable approach to family insights
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const TimeRange = z.enum(["day", "week", "month", "quarter", "year"])
export type TimeRange = z.infer<typeof TimeRange>

export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["parent", "child", "other"]),
  age: z.number().nullable(),
  joinedAt: z.date(),
})
export type Member = z.infer<typeof MemberSchema>

export const TaskRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  assigneeId: z.string().nullable(),
  creatorId: z.string(),
  estimatedMinutes: z.number().nullable(),
  actualMinutes: z.number().nullable(),
  deadline: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
})
export type TaskRecord = z.infer<typeof TaskRecordSchema>

export const MemberStatsSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  role: z.string(),
  tasksAssigned: z.number(),
  tasksCompleted: z.number(),
  tasksOverdue: z.number(),
  completionRate: z.number(),
  averageCompletionTimeMinutes: z.number(),
  totalTimeContributedMinutes: z.number(),
  onTimeRate: z.number(),
  streak: z.number(),
  longestStreak: z.number(),
  points: z.number(),
})
export type MemberStats = z.infer<typeof MemberStatsSchema>

export const CategoryStatsSchema = z.object({
  category: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  completionRate: z.number(),
  averageTimeMinutes: z.number(),
  totalTimeMinutes: z.number(),
  mostActiveMembers: z.array(z.string()),
})
export type CategoryStats = z.infer<typeof CategoryStatsSchema>

export const TimeDistributionSchema = z.object({
  period: z.string(), // ISO date or week number
  tasksCreated: z.number(),
  tasksCompleted: z.number(),
  totalTimeMinutes: z.number(),
  byMember: z.record(z.string(), z.number()),
})
export type TimeDistribution = z.infer<typeof TimeDistributionSchema>

export const FamilyInsightsSchema = z.object({
  householdId: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date(),
    range: TimeRange,
  }),
  summary: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    pendingTasks: z.number(),
    overdueTasks: z.number(),
    completionRate: z.number(),
    averageCompletionTimeMinutes: z.number(),
    totalTimeInvestedMinutes: z.number(),
    tasksPerMember: z.number(),
  }),
  memberStats: z.array(MemberStatsSchema),
  categoryStats: z.array(CategoryStatsSchema),
  timeDistribution: z.array(TimeDistributionSchema),
  trends: z.object({
    completionRateTrend: z.number(), // percentage change
    productivityTrend: z.number(),
    engagementTrend: z.number(),
  }),
  generatedAt: z.date(),
})
export type FamilyInsights = z.infer<typeof FamilyInsightsSchema>

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Get date range for a time period
 */
export function getDateRange(
  range: TimeRange,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(referenceDate)
  end.setHours(23, 59, 59, 999)

  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)

  switch (range) {
    case "day":
      // Just today
      break
    case "week":
      // Start of week (Monday)
      const dayOfWeek = start.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      start.setDate(start.getDate() - diff)
      break
    case "month":
      start.setDate(1)
      break
    case "quarter":
      const currentMonth = start.getMonth()
      const quarterStart = Math.floor(currentMonth / 3) * 3
      start.setMonth(quarterStart, 1)
      break
    case "year":
      start.setMonth(0, 1)
      break
  }

  return { start, end }
}

/**
 * Get period key for a date
 */
export function getPeriodKey(date: Date, range: TimeRange): string {
  switch (range) {
    case "day":
      return date.toISOString().slice(0, 10)
    case "week":
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      const diff = day === 0 ? 6 : day - 1
      weekStart.setDate(weekStart.getDate() - diff)
      return `W${weekStart.toISOString().slice(0, 10)}`
    case "month":
      return date.toISOString().slice(0, 7)
    case "quarter":
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `${date.getFullYear()}-Q${quarter}`
    case "year":
      return String(date.getFullYear())
  }
}

/**
 * Filter tasks by date range
 */
export function filterTasksByDateRange(
  tasks: TaskRecord[],
  start: Date,
  end: Date
): TaskRecord[] {
  return tasks.filter((task) =>
    task.createdAt.getTime() >= start.getTime() &&
    task.createdAt.getTime() <= end.getTime()
  )
}

// =============================================================================
// MEMBER STATISTICS
// =============================================================================

/**
 * Calculate completion rate
 */
export function calculateCompletionRate(
  completed: number,
  total: number
): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Calculate on-time rate
 */
export function calculateOnTimeRate(tasks: TaskRecord[]): number {
  const completedWithDeadline = tasks.filter(
    (t) => t.status === "completed" && t.deadline !== null && t.completedAt !== null
  )

  if (completedWithDeadline.length === 0) return 100

  const onTime = completedWithDeadline.filter(
    (t) => t.completedAt!.getTime() <= t.deadline!.getTime()
  )

  return Math.round((onTime.length / completedWithDeadline.length) * 100)
}

/**
 * Calculate average completion time
 */
export function calculateAverageCompletionTime(tasks: TaskRecord[]): number {
  const completed = tasks.filter(
    (t) => t.status === "completed" && t.actualMinutes !== null
  )

  if (completed.length === 0) return 0

  const total = completed.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0)
  return Math.round(total / completed.length)
}

/**
 * Calculate completion streak
 */
export function calculateStreak(
  completedDates: Date[],
  now: Date = new Date()
): { current: number; longest: number } {
  if (completedDates.length === 0) {
    return { current: 0, longest: 0 }
  }

  // Sort dates descending
  const sorted = [...completedDates].sort((a, b) => b.getTime() - a.getTime())

  // Normalize to day boundaries
  const days = sorted.map((d) => {
    const normalized = new Date(d)
    normalized.setHours(0, 0, 0, 0)
    return normalized.getTime()
  })

  // Remove duplicates (same day)
  const uniqueDays = [...new Set(days)].sort((a, b) => b - a)

  // Calculate current streak
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()

  let current = 0
  let checkDate = todayTime

  for (const dayTime of uniqueDays) {
    if (dayTime === checkDate) {
      current++
      checkDate -= 24 * 60 * 60 * 1000 // Previous day
    } else if (dayTime === checkDate - 24 * 60 * 60 * 1000) {
      // Missed today but completed yesterday
      current++
      checkDate = dayTime - 24 * 60 * 60 * 1000
    } else {
      break
    }
  }

  // Calculate longest streak
  let longest = 0
  let currentRun = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = uniqueDays[i - 1]! - uniqueDays[i]!
    if (diff === 24 * 60 * 60 * 1000) {
      currentRun++
      longest = Math.max(longest, currentRun)
    } else {
      currentRun = 1
    }
  }

  longest = Math.max(longest, currentRun, current)

  return { current, longest }
}

/**
 * Calculate member points
 */
export function calculatePoints(stats: {
  tasksCompleted: number
  onTimeRate: number
  streak: number
}): number {
  const basePoints = stats.tasksCompleted * 10
  const onTimeBonus = Math.round(basePoints * (stats.onTimeRate / 100) * 0.2)
  const streakBonus = stats.streak * 5

  return basePoints + onTimeBonus + streakBonus
}

/**
 * Calculate member statistics
 */
export function calculateMemberStats(
  member: Member,
  tasks: TaskRecord[],
  now: Date = new Date()
): MemberStats {
  const memberTasks = tasks.filter((t) => t.assigneeId === member.id)
  const completed = memberTasks.filter((t) => t.status === "completed")
  const overdue = memberTasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "cancelled" &&
      t.deadline !== null &&
      t.deadline.getTime() < now.getTime()
  )

  const completedDates = completed
    .filter((t) => t.completedAt !== null)
    .map((t) => t.completedAt!)

  const streak = calculateStreak(completedDates, now)

  const totalTimeContributed = completed.reduce(
    (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes ?? 0),
    0
  )

  const stats = {
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    tasksAssigned: memberTasks.length,
    tasksCompleted: completed.length,
    tasksOverdue: overdue.length,
    completionRate: calculateCompletionRate(completed.length, memberTasks.length),
    averageCompletionTimeMinutes: calculateAverageCompletionTime(memberTasks),
    totalTimeContributedMinutes: totalTimeContributed,
    onTimeRate: calculateOnTimeRate(memberTasks),
    streak: streak.current,
    longestStreak: streak.longest,
    points: 0,
  }

  stats.points = calculatePoints(stats)

  return stats
}

// =============================================================================
// CATEGORY STATISTICS
// =============================================================================

/**
 * Get unique categories from tasks
 */
export function getCategories(tasks: TaskRecord[]): string[] {
  const categories = new Set<string>()
  for (const task of tasks) {
    if (task.category) {
      categories.add(task.category)
    }
  }
  return Array.from(categories).sort()
}

/**
 * Calculate category statistics
 */
export function calculateCategoryStats(
  category: string,
  tasks: TaskRecord[]
): CategoryStats {
  const categoryTasks = tasks.filter((t) => t.category === category)
  const completed = categoryTasks.filter((t) => t.status === "completed")

  // Find most active members
  const memberContributions = new Map<string, number>()
  for (const task of completed) {
    if (task.assigneeId) {
      const count = memberContributions.get(task.assigneeId) ?? 0
      memberContributions.set(task.assigneeId, count + 1)
    }
  }

  const sortedMembers = Array.from(memberContributions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  const totalTime = completed.reduce(
    (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes ?? 0),
    0
  )

  return {
    category,
    totalTasks: categoryTasks.length,
    completedTasks: completed.length,
    completionRate: calculateCompletionRate(completed.length, categoryTasks.length),
    averageTimeMinutes: completed.length > 0 ? Math.round(totalTime / completed.length) : 0,
    totalTimeMinutes: totalTime,
    mostActiveMembers: sortedMembers,
  }
}

/**
 * Calculate all category statistics
 */
export function calculateAllCategoryStats(tasks: TaskRecord[]): CategoryStats[] {
  const categories = getCategories(tasks)
  return categories.map((cat) => calculateCategoryStats(cat, tasks))
}

// =============================================================================
// TIME DISTRIBUTION
// =============================================================================

/**
 * Calculate time distribution
 */
export function calculateTimeDistribution(
  tasks: TaskRecord[],
  range: TimeRange
): TimeDistribution[] {
  const distribution = new Map<string, TimeDistribution>()

  for (const task of tasks) {
    const periodKey = getPeriodKey(task.createdAt, range)

    let entry = distribution.get(periodKey)
    if (!entry) {
      entry = {
        period: periodKey,
        tasksCreated: 0,
        tasksCompleted: 0,
        totalTimeMinutes: 0,
        byMember: {},
      }
      distribution.set(periodKey, entry)
    }

    entry.tasksCreated++

    if (task.status === "completed") {
      entry.tasksCompleted++
      const time = task.actualMinutes ?? task.estimatedMinutes ?? 0
      entry.totalTimeMinutes += time

      if (task.assigneeId) {
        entry.byMember[task.assigneeId] =
          (entry.byMember[task.assigneeId] ?? 0) + time
      }
    }
  }

  return Array.from(distribution.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  )
}

// =============================================================================
// TRENDS
// =============================================================================

export interface TrendData {
  current: number
  previous: number
  change: number
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Calculate completion rate trend
 */
export function calculateCompletionRateTrend(
  currentTasks: TaskRecord[],
  previousTasks: TaskRecord[]
): TrendData {
  const currentCompleted = currentTasks.filter((t) => t.status === "completed").length
  const currentRate = calculateCompletionRate(currentCompleted, currentTasks.length)

  const previousCompleted = previousTasks.filter((t) => t.status === "completed").length
  const previousRate = calculateCompletionRate(previousCompleted, previousTasks.length)

  return {
    current: currentRate,
    previous: previousRate,
    change: currentRate - previousRate,
  }
}

/**
 * Calculate productivity trend (tasks per day)
 */
export function calculateProductivityTrend(
  currentTasks: TaskRecord[],
  previousTasks: TaskRecord[],
  currentDays: number,
  previousDays: number
): TrendData {
  const currentCompleted = currentTasks.filter((t) => t.status === "completed").length
  const currentPerDay = currentDays > 0 ? currentCompleted / currentDays : 0

  const previousCompleted = previousTasks.filter((t) => t.status === "completed").length
  const previousPerDay = previousDays > 0 ? previousCompleted / previousDays : 0

  return {
    current: Math.round(currentPerDay * 10) / 10,
    previous: Math.round(previousPerDay * 10) / 10,
    change: calculatePercentageChange(currentPerDay, previousPerDay),
  }
}

/**
 * Calculate engagement trend (active members)
 */
export function calculateEngagementTrend(
  currentTasks: TaskRecord[],
  previousTasks: TaskRecord[]
): TrendData {
  const currentMembers = new Set(
    currentTasks
      .filter((t) => t.status === "completed")
      .map((t) => t.assigneeId)
      .filter((id): id is string => id !== null)
  )

  const previousMembers = new Set(
    previousTasks
      .filter((t) => t.status === "completed")
      .map((t) => t.assigneeId)
      .filter((id): id is string => id !== null)
  )

  return {
    current: currentMembers.size,
    previous: previousMembers.size,
    change: calculatePercentageChange(currentMembers.size, previousMembers.size),
  }
}

// =============================================================================
// FULL INSIGHTS
// =============================================================================

/**
 * Generate complete family insights
 */
export function generateFamilyInsights(
  householdId: string,
  members: Member[],
  tasks: TaskRecord[],
  range: TimeRange,
  referenceDate: Date = new Date()
): FamilyInsights {
  const { start, end } = getDateRange(range, referenceDate)
  const currentTasks = filterTasksByDateRange(tasks, start, end)

  // Get previous period tasks for trends
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  const previousStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const previousEnd = new Date(start.getTime() - 1)
  const previousTasks = filterTasksByDateRange(tasks, previousStart, previousEnd)

  const now = new Date()

  // Summary
  const completed = currentTasks.filter((t) => t.status === "completed")
  const pending = currentTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  )
  const overdue = currentTasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "cancelled" &&
      t.deadline !== null &&
      t.deadline.getTime() < now.getTime()
  )

  const totalTime = completed.reduce(
    (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes ?? 0),
    0
  )

  // Member stats
  const memberStats = members.map((m) =>
    calculateMemberStats(m, currentTasks, now)
  )

  // Category stats
  const categoryStats = calculateAllCategoryStats(currentTasks)

  // Time distribution
  const timeDistribution = calculateTimeDistribution(currentTasks, range)

  // Trends
  const completionTrend = calculateCompletionRateTrend(currentTasks, previousTasks)
  const productivityTrend = calculateProductivityTrend(
    currentTasks,
    previousTasks,
    periodDays,
    periodDays
  )
  const engagementTrend = calculateEngagementTrend(currentTasks, previousTasks)

  return {
    householdId,
    period: {
      start,
      end,
      range,
    },
    summary: {
      totalTasks: currentTasks.length,
      completedTasks: completed.length,
      pendingTasks: pending.length,
      overdueTasks: overdue.length,
      completionRate: calculateCompletionRate(completed.length, currentTasks.length),
      averageCompletionTimeMinutes: calculateAverageCompletionTime(currentTasks),
      totalTimeInvestedMinutes: totalTime,
      tasksPerMember: members.length > 0
        ? Math.round(currentTasks.length / members.length)
        : 0,
    },
    memberStats,
    categoryStats,
    timeDistribution,
    trends: {
      completionRateTrend: completionTrend.change,
      productivityTrend: productivityTrend.change,
      engagementTrend: engagementTrend.change,
    },
    generatedAt: now,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const familyAnalytics = {
  // Date utilities
  getDateRange,
  getPeriodKey,
  filterTasksByDateRange,

  // Member stats
  calculateCompletionRate,
  calculateOnTimeRate,
  calculateAverageCompletionTime,
  calculateStreak,
  calculatePoints,
  calculateMemberStats,

  // Category stats
  getCategories,
  calculateCategoryStats,
  calculateAllCategoryStats,

  // Time distribution
  calculateTimeDistribution,

  // Trends
  calculatePercentageChange,
  calculateCompletionRateTrend,
  calculateProductivityTrend,
  calculateEngagementTrend,

  // Full insights
  generateFamilyInsights,
}
