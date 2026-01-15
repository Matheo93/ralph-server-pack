/**
 * Streak Status API
 *
 * GET: Get current user's streak status
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import {
  calculateStreak,
  buildStreakHistory,
  getMilestoneProgress,
  getStreakDate,
} from "@/lib/streak/calculator"

interface UserStreak {
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  joker_last_used: string | null
  is_premium: boolean
}

/**
 * GET /api/streak/status
 * Get current user's streak status and history
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const daysBack = Math.min(parseInt(searchParams.get("days") ?? "30"), 90)

  // Get user's streak record
  let userStreak = await queryOne<UserStreak>(`
    SELECT
      current_streak,
      longest_streak,
      last_completed_date,
      joker_last_used,
      COALESCE(u.is_premium, false) as is_premium
    FROM user_streaks us
    LEFT JOIN users u ON u.id = us.user_id
    WHERE us.user_id = $1
  `, [userId])

  // Create default if not exists
  if (!userStreak) {
    userStreak = {
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      joker_last_used: null,
      is_premium: false,
    }
  }

  // Get task completions for history
  const completions = await query<{
    completed_date: string
    task_count: number
  }>(`
    SELECT
      DATE(completed_at) as completed_date,
      COUNT(*)::int as task_count
    FROM tasks
    WHERE assigned_to = $1
      AND completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '${daysBack} days'
    GROUP BY DATE(completed_at)
    ORDER BY completed_date DESC
  `, [userId])

  // Get completion dates for streak calculation
  const completedDates = completions.map((c) => new Date(c.completed_date))

  // Calculate streak
  const streakStatus = calculateStreak(completedDates, {
    gracePeriodHours: 4,
    isPremium: userStreak.is_premium,
    jokerResetDays: 7,
  })

  // Build history
  const history = buildStreakHistory(
    completions.map((c) => ({
      date: new Date(c.completed_date),
      count: c.task_count,
    })),
    daysBack,
    { minTasksPerDay: 1, gracePeriodHours: 4 }
  )

  // Get milestone progress
  const milestone = getMilestoneProgress(streakStatus.currentStreak)

  // Calculate joker availability
  const jokerDaysRemaining = userStreak.joker_last_used
    ? Math.max(0, 7 - getDaysSince(new Date(userStreak.joker_last_used)))
    : 0

  return NextResponse.json({
    streak: {
      current: streakStatus.currentStreak,
      longest: Math.max(streakStatus.longestStreak, userStreak.longest_streak),
      isActive: streakStatus.isActive,
      expiresAt: streakStatus.expiresAt?.toISOString() ?? null,
      lastCompletedDate: streakStatus.lastCompletedDate?.toISOString() ?? null,
    },
    milestone: {
      next: milestone.nextMilestone,
      progress: milestone.progress,
      daysRemaining: milestone.daysRemaining,
    },
    joker: {
      available: userStreak.is_premium && jokerDaysRemaining === 0,
      isPremium: userStreak.is_premium,
      daysUntilReset: jokerDaysRemaining,
      lastUsed: userStreak.joker_last_used,
    },
    history: {
      days: history.days.slice(-daysBack).map((d) => ({
        date: d.date.toISOString().split("T")[0],
        tasksCompleted: d.tasksCompleted,
        isComplete: d.isComplete,
        jokerUsed: d.jokerUsed,
      })),
      totalDaysCompleted: history.totalDaysCompleted,
      totalJokersUsed: history.totalJokersUsed,
      averageTasksPerDay: history.averageTasksPerDay,
    },
  })
}

function getDaysSince(date: Date): number {
  const now = new Date()
  const d = new Date(date)
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
}
