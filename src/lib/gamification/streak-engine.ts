/**
 * Streak Engine
 *
 * Daily streak tracking and management:
 * - Daily streak tracking
 * - Critical task completion validation
 * - Streak break detection
 * - Recovery mechanics
 * - Household streak aggregation
 */

import { z } from "zod"

// =============================================================================
// SCHEMAS
// =============================================================================

export const StreakStatusSchema = z.object({
  userId: z.string(),
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  lastActiveDate: z.date().nullable(),
  streakStartDate: z.date().nullable(),
  totalDaysActive: z.number().min(0),
  isActiveToday: z.boolean(),
  riskOfBreak: z.boolean(), // Haven't done anything today and it's late
})

export const DailyActivitySchema = z.object({
  date: z.date(),
  userId: z.string(),
  tasksCompleted: z.number().min(0),
  criticalTasksCompleted: z.number().min(0),
  totalWeight: z.number().min(0),
  wasActiveDay: z.boolean(), // Did they complete enough to count as "active"?
})

export const StreakConfigSchema = z.object({
  minTasksForActiveDay: z.number().min(1).default(1),
  minWeightForActiveDay: z.number().min(0).default(2),
  requireCriticalTask: z.boolean().default(false),
  gracePeriodHours: z.number().min(0).default(24), // Hours before streak breaks
  recoveryWindow: z.number().min(0).default(3), // Days to recover broken streak
  recoveryTaskMultiplier: z.number().min(1).default(2), // Extra tasks needed to recover
})

export const HouseholdStreakSchema = z.object({
  householdId: z.string(),
  combinedStreak: z.number().min(0), // Days where all members were active
  longestCombinedStreak: z.number().min(0),
  memberStreaks: z.array(StreakStatusSchema),
  lastFullActiveDate: z.date().nullable(),
  teamBonus: z.number().min(0), // Bonus for household coordination
})

export const StreakBreakInfoSchema = z.object({
  userId: z.string(),
  breakDate: z.date(),
  previousStreak: z.number(),
  canRecover: z.boolean(),
  recoveryDeadline: z.date().nullable(),
  recoveryRequirements: z.object({
    tasksNeeded: z.number(),
    weightNeeded: z.number(),
  }),
})

// =============================================================================
// TYPES
// =============================================================================

export type StreakStatus = z.infer<typeof StreakStatusSchema>
export type DailyActivity = z.infer<typeof DailyActivitySchema>
export type StreakConfig = z.infer<typeof StreakConfigSchema>
export type HouseholdStreak = z.infer<typeof HouseholdStreakSchema>
export type StreakBreakInfo = z.infer<typeof StreakBreakInfoSchema>

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_STREAK_CONFIG: StreakConfig = {
  minTasksForActiveDay: 1,
  minWeightForActiveDay: 2,
  requireCriticalTask: false,
  gracePeriodHours: 24,
  recoveryWindow: 3,
  recoveryTaskMultiplier: 2,
}

// Streak milestone rewards
export const STREAK_MILESTONES = {
  3: { label: "Bon début", points: 10, emoji: "🌱" },
  7: { label: "Semaine parfaite", points: 25, emoji: "🔥" },
  14: { label: "Deux semaines", points: 50, emoji: "⚡" },
  30: { label: "Un mois", points: 100, emoji: "🏆" },
  60: { label: "Deux mois", points: 200, emoji: "💎" },
  90: { label: "Trimestre", points: 350, emoji: "👑" },
  180: { label: "Six mois", points: 750, emoji: "🌟" },
  365: { label: "Un an", points: 2000, emoji: "🎖️" },
} as const

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Get the start of day for a date (midnight in local time)
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of day for a date (23:59:59.999 in local time)
 */
export function getEndOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Calculate the number of days between two dates
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const start1 = getStartOfDay(date1)
  const start2 = getStartOfDay(date2)
  const diffTime = Math.abs(start2.getTime() - start1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return getDaysDifference(date1, date2) === 0
}

/**
 * Check if date is yesterday relative to reference date
 */
export function isYesterday(date: Date, referenceDate: Date = new Date()): boolean {
  return getDaysDifference(date, referenceDate) === 1 && date < referenceDate
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// =============================================================================
// ACTIVITY TRACKING
// =============================================================================

/**
 * Check if a day qualifies as "active" based on config
 */
export function isActiveDay(activity: DailyActivity, config: StreakConfig = DEFAULT_STREAK_CONFIG): boolean {
  // Check minimum tasks
  if (activity.tasksCompleted < config.minTasksForActiveDay) {
    return false
  }

  // Check minimum weight
  if (activity.totalWeight < config.minWeightForActiveDay) {
    return false
  }

  // Check critical task requirement
  if (config.requireCriticalTask && activity.criticalTasksCompleted === 0) {
    return false
  }

  return true
}

/**
 * Create a daily activity record
 */
export function createDailyActivity(
  userId: string,
  date: Date,
  tasksCompleted: number,
  criticalTasksCompleted: number,
  totalWeight: number,
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): DailyActivity {
  const activity: DailyActivity = {
    date: getStartOfDay(date),
    userId,
    tasksCompleted,
    criticalTasksCompleted,
    totalWeight,
    wasActiveDay: false, // Will be set below
  }

  activity.wasActiveDay = isActiveDay(activity, config)
  return activity
}

/**
 * Get activity summary for a user over a date range
 */
export function getActivitySummary(
  activities: DailyActivity[],
  userId: string,
  startDate: Date,
  endDate: Date
): {
  totalDays: number
  activeDays: number
  totalTasks: number
  totalWeight: number
  averageTasksPerDay: number
  activityRate: number
} {
  const userActivities = activities.filter(
    (a) =>
      a.userId === userId &&
      a.date >= getStartOfDay(startDate) &&
      a.date <= getEndOfDay(endDate)
  )

  const totalDays = getDaysDifference(startDate, endDate) + 1
  const activeDays = userActivities.filter((a) => a.wasActiveDay).length
  const totalTasks = userActivities.reduce((sum, a) => sum + a.tasksCompleted, 0)
  const totalWeight = userActivities.reduce((sum, a) => sum + a.totalWeight, 0)

  return {
    totalDays,
    activeDays,
    totalTasks,
    totalWeight,
    averageTasksPerDay: totalDays > 0 ? totalTasks / totalDays : 0,
    activityRate: totalDays > 0 ? (activeDays / totalDays) * 100 : 0,
  }
}

// =============================================================================
// STREAK CALCULATION
// =============================================================================

/**
 * Calculate streak status from activity history
 */
export function calculateStreakStatus(
  userId: string,
  activities: DailyActivity[],
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): StreakStatus {
  // Filter and sort activities for this user (most recent first)
  const userActivities = activities
    .filter((a) => a.userId === userId && a.wasActiveDay)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  if (userActivities.length === 0) {
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      streakStartDate: null,
      totalDaysActive: 0,
      isActiveToday: false,
      riskOfBreak: false,
    }
  }

  const today = getStartOfDay(new Date())
  const lastActive = userActivities[0]!.date
  const isActiveToday = isSameDay(lastActive, today)
  const daysSinceLastActive = getDaysDifference(lastActive, today)

  // Calculate current streak
  let currentStreak = 0
  let expectedDate = isActiveToday ? today : getStartOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))

  for (const activity of userActivities) {
    if (isSameDay(activity.date, expectedDate)) {
      currentStreak++
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000)
    } else if (activity.date < expectedDate) {
      break // Gap in streak
    }
  }

  // If not active today and it's past grace period, streak is broken
  if (!isActiveToday && daysSinceLastActive > 0) {
    const hoursElapsed = (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
    if (hoursElapsed > config.gracePeriodHours) {
      currentStreak = 0
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  // Sort oldest first for this calculation
  const sortedActivities = [...userActivities].sort((a, b) => a.date.getTime() - b.date.getTime())

  for (const activity of sortedActivities) {
    if (prevDate === null || getDaysDifference(prevDate, activity.date) === 1) {
      tempStreak++
    } else if (!isSameDay(prevDate, activity.date)) {
      tempStreak = 1 // Reset
    }
    longestStreak = Math.max(longestStreak, tempStreak)
    prevDate = activity.date
  }

  // Find streak start date
  let streakStartDate: Date | null = null
  if (currentStreak > 0 && userActivities.length >= currentStreak) {
    const idx = isActiveToday ? currentStreak - 1 : currentStreak
    if (idx < userActivities.length) {
      streakStartDate = userActivities[idx]?.date ?? null
    }
  }

  // Check risk of break
  const now = new Date()
  const hoursLeftToday = 24 - now.getHours()
  const riskOfBreak = !isActiveToday && currentStreak > 0 && hoursLeftToday < 6

  return {
    userId,
    currentStreak,
    longestStreak,
    lastActiveDate: lastActive,
    streakStartDate,
    totalDaysActive: userActivities.length,
    isActiveToday,
    riskOfBreak,
  }
}

// =============================================================================
// STREAK BREAK DETECTION
// =============================================================================

/**
 * Detect if a streak was just broken
 */
export function detectStreakBreak(
  previousStatus: StreakStatus,
  currentStatus: StreakStatus,
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): StreakBreakInfo | null {
  // If previous streak was > 0 and current is 0, streak broke
  if (previousStatus.currentStreak > 0 && currentStatus.currentStreak === 0) {
    const breakDate = new Date()
    const recoveryDeadline = new Date(
      breakDate.getTime() + config.recoveryWindow * 24 * 60 * 60 * 1000
    )

    const baseTasksNeeded = config.minTasksForActiveDay * config.recoveryTaskMultiplier
    const baseWeightNeeded = config.minWeightForActiveDay * config.recoveryTaskMultiplier

    return {
      userId: currentStatus.userId,
      breakDate,
      previousStreak: previousStatus.currentStreak,
      canRecover: previousStatus.currentStreak >= 3, // Only allow recovery for meaningful streaks
      recoveryDeadline,
      recoveryRequirements: {
        tasksNeeded: baseTasksNeeded,
        weightNeeded: baseWeightNeeded,
      },
    }
  }

  return null
}

/**
 * Check if streak recovery is possible
 */
export function canRecoverStreak(breakInfo: StreakBreakInfo): boolean {
  if (!breakInfo.canRecover || !breakInfo.recoveryDeadline) {
    return false
  }

  return new Date() <= breakInfo.recoveryDeadline
}

/**
 * Attempt to recover a broken streak
 */
export function attemptStreakRecovery(
  breakInfo: StreakBreakInfo,
  todayActivity: DailyActivity
): {
  recovered: boolean
  newStreak: number
  message: string
} {
  if (!canRecoverStreak(breakInfo)) {
    return {
      recovered: false,
      newStreak: 0,
      message: "Le délai de récupération est dépassé.",
    }
  }

  const meetsRequirements =
    todayActivity.tasksCompleted >= breakInfo.recoveryRequirements.tasksNeeded &&
    todayActivity.totalWeight >= breakInfo.recoveryRequirements.weightNeeded

  if (meetsRequirements) {
    return {
      recovered: true,
      newStreak: breakInfo.previousStreak,
      message: `Série récupérée ! Vous reprenez à ${breakInfo.previousStreak} jours.`,
    }
  }

  const tasksRemaining = Math.max(
    0,
    breakInfo.recoveryRequirements.tasksNeeded - todayActivity.tasksCompleted
  )
  const weightRemaining = Math.max(
    0,
    breakInfo.recoveryRequirements.weightNeeded - todayActivity.totalWeight
  )

  return {
    recovered: false,
    newStreak: 0,
    message: `Encore ${tasksRemaining} tâches ou ${weightRemaining.toFixed(1)} points de charge pour récupérer.`,
  }
}

// =============================================================================
// HOUSEHOLD STREAKS
// =============================================================================

/**
 * Calculate household combined streak
 */
export function calculateHouseholdStreak(
  householdId: string,
  memberActivities: Map<string, DailyActivity[]>,
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): HouseholdStreak {
  const memberStreaks: StreakStatus[] = []

  // Calculate individual streaks
  for (const [userId, activities] of memberActivities) {
    memberStreaks.push(calculateStreakStatus(userId, activities, config))
  }

  if (memberStreaks.length === 0) {
    return {
      householdId,
      combinedStreak: 0,
      longestCombinedStreak: 0,
      memberStreaks: [],
      lastFullActiveDate: null,
      teamBonus: 0,
    }
  }

  // Find days where ALL members were active
  const allActivities = Array.from(memberActivities.values()).flat()
  const dateToActiveMembers = new Map<string, Set<string>>()

  for (const activity of allActivities) {
    if (activity.wasActiveDay) {
      const dateKey = getStartOfDay(activity.date).toISOString()
      if (!dateToActiveMembers.has(dateKey)) {
        dateToActiveMembers.set(dateKey, new Set())
      }
      dateToActiveMembers.get(dateKey)!.add(activity.userId)
    }
  }

  const memberCount = memberStreaks.length
  const fullActiveDates = Array.from(dateToActiveMembers.entries())
    .filter(([_, members]) => members.size === memberCount)
    .map(([dateStr]) => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime())

  // Calculate combined streak (consecutive days where all were active)
  let combinedStreak = 0
  const today = getStartOfDay(new Date())

  if (fullActiveDates.length > 0) {
    const lastFullActive = fullActiveDates[0]!
    const isAllActiveToday = isSameDay(lastFullActive, today)

    if (isAllActiveToday || isYesterday(lastFullActive)) {
      let expectedDate = isAllActiveToday
        ? today
        : getStartOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))

      for (const date of fullActiveDates) {
        if (isSameDay(date, expectedDate)) {
          combinedStreak++
          expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000)
        } else {
          break
        }
      }
    }
  }

  // Calculate longest combined streak
  let longestCombinedStreak = 0
  let tempStreak = 0
  const sortedFullDates = [...fullActiveDates].sort((a, b) => a.getTime() - b.getTime())

  for (let i = 0; i < sortedFullDates.length; i++) {
    if (i === 0 || getDaysDifference(sortedFullDates[i - 1]!, sortedFullDates[i]!) === 1) {
      tempStreak++
    } else {
      tempStreak = 1
    }
    longestCombinedStreak = Math.max(longestCombinedStreak, tempStreak)
  }

  // Calculate team bonus (10% for each day of combined streak)
  const teamBonus = Math.round(combinedStreak * 10)

  return {
    householdId,
    combinedStreak,
    longestCombinedStreak,
    memberStreaks,
    lastFullActiveDate: fullActiveDates.length > 0 ? fullActiveDates[0]! : null,
    teamBonus,
  }
}

// =============================================================================
// STREAK REWARDS
// =============================================================================

/**
 * Get milestone info for a streak value
 */
export function getStreakMilestone(streakDays: number): {
  milestone: number
  label: string
  points: number
  emoji: string
  nextMilestone: number | null
  daysToNext: number
} | null {
  const milestones = Object.keys(STREAK_MILESTONES)
    .map(Number)
    .sort((a, b) => a - b)

  let currentMilestone: number | null = null
  let nextMilestone: number | null = null

  for (let i = milestones.length - 1; i >= 0; i--) {
    if (streakDays >= milestones[i]!) {
      currentMilestone = milestones[i]!
      nextMilestone = i < milestones.length - 1 ? milestones[i + 1]! : null
      break
    }
  }

  if (currentMilestone === null) {
    // Not yet at first milestone
    nextMilestone = milestones[0]!
    return {
      milestone: 0,
      label: "Débutant",
      points: 0,
      emoji: "🌱",
      nextMilestone,
      daysToNext: nextMilestone - streakDays,
    }
  }

  const milestoneInfo = STREAK_MILESTONES[currentMilestone as keyof typeof STREAK_MILESTONES]

  return {
    milestone: currentMilestone,
    label: milestoneInfo.label,
    points: milestoneInfo.points,
    emoji: milestoneInfo.emoji,
    nextMilestone,
    daysToNext: nextMilestone ? nextMilestone - streakDays : 0,
  }
}

/**
 * Check if streak just reached a new milestone
 */
export function checkMilestoneReached(
  previousStreak: number,
  currentStreak: number
): { reached: boolean; milestone: keyof typeof STREAK_MILESTONES | null } {
  const milestones = Object.keys(STREAK_MILESTONES)
    .map(Number)
    .sort((a, b) => a - b) as Array<keyof typeof STREAK_MILESTONES>

  for (const milestone of milestones) {
    if (previousStreak < milestone && currentStreak >= milestone) {
      return { reached: true, milestone }
    }
  }

  return { reached: false, milestone: null }
}

/**
 * Calculate points earned for streak progress
 */
export function calculateStreakPoints(
  previousStreak: number,
  currentStreak: number
): {
  dailyPoints: number
  milestonePoints: number
  totalPoints: number
  messages: string[]
} {
  const messages: string[] = []

  // Daily points (1 point per day, with multiplier for longer streaks)
  const streakMultiplier = Math.min(1 + Math.floor(currentStreak / 7) * 0.1, 2) // Max 2x
  const dailyPoints = Math.round(streakMultiplier)

  // Milestone bonus
  let milestonePoints = 0
  const milestoneCheck = checkMilestoneReached(previousStreak, currentStreak)
  if (milestoneCheck.reached && milestoneCheck.milestone) {
    const info = STREAK_MILESTONES[milestoneCheck.milestone]
    milestonePoints = info.points
    messages.push(`${info.emoji} ${info.label} atteint ! +${info.points} points`)
  }

  if (currentStreak > 0) {
    messages.push(`🔥 Série de ${currentStreak} jours ! +${dailyPoints} points`)
  }

  return {
    dailyPoints,
    milestonePoints,
    totalPoints: dailyPoints + milestonePoints,
    messages,
  }
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Get streak status message
 */
export function getStreakMessage(status: StreakStatus): string {
  if (status.currentStreak === 0) {
    if (status.totalDaysActive === 0) {
      return "Pas encore de série - complétez une tâche pour commencer !"
    }
    return "Série interrompue - complétez une tâche aujourd'hui pour recommencer !"
  }

  if (status.riskOfBreak) {
    return `⚠️ Série de ${status.currentStreak} jours en danger ! Complétez une tâche rapidement.`
  }

  if (!status.isActiveToday) {
    return `🔥 Série de ${status.currentStreak} jours - n'oubliez pas de compléter une tâche aujourd'hui !`
  }

  const milestone = getStreakMilestone(status.currentStreak)
  if (milestone && milestone.nextMilestone) {
    return `🔥 Série de ${status.currentStreak} jours ! Plus que ${milestone.daysToNext} jours pour ${milestone.nextMilestone} jours.`
  }

  return `🔥 Série de ${status.currentStreak} jours ! Continuez comme ça !`
}

/**
 * Get household streak message
 */
export function getHouseholdStreakMessage(status: HouseholdStreak): string {
  if (status.combinedStreak === 0) {
    return "Pas de série d'équipe - tous les membres doivent être actifs le même jour !"
  }

  const activeCount = status.memberStreaks.filter((m) => m.isActiveToday).length
  const totalMembers = status.memberStreaks.length

  if (activeCount === totalMembers) {
    return `👨‍👩‍👧‍👦 Série d'équipe : ${status.combinedStreak} jours ! Tout le monde actif aujourd'hui. Bonus : ${status.teamBonus} pts`
  }

  return `👨‍👩‍👧‍👦 Série d'équipe : ${status.combinedStreak} jours. ${activeCount}/${totalMembers} actifs aujourd'hui.`
}

/**
 * Format streak for display
 */
export function formatStreakDisplay(status: StreakStatus): {
  emoji: string
  value: string
  label: string
  color: "green" | "yellow" | "red" | "gray"
} {
  if (status.currentStreak === 0) {
    return {
      emoji: "💤",
      value: "0",
      label: "jours",
      color: "gray",
    }
  }

  const milestone = getStreakMilestone(status.currentStreak)

  if (status.riskOfBreak) {
    return {
      emoji: "⚠️",
      value: status.currentStreak.toString(),
      label: "en danger !",
      color: "red",
    }
  }

  if (!status.isActiveToday) {
    return {
      emoji: "⏰",
      value: status.currentStreak.toString(),
      label: "à maintenir",
      color: "yellow",
    }
  }

  return {
    emoji: milestone?.emoji ?? "🔥",
    value: status.currentStreak.toString(),
    label: `${milestone?.label ?? "jours"}`,
    color: "green",
  }
}
