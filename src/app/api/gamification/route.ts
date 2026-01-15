/**
 * Gamification API Route
 *
 * Endpoints:
 * - GET: Get streak status, achievements, and leaderboard
 * - POST: Use joker
 * - PUT: Update displayed badges
 * - PATCH: Record activity
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, queryOne } from "@/lib/aws/database"
import { getCurrentUser } from "@/lib/aws/cognito"
import {
  // Streak
  calculateStreakStatus,
  calculateHouseholdStreak,
  createDailyActivity,
  getStreakMessage,
  getHouseholdStreakMessage,
  formatStreakDisplay,
  getStreakMilestone,
  calculateStreakPoints,
  DEFAULT_STREAK_CONFIG,
  type DailyActivity,
  type StreakStatus,
  // Joker
  createJokerInventory,
  useJoker,
  allocateMonthlyJokers,
  formatJokerInventory,
  getJokerSuggestion,
  DEFAULT_JOKER_CONFIG,
  type JokerInventory,
  // Achievements
  createUserAchievements,
  updateAchievementsFromStats,
  getNextAchievements,
  formatAchievementsSummary,
  formatAchievement,
  ACHIEVEMENT_DEFINITIONS,
  type UserAchievements,
  // Leaderboard
  generateFamilyLeaderboard,
  formatLeaderboardEntry,
  formatLeaderboardSummary,
  type LeaderboardPeriod,
  type LeaderboardCategory,
  type UserStats,
} from "@/lib/gamification"

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const GetQuerySchema = z.object({
  include: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.split(",").filter(Boolean) : ["streak", "achievements", "leaderboard"]
    ),
  leaderboardPeriod: z.enum(["week", "month", "all_time"]).optional().default("week"),
  leaderboardCategory: z
    .enum(["points", "tasks", "streak", "balance", "team_contribution"])
    .optional()
    .default("points"),
})

const UseJokerBodySchema = z.object({
  jokerId: z.string().optional(),
})

const UpdateBadgesBodySchema = z.object({
  displayedBadges: z.array(z.string()).max(5),
})

const RecordActivityBodySchema = z.object({
  tasksCompleted: z.number().min(0),
  criticalTasksCompleted: z.number().min(0).default(0),
  totalWeight: z.number().min(0),
  date: z.coerce.date().optional(),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUserActivities(userId: string, days: number = 90): Promise<DailyActivity[]> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const rows = await query<{
    activity_date: string
    tasks_completed: number
    critical_tasks_completed: number
    total_weight: number
    was_active_day: boolean
  }>(
    `
    SELECT activity_date, tasks_completed, critical_tasks_completed, total_weight, was_active_day
    FROM user_daily_activities
    WHERE user_id = $1 AND activity_date >= $2
    ORDER BY activity_date DESC
  `,
    [userId, cutoffDate]
  )

  return rows.map((row) => ({
    date: new Date(row.activity_date),
    userId,
    tasksCompleted: row.tasks_completed,
    criticalTasksCompleted: row.critical_tasks_completed,
    totalWeight: row.total_weight,
    wasActiveDay: row.was_active_day,
  }))
}

async function getHouseholdMemberActivities(
  householdId: string,
  days: number = 90
): Promise<Map<string, DailyActivity[]>> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const rows = await query<{
    user_id: string
    activity_date: string
    tasks_completed: number
    critical_tasks_completed: number
    total_weight: number
    was_active_day: boolean
  }>(
    `
    SELECT uda.user_id, uda.activity_date, uda.tasks_completed,
           uda.critical_tasks_completed, uda.total_weight, uda.was_active_day
    FROM user_daily_activities uda
    JOIN household_members hm ON hm.user_id = uda.user_id
    WHERE hm.household_id = $1 AND uda.activity_date >= $2
    ORDER BY uda.activity_date DESC
  `,
    [householdId, cutoffDate]
  )

  const result = new Map<string, DailyActivity[]>()

  for (const row of rows) {
    const activity: DailyActivity = {
      date: new Date(row.activity_date),
      userId: row.user_id,
      tasksCompleted: row.tasks_completed,
      criticalTasksCompleted: row.critical_tasks_completed,
      totalWeight: row.total_weight,
      wasActiveDay: row.was_active_day,
    }

    if (!result.has(row.user_id)) {
      result.set(row.user_id, [])
    }
    result.get(row.user_id)!.push(activity)
  }

  return result
}

async function getUserJokerInventory(userId: string): Promise<JokerInventory> {
  const row = await queryOne<{
    inventory_data: string
  }>(
    `
    SELECT inventory_data FROM user_joker_inventories WHERE user_id = $1
  `,
    [userId]
  )

  if (!row) {
    return createJokerInventory(userId)
  }

  try {
    return JSON.parse(row.inventory_data)
  } catch {
    return createJokerInventory(userId)
  }
}

async function getUserAchievementsData(userId: string): Promise<UserAchievements> {
  const row = await queryOne<{
    achievements_data: string
  }>(
    `
    SELECT achievements_data FROM user_achievements WHERE user_id = $1
  `,
    [userId]
  )

  if (!row) {
    return createUserAchievements(userId)
  }

  try {
    return JSON.parse(row.achievements_data)
  } catch {
    return createUserAchievements(userId)
  }
}

async function getHouseholdMemberStats(
  householdId: string,
  period: LeaderboardPeriod
): Promise<UserStats[]> {
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()

  if (period === "week") {
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === "month") {
    startDate.setDate(startDate.getDate() - 30)
  } else {
    startDate.setFullYear(2000) // All time
  }

  const rows = await query<{
    user_id: string
    user_name: string
    tasks_completed: number
    critical_tasks_completed: number
    total_weight: number
    current_streak: number
    longest_streak: number
    total_points: number
    average_balance_score: number
    badges: string
  }>(
    `
    SELECT
      u.id as user_id,
      u.name as user_name,
      COALESCE(SUM(uda.tasks_completed), 0)::int as tasks_completed,
      COALESCE(SUM(uda.critical_tasks_completed), 0)::int as critical_tasks_completed,
      COALESCE(SUM(uda.total_weight), 0)::float as total_weight,
      COALESCE(us.current_streak, 0)::int as current_streak,
      COALESCE(us.longest_streak, 0)::int as longest_streak,
      COALESCE(ua.total_points, 0)::int as total_points,
      COALESCE(us.average_balance_score, 50)::float as average_balance_score,
      COALESCE(ua.displayed_badges, '[]') as badges
    FROM users u
    JOIN household_members hm ON hm.user_id = u.id
    LEFT JOIN user_daily_activities uda ON uda.user_id = u.id AND uda.activity_date BETWEEN $2 AND $3
    LEFT JOIN user_streaks us ON us.user_id = u.id
    LEFT JOIN user_achievements ua ON ua.user_id = u.id
    WHERE hm.household_id = $1
    GROUP BY u.id, u.name, us.current_streak, us.longest_streak, us.average_balance_score, ua.total_points, ua.displayed_badges
  `,
    [householdId, startDate, endDate]
  )

  return rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
    tasksCompleted: row.tasks_completed,
    criticalTasksCompleted: row.critical_tasks_completed,
    totalWeight: row.total_weight,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    totalPoints: row.total_points,
    averageBalanceScore: row.average_balance_score,
    badges: (() => {
      try {
        return JSON.parse(row.badges)
      } catch {
        return []
      }
    })(),
  }))
}

// =============================================================================
// GET: Retrieve gamification data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryResult = GetQuerySchema.safeParse({
      include: searchParams.get("include"),
      leaderboardPeriod: searchParams.get("leaderboardPeriod"),
      leaderboardCategory: searchParams.get("leaderboardCategory"),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: queryResult.error.issues },
        { status: 400 }
      )
    }

    const { include, leaderboardPeriod, leaderboardCategory } = queryResult.data

    // Get user's household
    const householdMember = await queryOne<{ household_id: string }>(
      `SELECT household_id FROM household_members WHERE user_id = $1`,
      [user.id]
    )

    if (!householdMember) {
      return NextResponse.json({ error: "Aucun foyer trouvé" }, { status: 404 })
    }

    const householdId = householdMember.household_id
    const result: Record<string, unknown> = {}

    // Get streak data
    if (include.includes("streak")) {
      const activities = await getUserActivities(user.id)
      const streakStatus = calculateStreakStatus(user.id, activities, DEFAULT_STREAK_CONFIG)

      // Get household streak
      const memberActivities = await getHouseholdMemberActivities(householdId)
      const householdStreak = calculateHouseholdStreak(
        householdId,
        memberActivities,
        DEFAULT_STREAK_CONFIG
      )

      const milestone = getStreakMilestone(streakStatus.currentStreak)

      result["streak"] = {
        user: {
          ...streakStatus,
          display: formatStreakDisplay(streakStatus),
          message: getStreakMessage(streakStatus),
          milestone,
        },
        household: {
          ...householdStreak,
          message: getHouseholdStreakMessage(householdStreak),
        },
      }
    }

    // Get joker data
    if (include.includes("jokers")) {
      const inventory = await getUserJokerInventory(user.id)

      // Check for monthly allocation
      let updatedInventory = inventory
      const isPremium = false // TODO: Get from subscription status

      const allocationResult = allocateMonthlyJokers(
        inventory,
        isPremium,
        DEFAULT_JOKER_CONFIG
      )

      if (allocationResult.result.allocated) {
        updatedInventory = allocationResult.inventory
        // TODO: Save updated inventory to database
      }

      // Get streak status for suggestion
      const activities = await getUserActivities(user.id)
      const streakStatus = calculateStreakStatus(user.id, activities, DEFAULT_STREAK_CONFIG)

      result["jokers"] = {
        ...formatJokerInventory(updatedInventory),
        suggestion: getJokerSuggestion(updatedInventory, streakStatus),
        allocationResult: allocationResult.result.allocated
          ? allocationResult.result
          : null,
      }
    }

    // Get achievements data
    if (include.includes("achievements")) {
      const achievements = await getUserAchievementsData(user.id)

      // Get activities for stats update
      const activities = await getUserActivities(user.id)
      const streakStatus = calculateStreakStatus(user.id, activities, DEFAULT_STREAK_CONFIG)

      // Calculate total stats
      const totalTasks = activities.reduce((sum, a) => sum + a.tasksCompleted, 0)
      const totalCritical = activities.reduce((sum, a) => sum + a.criticalTasksCompleted, 0)

      // Update achievements with current stats
      const { achievements: updated, notifications } = updateAchievementsFromStats(
        achievements,
        {
          currentStreak: streakStatus.currentStreak,
          totalTasksCompleted: totalTasks,
          criticalTasksCompleted: totalCritical,
        }
      )

      // TODO: Save updated achievements to database if changed

      const summary = formatAchievementsSummary(updated)
      const nextAchievements = getNextAchievements(updated, 3)

      result["achievements"] = {
        summary,
        next: nextAchievements.map(({ definition, progress }) =>
          formatAchievement(definition, progress)
        ),
        recent: updated.recentUnlocks.slice(0, 5).map((unlock) => ({
          ...unlock,
          definition: ACHIEVEMENT_DEFINITIONS[unlock.achievementId],
        })),
        notifications: notifications.length > 0 ? notifications : null,
      }
    }

    // Get leaderboard data
    if (include.includes("leaderboard")) {
      const memberStats = await getHouseholdMemberStats(
        householdId,
        leaderboardPeriod as LeaderboardPeriod
      )

      const leaderboard = generateFamilyLeaderboard(
        householdId,
        memberStats,
        leaderboardCategory as LeaderboardCategory,
        leaderboardPeriod as LeaderboardPeriod,
        user.id
      )

      result["leaderboard"] = {
        ...formatLeaderboardSummary(leaderboard),
        entries: leaderboard.entries.map(formatLeaderboardEntry),
        currentUserRank: leaderboard.entries.find((e) => e.isCurrentUser)?.rank ?? null,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Gamification GET error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// =============================================================================
// POST: Use a joker
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const bodyResult = UseJokerBodySchema.safeParse(body)

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: bodyResult.error.issues },
        { status: 400 }
      )
    }

    const { jokerId } = bodyResult.data

    // Get current streak status
    const activities = await getUserActivities(user.id)
    const streakStatus = calculateStreakStatus(user.id, activities, DEFAULT_STREAK_CONFIG)

    // Get joker inventory
    const inventory = await getUserJokerInventory(user.id)

    // Use joker
    const { inventory: updatedInventory, result } = useJoker(
      inventory,
      streakStatus,
      jokerId
    )

    if (result.success) {
      // Save updated inventory
      await query(
        `
        INSERT INTO user_joker_inventories (user_id, inventory_data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET inventory_data = $2, updated_at = NOW()
      `,
        [user.id, JSON.stringify(updatedInventory)]
      )
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      streakPreserved: result.streakPreserved,
      remainingJokers: result.remainingJokers,
      inventory: formatJokerInventory(updatedInventory),
    })
  } catch (error) {
    console.error("Gamification POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// =============================================================================
// PUT: Update displayed badges
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const bodyResult = UpdateBadgesBodySchema.safeParse(body)

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: bodyResult.error.issues },
        { status: 400 }
      )
    }

    const { displayedBadges } = bodyResult.data

    // Verify all badges are valid achievement IDs
    const invalidBadges = displayedBadges.filter(
      (id) => !ACHIEVEMENT_DEFINITIONS[id]
    )

    if (invalidBadges.length > 0) {
      return NextResponse.json(
        { error: "Badges invalides", invalidBadges },
        { status: 400 }
      )
    }

    // Get current achievements
    const achievements = await getUserAchievementsData(user.id)

    // Verify badges are unlocked
    const lockedBadges = displayedBadges.filter((id) => {
      const progress = achievements.progress.find((p) => p.achievementId === id)
      return !progress || progress.unlockedAt === null
    })

    if (lockedBadges.length > 0) {
      return NextResponse.json(
        { error: "Certains badges ne sont pas débloqués", lockedBadges },
        { status: 400 }
      )
    }

    // Update displayed badges
    const updatedAchievements: UserAchievements = {
      ...achievements,
      displayedBadges,
    }

    await query(
      `
      UPDATE user_achievements
      SET achievements_data = $2, displayed_badges = $3, updated_at = NOW()
      WHERE user_id = $1
    `,
      [user.id, JSON.stringify(updatedAchievements), JSON.stringify(displayedBadges)]
    )

    return NextResponse.json({
      success: true,
      displayedBadges,
      message: "Badges mis à jour",
    })
  } catch (error) {
    console.error("Gamification PUT error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// =============================================================================
// PATCH: Record daily activity
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const bodyResult = RecordActivityBodySchema.safeParse(body)

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: bodyResult.error.issues },
        { status: 400 }
      )
    }

    const { tasksCompleted, criticalTasksCompleted, totalWeight, date } = bodyResult.data
    const activityDate = date ?? new Date()

    // Create activity record
    const activity = createDailyActivity(
      user.id,
      activityDate,
      tasksCompleted,
      criticalTasksCompleted,
      totalWeight,
      DEFAULT_STREAK_CONFIG
    )

    // Upsert activity
    await query(
      `
      INSERT INTO user_daily_activities (
        user_id, activity_date, tasks_completed, critical_tasks_completed,
        total_weight, was_active_day, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, activity_date)
      DO UPDATE SET
        tasks_completed = user_daily_activities.tasks_completed + $3,
        critical_tasks_completed = user_daily_activities.critical_tasks_completed + $4,
        total_weight = user_daily_activities.total_weight + $5,
        was_active_day = CASE
          WHEN user_daily_activities.tasks_completed + $3 >= $7
           AND user_daily_activities.total_weight + $5 >= $8
          THEN true
          ELSE user_daily_activities.was_active_day
        END,
        updated_at = NOW()
    `,
      [
        user.id,
        activityDate,
        tasksCompleted,
        criticalTasksCompleted,
        totalWeight,
        activity.wasActiveDay,
        DEFAULT_STREAK_CONFIG.minTasksForActiveDay,
        DEFAULT_STREAK_CONFIG.minWeightForActiveDay,
      ]
    )

    // Get updated streak status
    const activities = await getUserActivities(user.id)
    const previousStreak = activities.length > 1
      ? calculateStreakStatus(user.id, activities.slice(1), DEFAULT_STREAK_CONFIG)
      : { currentStreak: 0, longestStreak: 0 } as StreakStatus

    const currentStreak = calculateStreakStatus(user.id, activities, DEFAULT_STREAK_CONFIG)

    // Calculate streak points
    const points = calculateStreakPoints(
      previousStreak.currentStreak,
      currentStreak.currentStreak
    )

    // Update achievements
    const achievements = await getUserAchievementsData(user.id)
    const totalTasks = activities.reduce((sum, a) => sum + a.tasksCompleted, 0)
    const totalCritical = activities.reduce((sum, a) => sum + a.criticalTasksCompleted, 0)

    const { achievements: updatedAchievements, notifications } = updateAchievementsFromStats(
      achievements,
      {
        currentStreak: currentStreak.currentStreak,
        totalTasksCompleted: totalTasks,
        criticalTasksCompleted: totalCritical,
      }
    )

    // Save updated achievements if there are changes
    if (notifications.length > 0) {
      await query(
        `
        INSERT INTO user_achievements (user_id, achievements_data, total_points, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET achievements_data = $2, total_points = $3, updated_at = NOW()
      `,
        [user.id, JSON.stringify(updatedAchievements), updatedAchievements.totalPoints]
      )
    }

    return NextResponse.json({
      success: true,
      activity: {
        date: activityDate,
        tasksCompleted,
        criticalTasksCompleted,
        totalWeight,
        wasActiveDay: activity.wasActiveDay,
      },
      streak: {
        current: currentStreak.currentStreak,
        previous: previousStreak.currentStreak,
        change: currentStreak.currentStreak - previousStreak.currentStreak,
        message: getStreakMessage(currentStreak),
      },
      points,
      achievements: {
        notifications,
        totalPoints: updatedAchievements.totalPoints,
      },
    })
  } catch (error) {
    console.error("Gamification PATCH error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
