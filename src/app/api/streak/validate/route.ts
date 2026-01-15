/**
 * Streak Validate API
 *
 * POST: Validate/update streak after task completion or joker use
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, execute } from "@/lib/aws/database"
import { z } from "zod"
import {
  calculateStreak,
  getStreakDate,
  isStreakBroken,
  canUseJoker,
  isAtMilestone,
} from "@/lib/streak/calculator"

const ValidateSchema = z.object({
  useJoker: z.boolean().optional().default(false),
})

interface UserStreak {
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  joker_last_used: string | null
}

interface UserInfo {
  is_premium: boolean
}

/**
 * POST /api/streak/validate
 * Validate streak after task completion or use joker
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const validation = ValidateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { useJoker } = validation.data

  // Get user info
  const userInfo = await queryOne<UserInfo>(`
    SELECT COALESCE(is_premium, false) as is_premium
    FROM users
    WHERE id = $1
  `, [userId])

  const isPremium = userInfo?.is_premium ?? false

  // Get current streak record
  let userStreak = await queryOne<UserStreak>(`
    SELECT
      current_streak,
      longest_streak,
      last_completed_date,
      joker_last_used
    FROM user_streaks
    WHERE user_id = $1
  `, [userId])

  // Create if not exists
  if (!userStreak) {
    await execute(`
      INSERT INTO user_streaks (user_id, current_streak, longest_streak)
      VALUES ($1, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId])

    userStreak = {
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      joker_last_used: null,
    }
  }

  // Get today's completions
  const today = getStreakDate(new Date(), 4)
  const todayCompletions = await queryOne<{ count: number }>(`
    SELECT COUNT(*)::int as count
    FROM tasks
    WHERE assigned_to = $1
      AND completed_at >= $2
      AND completed_at < $2 + INTERVAL '1 day'
  `, [userId, today.toISOString()])

  const hasCompletedToday = (todayCompletions?.count ?? 0) >= 1

  // Handle joker use
  if (useJoker) {
    if (!isPremium) {
      return NextResponse.json(
        { error: "Joker réservé aux utilisateurs premium" },
        { status: 403 }
      )
    }

    const lastJokerDate = userStreak.joker_last_used
      ? new Date(userStreak.joker_last_used)
      : null

    const jokerCheck = canUseJoker(
      {
        currentStreak: userStreak.current_streak,
        longestStreak: userStreak.longest_streak,
        lastCompletedDate: userStreak.last_completed_date
          ? new Date(userStreak.last_completed_date)
          : null,
        isActive: !isStreakBroken(
          userStreak.last_completed_date
            ? new Date(userStreak.last_completed_date)
            : null
        ),
        expiresAt: null,
        jokerAvailable: true,
        jokerUsedToday: false,
        daysUntilJokerReset: 0,
      },
      lastJokerDate,
      { isPremium, jokerResetDays: 7 }
    )

    if (!jokerCheck.canUse) {
      return NextResponse.json(
        { error: jokerCheck.reason },
        { status: 400 }
      )
    }

    // Use joker - maintain current streak
    await execute(`
      UPDATE user_streaks
      SET joker_last_used = NOW(),
          last_completed_date = NOW(),
          updated_at = NOW()
      WHERE user_id = $1
    `, [userId])

    return NextResponse.json({
      success: true,
      action: "joker_used",
      streak: {
        current: userStreak.current_streak,
        longest: userStreak.longest_streak,
        isActive: true,
        jokerUsed: true,
      },
      message: "Joker utilisé ! Votre streak est sauvegardé.",
    })
  }

  // Regular validation (after task completion)
  if (!hasCompletedToday) {
    // Check if streak is broken
    const isBroken = isStreakBroken(
      userStreak.last_completed_date
        ? new Date(userStreak.last_completed_date)
        : null,
      { gracePeriodHours: 4 }
    )

    return NextResponse.json({
      success: false,
      action: "no_completion",
      streak: {
        current: isBroken ? 0 : userStreak.current_streak,
        longest: userStreak.longest_streak,
        isActive: !isBroken,
        isBroken,
      },
      message: isBroken
        ? "Votre streak a été interrompu. Complétez une tâche pour recommencer !"
        : "Complétez une tâche aujourd'hui pour maintenir votre streak !",
    })
  }

  // User has completed today - update streak
  const lastDate = userStreak.last_completed_date
    ? new Date(userStreak.last_completed_date)
    : null

  let newStreak: number
  let streakContinued = false

  if (!lastDate) {
    // First completion ever
    newStreak = 1
  } else {
    const lastStreakDate = getStreakDate(lastDate, 4)
    const todayStreakDate = getStreakDate(new Date(), 4)

    if (lastStreakDate.getTime() === todayStreakDate.getTime()) {
      // Already completed today
      newStreak = userStreak.current_streak
      streakContinued = false
    } else if (
      todayStreakDate.getTime() - lastStreakDate.getTime() ===
      24 * 60 * 60 * 1000
    ) {
      // Consecutive day
      newStreak = userStreak.current_streak + 1
      streakContinued = true
    } else {
      // Gap - restart streak
      newStreak = 1
    }
  }

  const newLongest = Math.max(newStreak, userStreak.longest_streak)
  const hitMilestone = streakContinued && isAtMilestone(newStreak)

  // Update database
  await execute(`
    UPDATE user_streaks
    SET current_streak = $2,
        longest_streak = $3,
        last_completed_date = NOW(),
        updated_at = NOW()
    WHERE user_id = $1
  `, [userId, newStreak, newLongest])

  return NextResponse.json({
    success: true,
    action: "streak_updated",
    streak: {
      current: newStreak,
      longest: newLongest,
      isActive: true,
      continued: streakContinued,
    },
    milestone: hitMilestone
      ? { reached: newStreak, message: `Félicitations ! ${newStreak} jours de streak !` }
      : null,
    message: streakContinued
      ? `Streak continué ! ${newStreak} jours consécutifs.`
      : newStreak === 1
      ? "Nouveau streak démarré !"
      : `${newStreak} jours de streak !`,
  })
}
