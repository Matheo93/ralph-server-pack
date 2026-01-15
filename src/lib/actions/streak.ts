"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"

// =============================================================================
// TYPES
// =============================================================================

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

interface JokerStatus {
  available: boolean
  usedThisMonth: boolean
  isPremium: boolean
  currentStreak: number
  streakAtRisk: boolean
  lastStreakUpdate: string | null
}

interface JokerUsage {
  id: string
  household_id: string
  used_at: string
  month: number
  year: number
  streak_value_saved: number
}

interface StreakInfo {
  current: number
  best: number
  lastUpdate: string | null
  daysAtRisk: number
  jokerAvailable: boolean
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUserHouseholdId(userId: string): Promise<string | null> {
  const membership = await queryOne<{ household_id: string }>(
    `SELECT household_id FROM household_members
     WHERE user_id = $1 AND is_active = true
     LIMIT 1`,
    [userId]
  )
  return membership?.household_id ?? null
}

// =============================================================================
// JOKER STATUS
// =============================================================================

/**
 * Get joker availability status for the current household
 */
export async function getJokerStatus(): Promise<ActionResult<JokerStatus>> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: "Non authentifié" }
    }

    await setCurrentUser(userId)

    const householdId = await getUserHouseholdId(userId)
    if (!householdId) {
      return { success: false, error: "Aucun foyer trouvé" }
    }

    // Get household info
    const household = await queryOne<{
      subscription_status: string
      streak_current: number
      streak_last_update: string | null
    }>(
      `SELECT subscription_status, streak_current, streak_last_update::text
       FROM households WHERE id = $1`,
      [householdId]
    )

    if (!household) {
      return { success: false, error: "Foyer non trouvé" }
    }

    const isPremium = ["active", "trial"].includes(household.subscription_status)

    // Check if joker was used this month
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const jokerUsed = await queryOne<{ id: string }>(
      `SELECT id FROM streak_jokers
       WHERE household_id = $1 AND month = $2 AND year = $3`,
      [householdId, currentMonth, currentYear]
    )

    // Calculate if streak is at risk (no task completed today or yesterday)
    const today = new Date()
    const lastUpdate = household.streak_last_update
      ? new Date(household.streak_last_update)
      : null

    let streakAtRisk = false
    if (lastUpdate) {
      const daysSinceUpdate = Math.floor(
        (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      )
      streakAtRisk = daysSinceUpdate >= 1 && household.streak_current > 0
    }

    return {
      success: true,
      data: {
        available: isPremium && !jokerUsed,
        usedThisMonth: !!jokerUsed,
        isPremium,
        currentStreak: household.streak_current,
        streakAtRisk,
        lastStreakUpdate: household.streak_last_update,
      },
    }
  } catch (error) {
    console.error("Error getting joker status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

// =============================================================================
// USE JOKER
// =============================================================================

/**
 * Use the monthly joker to save the streak
 */
export async function useJoker(): Promise<ActionResult<{ streakSaved: number }>> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: "Non authentifié" }
    }

    await setCurrentUser(userId)

    const householdId = await getUserHouseholdId(userId)
    if (!householdId) {
      return { success: false, error: "Aucun foyer trouvé" }
    }

    // Verify joker is available
    const statusResult = await getJokerStatus()
    if (!statusResult.success || !statusResult.data) {
      return { success: false, error: statusResult.error ?? "Erreur statut joker" }
    }

    if (!statusResult.data.available) {
      if (!statusResult.data.isPremium) {
        return { success: false, error: "Fonctionnalité réservée aux abonnés Premium" }
      }
      if (statusResult.data.usedThisMonth) {
        return { success: false, error: "Joker déjà utilisé ce mois-ci" }
      }
      return { success: false, error: "Joker non disponible" }
    }

    const currentStreak = statusResult.data.currentStreak
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const today = new Date().toISOString().split("T")[0]

    // Insert joker usage
    await query(
      `INSERT INTO streak_jokers (household_id, month, year, streak_value_saved)
       VALUES ($1, $2, $3, $4)`,
      [householdId, currentMonth, currentYear, currentStreak]
    )

    // Update or insert streak_history for today
    await query(
      `INSERT INTO streak_history (household_id, streak_date, streak_value, joker_used)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (household_id, streak_date)
       DO UPDATE SET joker_used = true`,
      [householdId, today, currentStreak]
    )

    // Update household streak_last_update to today
    await query(
      `UPDATE households
       SET streak_last_update = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1`,
      [householdId]
    )

    revalidatePath("/dashboard")
    revalidatePath("/tasks")

    return {
      success: true,
      data: { streakSaved: currentStreak },
    }
  } catch (error) {
    console.error("Error using joker:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'utilisation du joker",
    }
  }
}

// =============================================================================
// GET STREAK INFO
// =============================================================================

/**
 * Get comprehensive streak information for the current household
 */
export async function getStreakInfo(): Promise<ActionResult<StreakInfo>> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: "Non authentifié" }
    }

    await setCurrentUser(userId)

    const householdId = await getUserHouseholdId(userId)
    if (!householdId) {
      return { success: false, error: "Aucun foyer trouvé" }
    }

    const household = await queryOne<{
      streak_current: number
      streak_best: number
      streak_last_update: string | null
      subscription_status: string
    }>(
      `SELECT streak_current, streak_best, streak_last_update::text, subscription_status
       FROM households WHERE id = $1`,
      [householdId]
    )

    if (!household) {
      return { success: false, error: "Foyer non trouvé" }
    }

    // Calculate days at risk
    const today = new Date()
    const lastUpdate = household.streak_last_update
      ? new Date(household.streak_last_update)
      : null

    let daysAtRisk = 0
    if (lastUpdate && household.streak_current > 0) {
      daysAtRisk = Math.floor(
        (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Check joker availability
    const isPremium = ["active", "trial"].includes(household.subscription_status)
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const jokerUsed = await queryOne<{ id: string }>(
      `SELECT id FROM streak_jokers
       WHERE household_id = $1 AND month = $2 AND year = $3`,
      [householdId, currentMonth, currentYear]
    )

    return {
      success: true,
      data: {
        current: household.streak_current,
        best: household.streak_best,
        lastUpdate: household.streak_last_update,
        daysAtRisk,
        jokerAvailable: isPremium && !jokerUsed,
      },
    }
  } catch (error) {
    console.error("Error getting streak info:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

// =============================================================================
// GET JOKER HISTORY
// =============================================================================

/**
 * Get joker usage history for the current household
 */
export async function getJokerHistory(): Promise<ActionResult<JokerUsage[]>> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: "Non authentifié" }
    }

    await setCurrentUser(userId)

    const householdId = await getUserHouseholdId(userId)
    if (!householdId) {
      return { success: false, error: "Aucun foyer trouvé" }
    }

    const jokers = await query<JokerUsage>(
      `SELECT id, household_id, used_at::text, month, year, streak_value_saved
       FROM streak_jokers
       WHERE household_id = $1
       ORDER BY year DESC, month DESC
       LIMIT 12`,
      [householdId]
    )

    return {
      success: true,
      data: jokers,
    }
  } catch (error) {
    console.error("Error getting joker history:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

// =============================================================================
// UPDATE STREAK (Internal - called by task completion)
// =============================================================================

/**
 * Update the household streak when a task is completed
 * This should be called from task completion actions
 */
export async function updateStreakOnTaskComplete(
  householdId: string
): Promise<void> {
  try {
    const todayDate = new Date()
    const today = todayDate.toISOString().split("T")[0] ?? ""

    // Get current household streak info
    const household = await queryOne<{
      streak_current: number
      streak_best: number
      streak_last_update: string | null
    }>(
      `SELECT streak_current, streak_best, streak_last_update::text
       FROM households WHERE id = $1`,
      [householdId]
    )

    if (!household) return

    const lastUpdate = household.streak_last_update
    const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : null

    let newStreak = household.streak_current

    if (lastUpdateDate) {
      const daysDiff = Math.floor(
        (todayDate.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff === 0) {
        // Already updated today, no change
        return
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak = household.streak_current + 1
      } else {
        // Streak broken, check for joker
        const jokerUsed = await queryOne<{ id: string }>(
          `SELECT id FROM streak_history
           WHERE household_id = $1 AND streak_date >= $2 AND joker_used = true`,
          [householdId, lastUpdate]
        )

        if (jokerUsed) {
          // Joker was used, continue streak
          newStreak = household.streak_current + 1
        } else {
          // No joker, reset streak
          newStreak = 1
        }
      }
    } else {
      // First task ever
      newStreak = 1
    }

    const newBest = Math.max(newStreak, household.streak_best)

    // Update household
    await query(
      `UPDATE households
       SET streak_current = $1, streak_best = $2, streak_last_update = $3, updated_at = NOW()
       WHERE id = $4`,
      [newStreak, newBest, today, householdId]
    )

    // Record in streak history
    await query(
      `INSERT INTO streak_history (household_id, streak_date, streak_value, was_broken)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (household_id, streak_date)
       DO UPDATE SET streak_value = $3`,
      [householdId, today, newStreak, newStreak === 1 && household.streak_current > 0]
    )
  } catch (error) {
    console.error("Error updating streak:", error)
    // Don't throw - streak update failure shouldn't block task completion
  }
}
