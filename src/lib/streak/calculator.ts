/**
 * Streak Calculator
 *
 * Calculates daily streaks for completing tasks.
 * Includes joker system for premium users.
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export interface StreakStatus {
  currentStreak: number
  longestStreak: number
  lastCompletedDate: Date | null
  isActive: boolean
  expiresAt: Date | null
  jokerAvailable: boolean
  jokerUsedToday: boolean
  daysUntilJokerReset: number
}

export interface DailyProgress {
  date: Date
  tasksCompleted: number
  tasksRequired: number
  isComplete: boolean
  jokerUsed: boolean
}

export interface StreakHistory {
  days: DailyProgress[]
  totalDaysCompleted: number
  totalJokersUsed: number
  averageTasksPerDay: number
}

export interface StreakConfig {
  /** Minimum tasks per day to maintain streak (default: 1) */
  minTasksPerDay: number
  /** Grace period in hours after midnight (default: 4) */
  gracePeriodHours: number
  /** Premium user has joker access */
  isPremium: boolean
  /** Days between joker resets (default: 7) */
  jokerResetDays: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_STREAK_CONFIG: StreakConfig = {
  minTasksPerDay: 1,
  gracePeriodHours: 4,
  isPremium: false,
  jokerResetDays: 7,
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Get the "streak date" for a given timestamp
 * Accounts for grace period after midnight
 */
export function getStreakDate(date: Date, gracePeriodHours: number = 4): Date {
  const d = new Date(date)

  // If within grace period, consider it the previous day
  if (d.getHours() < gracePeriodHours) {
    d.setDate(d.getDate() - 1)
  }

  // Reset to start of day
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Check if two dates are the same streak day
 */
export function isSameStreakDay(
  date1: Date,
  date2: Date,
  gracePeriodHours: number = 4
): boolean {
  const d1 = getStreakDate(date1, gracePeriodHours)
  const d2 = getStreakDate(date2, gracePeriodHours)
  return d1.getTime() === d2.getTime()
}

/**
 * Check if date1 is the day after date2 (streak consecutive)
 */
export function isConsecutiveDay(
  date1: Date,
  date2: Date,
  gracePeriodHours: number = 4
): boolean {
  const d1 = getStreakDate(date1, gracePeriodHours)
  const d2 = getStreakDate(date2, gracePeriodHours)

  const diff = d1.getTime() - d2.getTime()
  const oneDay = 24 * 60 * 60 * 1000

  return diff === oneDay
}

/**
 * Get days between two dates
 */
export function getDaysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)

  const diff = Math.abs(d1.getTime() - d2.getTime())
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

// =============================================================================
// STREAK CALCULATION
// =============================================================================

/**
 * Calculate streak status from completion history
 */
export function calculateStreak(
  completedDates: Date[],
  config: Partial<StreakConfig> = {}
): StreakStatus {
  const { gracePeriodHours = 4, isPremium = false, jokerResetDays = 7 } = config

  if (completedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      isActive: false,
      expiresAt: null,
      jokerAvailable: isPremium,
      jokerUsedToday: false,
      daysUntilJokerReset: jokerResetDays,
    }
  }

  // Sort dates newest first
  const sortedDates = [...completedDates]
    .map((d) => getStreakDate(d, gracePeriodHours))
    .sort((a, b) => b.getTime() - a.getTime())

  // Remove duplicates (same streak day)
  const uniqueDates: Date[] = []
  for (const date of sortedDates) {
    if (uniqueDates.length === 0 || uniqueDates[uniqueDates.length - 1]!.getTime() !== date.getTime()) {
      uniqueDates.push(date)
    }
  }

  const now = new Date()
  const today = getStreakDate(now, gracePeriodHours)
  const lastCompletedDate = uniqueDates[0] ?? null

  // Calculate current streak
  let currentStreak = 0
  let checkDate = today

  for (const completedDate of uniqueDates) {
    if (completedDate.getTime() === checkDate.getTime()) {
      currentStreak++
      checkDate = new Date(checkDate)
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (completedDate.getTime() < checkDate.getTime()) {
      // Gap in streak
      break
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let streakCount = 1

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = uniqueDates[i]!
    const next = uniqueDates[i + 1]!

    if (isConsecutiveDay(current, next, gracePeriodHours)) {
      streakCount++
    } else {
      longestStreak = Math.max(longestStreak, streakCount)
      streakCount = 1
    }
  }
  longestStreak = Math.max(longestStreak, streakCount, currentStreak)

  // Calculate if streak is active and expiration
  const isToday = lastCompletedDate?.getTime() === today.getTime()
  const isYesterday = lastCompletedDate ? isConsecutiveDay(today, lastCompletedDate, gracePeriodHours) : false
  const isActive = isToday || isYesterday

  // Calculate expiration time
  let expiresAt: Date | null = null
  if (isActive && !isToday) {
    // Streak will expire at end of grace period tomorrow
    expiresAt = new Date(today)
    expiresAt.setDate(expiresAt.getDate() + 1)
    expiresAt.setHours(gracePeriodHours, 0, 0, 0)
  } else if (isToday) {
    // Streak will expire tomorrow at end of grace period
    expiresAt = new Date(today)
    expiresAt.setDate(expiresAt.getDate() + 2)
    expiresAt.setHours(gracePeriodHours, 0, 0, 0)
  }

  return {
    currentStreak: isActive ? currentStreak : 0,
    longestStreak,
    lastCompletedDate,
    isActive,
    expiresAt,
    jokerAvailable: isPremium,
    jokerUsedToday: false, // Determined externally
    daysUntilJokerReset: jokerResetDays,
  }
}

/**
 * Check if streak is broken
 */
export function isStreakBroken(
  lastCompletedDate: Date | null,
  config: Partial<StreakConfig> = {}
): boolean {
  if (!lastCompletedDate) return true

  const { gracePeriodHours = 4 } = config
  const now = new Date()
  const today = getStreakDate(now, gracePeriodHours)
  const lastDay = getStreakDate(lastCompletedDate, gracePeriodHours)

  const daysDiff = getDaysBetween(today, lastDay)

  // Streak is broken if more than 1 day has passed
  return daysDiff > 1
}

/**
 * Calculate if user can use joker to save streak
 */
export function canUseJoker(
  status: StreakStatus,
  jokerLastUsed: Date | null,
  config: Partial<StreakConfig> = {}
): { canUse: boolean; reason?: string } {
  const { isPremium = false, jokerResetDays = 7 } = config

  if (!isPremium) {
    return { canUse: false, reason: "Joker réservé aux utilisateurs premium" }
  }

  if (status.isActive) {
    return { canUse: false, reason: "Streak toujours actif, pas besoin de joker" }
  }

  if (status.currentStreak === 0) {
    return { canUse: false, reason: "Pas de streak à sauver" }
  }

  if (jokerLastUsed) {
    const daysSinceJoker = getDaysBetween(new Date(), jokerLastUsed)
    if (daysSinceJoker < jokerResetDays) {
      return {
        canUse: false,
        reason: `Joker disponible dans ${jokerResetDays - daysSinceJoker} jour(s)`,
      }
    }
  }

  return { canUse: true }
}

// =============================================================================
// STREAK MILESTONES
// =============================================================================

/**
 * Get next milestone for current streak
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) {
      return milestone
    }
  }
  return null
}

/**
 * Check if streak just hit a milestone
 */
export function isAtMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak as typeof STREAK_MILESTONES[number])
}

/**
 * Get achieved milestones
 */
export function getAchievedMilestones(streak: number): number[] {
  return STREAK_MILESTONES.filter((m) => m <= streak)
}

/**
 * Get progress to next milestone
 */
export function getMilestoneProgress(currentStreak: number): {
  nextMilestone: number | null
  progress: number // 0-100
  daysRemaining: number
} {
  const nextMilestone = getNextMilestone(currentStreak)

  if (!nextMilestone) {
    return {
      nextMilestone: null,
      progress: 100,
      daysRemaining: 0,
    }
  }

  // Find previous milestone
  const prevMilestone = getAchievedMilestones(currentStreak).pop() ?? 0

  const totalDays = nextMilestone - prevMilestone
  const completedDays = currentStreak - prevMilestone

  return {
    nextMilestone,
    progress: Math.round((completedDays / totalDays) * 100),
    daysRemaining: nextMilestone - currentStreak,
  }
}

// =============================================================================
// HISTORY
// =============================================================================

/**
 * Build streak history from task completions
 */
export function buildStreakHistory(
  completions: Array<{ date: Date; count: number; jokerUsed?: boolean }>,
  daysBack: number = 30,
  config: Partial<StreakConfig> = {}
): StreakHistory {
  const { minTasksPerDay = 1, gracePeriodHours = 4 } = config

  const days: DailyProgress[] = []
  const today = getStreakDate(new Date(), gracePeriodHours)

  // Create map of completions by date
  const completionMap = new Map<string, { count: number; jokerUsed: boolean }>()
  for (const completion of completions) {
    const dateKey = getStreakDate(completion.date, gracePeriodHours).toISOString()
    const existing = completionMap.get(dateKey)
    completionMap.set(dateKey, {
      count: (existing?.count ?? 0) + completion.count,
      jokerUsed: existing?.jokerUsed ?? completion.jokerUsed ?? false,
    })
  }

  // Build history for each day
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const dateKey = date.toISOString()
    const dayData = completionMap.get(dateKey)

    days.push({
      date,
      tasksCompleted: dayData?.count ?? 0,
      tasksRequired: minTasksPerDay,
      isComplete: (dayData?.count ?? 0) >= minTasksPerDay,
      jokerUsed: dayData?.jokerUsed ?? false,
    })
  }

  // Calculate totals
  const completedDays = days.filter((d) => d.isComplete)
  const totalTasksCompleted = days.reduce((sum, d) => sum + d.tasksCompleted, 0)

  return {
    days: days.reverse(), // Oldest first
    totalDaysCompleted: completedDays.length,
    totalJokersUsed: days.filter((d) => d.jokerUsed).length,
    averageTasksPerDay: daysBack > 0 ? Math.round((totalTasksCompleted / daysBack) * 10) / 10 : 0,
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

export const StreakValidationSchema = z.object({
  userId: z.string().uuid(),
  date: z.coerce.date(),
  tasksCompleted: z.number().int().min(0),
  useJoker: z.boolean().optional(),
})

export type StreakValidation = z.infer<typeof StreakValidationSchema>
