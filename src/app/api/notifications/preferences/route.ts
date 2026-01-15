import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, insert } from "@/lib/aws/database"
import { z } from "zod"

const NotificationPreferencesSchema = z.object({
  // Email preferences
  emailEnabled: z.boolean().optional(),
  dailyReminderEnabled: z.boolean().optional(),
  dailyReminderTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis").optional(),
  weeklySummaryEnabled: z.boolean().optional(),
  weeklySummaryDay: z.enum(["monday", "sunday"]).optional(),

  // Push preferences
  pushEnabled: z.boolean().optional(),
  taskReminderPush: z.boolean().optional(),
  deadlineWarningPush: z.boolean().optional(),
  streakRiskPush: z.boolean().optional(),
  chargeAlertPush: z.boolean().optional(),
  taskCompletedPush: z.boolean().optional(),

  // Timing preferences
  reminderBeforeDeadlineHours: z.number().min(1).max(72).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis").optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis").optional(),
})

interface UserPreferences {
  id: string
  user_id: string
  email_enabled: boolean
  daily_reminder_enabled: boolean
  daily_reminder_time: string
  weekly_summary_enabled: boolean
  weekly_summary_day: string
  push_enabled: boolean
  task_reminder_push: boolean
  deadline_warning_push: boolean
  streak_risk_push: boolean
  charge_alert_push: boolean
  task_completed_push: boolean
  reminder_before_deadline_hours: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, "id" | "user_id"> = {
  email_enabled: true,
  daily_reminder_enabled: true,
  daily_reminder_time: "08:00",
  weekly_summary_enabled: true,
  weekly_summary_day: "sunday",
  push_enabled: true,
  task_reminder_push: true,
  deadline_warning_push: true,
  streak_risk_push: true,
  charge_alert_push: true,
  task_completed_push: false,
  reminder_before_deadline_hours: 24,
  quiet_hours_start: null,
  quiet_hours_end: null,
}

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  try {
    const preferences = await queryOne<UserPreferences>(`
      SELECT * FROM user_preferences
      WHERE user_id = $1
    `, [userId])

    if (!preferences) {
      // Return defaults if no preferences set
      return NextResponse.json({
        preferences: {
          emailEnabled: DEFAULT_PREFERENCES.email_enabled,
          dailyReminderEnabled: DEFAULT_PREFERENCES.daily_reminder_enabled,
          dailyReminderTime: DEFAULT_PREFERENCES.daily_reminder_time,
          weeklySummaryEnabled: DEFAULT_PREFERENCES.weekly_summary_enabled,
          weeklySummaryDay: DEFAULT_PREFERENCES.weekly_summary_day,
          pushEnabled: DEFAULT_PREFERENCES.push_enabled,
          taskReminderPush: DEFAULT_PREFERENCES.task_reminder_push,
          deadlineWarningPush: DEFAULT_PREFERENCES.deadline_warning_push,
          streakRiskPush: DEFAULT_PREFERENCES.streak_risk_push,
          chargeAlertPush: DEFAULT_PREFERENCES.charge_alert_push,
          taskCompletedPush: DEFAULT_PREFERENCES.task_completed_push,
          reminderBeforeDeadlineHours: DEFAULT_PREFERENCES.reminder_before_deadline_hours,
          quietHoursStart: DEFAULT_PREFERENCES.quiet_hours_start,
          quietHoursEnd: DEFAULT_PREFERENCES.quiet_hours_end,
        },
        isDefault: true,
      })
    }

    return NextResponse.json({
      preferences: {
        emailEnabled: preferences.email_enabled,
        dailyReminderEnabled: preferences.daily_reminder_enabled,
        dailyReminderTime: preferences.daily_reminder_time,
        weeklySummaryEnabled: preferences.weekly_summary_enabled,
        weeklySummaryDay: preferences.weekly_summary_day,
        pushEnabled: preferences.push_enabled,
        taskReminderPush: preferences.task_reminder_push,
        deadlineWarningPush: preferences.deadline_warning_push,
        streakRiskPush: preferences.streak_risk_push,
        chargeAlertPush: preferences.charge_alert_push,
        taskCompletedPush: preferences.task_completed_push,
        reminderBeforeDeadlineHours: preferences.reminder_before_deadline_hours,
        quietHoursStart: preferences.quiet_hours_start,
        quietHoursEnd: preferences.quiet_hours_end,
      },
      isDefault: false,
    })
  } catch (error) {
    console.error("Error getting notification preferences:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des préférences" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
export async function PUT(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = NotificationPreferencesSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const updates = validation.data

  try {
    // Check if user has existing preferences
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM user_preferences WHERE user_id = $1
    `, [userId])

    if (existing) {
      // Build update query dynamically
      const updateFields: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (updates.emailEnabled !== undefined) {
        updateFields.push(`email_enabled = $${paramIndex++}`)
        values.push(updates.emailEnabled)
      }
      if (updates.dailyReminderEnabled !== undefined) {
        updateFields.push(`daily_reminder_enabled = $${paramIndex++}`)
        values.push(updates.dailyReminderEnabled)
      }
      if (updates.dailyReminderTime !== undefined) {
        updateFields.push(`daily_reminder_time = $${paramIndex++}`)
        values.push(updates.dailyReminderTime)
      }
      if (updates.weeklySummaryEnabled !== undefined) {
        updateFields.push(`weekly_summary_enabled = $${paramIndex++}`)
        values.push(updates.weeklySummaryEnabled)
      }
      if (updates.weeklySummaryDay !== undefined) {
        updateFields.push(`weekly_summary_day = $${paramIndex++}`)
        values.push(updates.weeklySummaryDay)
      }
      if (updates.pushEnabled !== undefined) {
        updateFields.push(`push_enabled = $${paramIndex++}`)
        values.push(updates.pushEnabled)
      }
      if (updates.taskReminderPush !== undefined) {
        updateFields.push(`task_reminder_push = $${paramIndex++}`)
        values.push(updates.taskReminderPush)
      }
      if (updates.deadlineWarningPush !== undefined) {
        updateFields.push(`deadline_warning_push = $${paramIndex++}`)
        values.push(updates.deadlineWarningPush)
      }
      if (updates.streakRiskPush !== undefined) {
        updateFields.push(`streak_risk_push = $${paramIndex++}`)
        values.push(updates.streakRiskPush)
      }
      if (updates.chargeAlertPush !== undefined) {
        updateFields.push(`charge_alert_push = $${paramIndex++}`)
        values.push(updates.chargeAlertPush)
      }
      if (updates.taskCompletedPush !== undefined) {
        updateFields.push(`task_completed_push = $${paramIndex++}`)
        values.push(updates.taskCompletedPush)
      }
      if (updates.reminderBeforeDeadlineHours !== undefined) {
        updateFields.push(`reminder_before_deadline_hours = $${paramIndex++}`)
        values.push(updates.reminderBeforeDeadlineHours)
      }
      if (updates.quietHoursStart !== undefined) {
        updateFields.push(`quiet_hours_start = $${paramIndex++}`)
        values.push(updates.quietHoursStart)
      }
      if (updates.quietHoursEnd !== undefined) {
        updateFields.push(`quiet_hours_end = $${paramIndex++}`)
        values.push(updates.quietHoursEnd)
      }

      updateFields.push(`updated_at = NOW()`)

      if (updateFields.length > 1) {
        await query(`
          UPDATE user_preferences
          SET ${updateFields.join(", ")}
          WHERE user_id = $${paramIndex}
        `, [...values, userId])
      }
    } else {
      // Insert new preferences
      await insert("user_preferences", {
        user_id: userId,
        email_enabled: updates.emailEnabled ?? DEFAULT_PREFERENCES.email_enabled,
        daily_reminder_enabled: updates.dailyReminderEnabled ?? DEFAULT_PREFERENCES.daily_reminder_enabled,
        daily_reminder_time: updates.dailyReminderTime ?? DEFAULT_PREFERENCES.daily_reminder_time,
        weekly_summary_enabled: updates.weeklySummaryEnabled ?? DEFAULT_PREFERENCES.weekly_summary_enabled,
        weekly_summary_day: updates.weeklySummaryDay ?? DEFAULT_PREFERENCES.weekly_summary_day,
        push_enabled: updates.pushEnabled ?? DEFAULT_PREFERENCES.push_enabled,
        task_reminder_push: updates.taskReminderPush ?? DEFAULT_PREFERENCES.task_reminder_push,
        deadline_warning_push: updates.deadlineWarningPush ?? DEFAULT_PREFERENCES.deadline_warning_push,
        streak_risk_push: updates.streakRiskPush ?? DEFAULT_PREFERENCES.streak_risk_push,
        charge_alert_push: updates.chargeAlertPush ?? DEFAULT_PREFERENCES.charge_alert_push,
        task_completed_push: updates.taskCompletedPush ?? DEFAULT_PREFERENCES.task_completed_push,
        reminder_before_deadline_hours: updates.reminderBeforeDeadlineHours ?? DEFAULT_PREFERENCES.reminder_before_deadline_hours,
        quiet_hours_start: updates.quietHoursStart ?? DEFAULT_PREFERENCES.quiet_hours_start,
        quiet_hours_end: updates.quietHoursEnd ?? DEFAULT_PREFERENCES.quiet_hours_end,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Préférences mises à jour",
    })
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des préférences" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/preferences/reset
 * Reset to default preferences
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  if (!url.pathname.endsWith("/reset")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  try {
    await query(`
      DELETE FROM user_preferences WHERE user_id = $1
    `, [userId])

    return NextResponse.json({
      success: true,
      message: "Préférences réinitialisées",
    })
  } catch (error) {
    console.error("Error resetting notification preferences:", error)
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation" },
      { status: 500 }
    )
  }
}
