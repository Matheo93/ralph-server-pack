import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"

export interface StreakInfo {
  current: number
  best: number
  lastCompletedDate: string | null
  isAtRisk: boolean
  riskReason: string | null
  nextMilestone: number | null
  unlockedMilestones: number[]
}

export interface StreakMilestone {
  days: number
  label: string
  badge: string
  description: string
}

export const MILESTONES: StreakMilestone[] = [
  { days: 3, label: "D\u00e9but prometteur", badge: "\ud83c\udf31", description: "3 jours cons\u00e9cutifs" },
  { days: 7, label: "Une semaine", badge: "\u2b50", description: "7 jours cons\u00e9cutifs" },
  { days: 14, label: "Deux semaines", badge: "\ud83c\udf1f", description: "14 jours cons\u00e9cutifs" },
  { days: 30, label: "Un mois", badge: "\ud83d\udd25", description: "30 jours cons\u00e9cutifs" },
  { days: 60, label: "Deux mois", badge: "\ud83d\udcaa", description: "60 jours cons\u00e9cutifs" },
  { days: 100, label: "Centenaire", badge: "\ud83c\udfc6", description: "100 jours cons\u00e9cutifs" },
  { days: 365, label: "L\u00e9gendaire", badge: "\ud83d\udc51", description: "Une ann\u00e9e compl\u00e8te" },
]

/**
 * Get current streak information for the user's household
 */
export async function getStreakInfo(): Promise<StreakInfo | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{
    household_id: string
    streak_current: number
    streak_best: number
    streak_last_completed: string | null
  }>(`
    SELECT
      hm.household_id,
      h.streak_current,
      h.streak_best,
      h.streak_last_completed::text
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = $1 AND hm.is_active = true
  `, [currentUserId])

  if (!membership) return null

  const { streak_current, streak_best, streak_last_completed } = membership

  // Check if streak is at risk
  const { isAtRisk, riskReason } = await checkStreakRisk(membership.household_id)

  // Calculate unlocked milestones
  const unlockedMilestones = MILESTONES
    .filter((m) => streak_best >= m.days)
    .map((m) => m.days)

  // Calculate next milestone
  const nextMilestone = MILESTONES.find((m) => m.days > streak_current)?.days ?? null

  return {
    current: streak_current,
    best: streak_best,
    lastCompletedDate: streak_last_completed,
    isAtRisk,
    riskReason,
    nextMilestone,
    unlockedMilestones,
  }
}

/**
 * Calculate streak from task history
 * Returns the current streak based on consecutive days with completed critical tasks
 */
export async function calculateStreak(householdId: string): Promise<number> {
  // Get dates with at least one completed critical task
  const completedDates = await query<{ completed_date: string }>(`
    SELECT DISTINCT DATE(completed_at)::text as completed_date
    FROM tasks
    WHERE household_id = $1
      AND status = 'done'
      AND is_critical = true
      AND completed_at IS NOT NULL
    ORDER BY completed_date DESC
    LIMIT 365
  `, [householdId])

  if (completedDates.length === 0) return 0

  // Check if the most recent completion is today or yesterday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const mostRecent = completedDates[0]
  if (!mostRecent) return 0

  const mostRecentDate = new Date(mostRecent.completed_date)

  // If the most recent completion is before yesterday, streak is broken
  if (mostRecentDate < yesterday) return 0

  // Count consecutive days
  let streak = 1
  let previousDate = mostRecentDate

  for (let i = 1; i < completedDates.length; i++) {
    const current = completedDates[i]
    if (!current) break

    const currentDate = new Date(current.completed_date)
    const expectedPrevious = new Date(previousDate)
    expectedPrevious.setDate(expectedPrevious.getDate() - 1)

    if (currentDate.getTime() === expectedPrevious.getTime()) {
      streak++
      previousDate = currentDate
    } else {
      break
    }
  }

  return streak
}

/**
 * Check if streak is at risk (critical task not completed today)
 */
export async function checkStreakRisk(
  householdId: string
): Promise<{ isAtRisk: boolean; riskReason: string | null }> {
  // Get household's current streak
  const household = await queryOne<{ streak_current: number }>(`
    SELECT streak_current FROM households WHERE id = $1
  `, [householdId])

  if (!household || household.streak_current === 0) {
    return { isAtRisk: false, riskReason: null }
  }

  // Check if there are pending critical tasks for today
  const pendingCritical = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM tasks
    WHERE household_id = $1
      AND is_critical = true
      AND status = 'pending'
      AND deadline = CURRENT_DATE
  `, [householdId])

  const pendingCount = parseInt(pendingCritical?.count ?? "0", 10)

  // Check if any critical task was completed today
  const completedToday = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM tasks
    WHERE household_id = $1
      AND is_critical = true
      AND status = 'done'
      AND DATE(completed_at) = CURRENT_DATE
  `, [householdId])

  const completedCount = parseInt(completedToday?.count ?? "0", 10)

  // If there are pending critical tasks and none completed today, streak is at risk
  if (pendingCount > 0 && completedCount === 0) {
    return {
      isAtRisk: true,
      riskReason: `${pendingCount} t\u00e2che${pendingCount > 1 ? "s" : ""} critique${pendingCount > 1 ? "s" : ""} \u00e0 faire aujourd'hui`,
    }
  }

  // Check if it's late in the day (after 18h) and there are still pending critical tasks
  const now = new Date()
  if (now.getHours() >= 18 && pendingCount > 0) {
    return {
      isAtRisk: true,
      riskReason: `${pendingCount} t\u00e2che${pendingCount > 1 ? "s" : ""} critique${pendingCount > 1 ? "s" : ""} encore en attente`,
    }
  }

  return { isAtRisk: false, riskReason: null }
}

/**
 * Update household streak (to be called after completing a critical task)
 */
export async function updateStreak(householdId: string): Promise<{
  newStreak: number
  isNewRecord: boolean
  milestoneUnlocked: StreakMilestone | null
}> {
  const newStreak = await calculateStreak(householdId)

  // Get current best streak
  const household = await queryOne<{ streak_best: number }>(`
    SELECT streak_best FROM households WHERE id = $1
  `, [householdId])

  const currentBest = household?.streak_best ?? 0
  const isNewRecord = newStreak > currentBest
  const newBest = isNewRecord ? newStreak : currentBest

  // Update household streak
  await query(`
    UPDATE households
    SET
      streak_current = $1,
      streak_best = $2,
      streak_last_completed = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = $3
  `, [newStreak, newBest, householdId])

  // Check if a new milestone was unlocked
  const previouslyUnlocked = MILESTONES.filter((m) => m.days <= currentBest)
  const nowUnlocked = MILESTONES.filter((m) => m.days <= newStreak)

  const newMilestones = nowUnlocked.filter(
    (m) => !previouslyUnlocked.find((p) => p.days === m.days)
  )

  const milestoneUnlocked = newMilestones.length > 0 ? newMilestones[newMilestones.length - 1] ?? null : null

  return {
    newStreak,
    isNewRecord,
    milestoneUnlocked,
  }
}

/**
 * Use a "joker" to save the streak (premium feature)
 * Allows skipping one day without breaking the streak
 */
export async function useStreakJoker(householdId: string): Promise<{
  success: boolean
  error?: string
}> {
  // Check if household has premium
  const household = await queryOne<{
    subscription_status: string
    streak_jokers_used: number
    streak_current: number
  }>(`
    SELECT subscription_status, streak_jokers_used, streak_current
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household) {
    return { success: false, error: "Foyer non trouv\u00e9" }
  }

  if (household.subscription_status !== "active") {
    return { success: false, error: "Fonctionnalit\u00e9 r\u00e9serv\u00e9e aux membres Premium" }
  }

  // Limit jokers per month (e.g., 2 per month)
  const MAX_JOKERS_PER_MONTH = 2
  if (household.streak_jokers_used >= MAX_JOKERS_PER_MONTH) {
    return { success: false, error: "Limite de jokers atteinte ce mois-ci" }
  }

  if (household.streak_current === 0) {
    return { success: false, error: "Pas de streak \u00e0 sauver" }
  }

  // Apply the joker - extend streak_last_completed by one day
  await query(`
    UPDATE households
    SET
      streak_last_completed = CURRENT_DATE,
      streak_jokers_used = streak_jokers_used + 1,
      updated_at = NOW()
    WHERE id = $1
  `, [householdId])

  return { success: true }
}

/**
 * Get milestone information for display
 */
export function getMilestoneInfo(currentStreak: number): {
  current: StreakMilestone | null
  next: StreakMilestone | null
  progress: number
} {
  const unlockedMilestones = MILESTONES.filter((m) => currentStreak >= m.days)
  const current = unlockedMilestones.length > 0
    ? unlockedMilestones[unlockedMilestones.length - 1] ?? null
    : null

  const next = MILESTONES.find((m) => m.days > currentStreak) ?? null

  let progress = 0
  if (current && next) {
    const range = next.days - current.days
    const achieved = currentStreak - current.days
    progress = Math.round((achieved / range) * 100)
  } else if (!current && next) {
    progress = Math.round((currentStreak / next.days) * 100)
  } else if (current && !next) {
    progress = 100
  }

  return { current, next, progress }
}
