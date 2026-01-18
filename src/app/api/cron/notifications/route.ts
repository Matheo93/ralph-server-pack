import { NextRequest, NextResponse } from "next/server"
import {
  sendDailyDigest,
  sendStreakAlert,
  sendDeadlineWarning,
  getHouseholdsForDailyDigest,
  getTasksNeedingReminders,
} from "@/lib/services/notifications"
import {
  processScheduledNotifications,
  scheduleStreakRiskNotifications,
  scheduleChargeAlertNotifications,
} from "@/lib/services/notification-scheduler"
import {
  processCalendarReminders,
  scheduleDailyCalendarDigest,
} from "@/lib/services/calendar-reminder-scheduler"
import { query } from "@/lib/aws/database"

// Cron secret to verify requests are legitimate
const CRON_SECRET = process.env["NOTIFICATION_CRON_SECRET"]

interface CronResult {
  type: string
  success: boolean
  details?: Record<string, unknown>
  error?: string
}

// POST /api/cron/notifications
// Body: { type: "daily_digest" | "streak_alert" | "deadline_reminders" | "all" }
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const providedSecret = authHeader?.replace("Bearer ", "")

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const type = body.type || "all"
    const results: CronResult[] = []

    // Daily digest
    if (type === "daily_digest" || type === "all") {
      try {
        const households = await getHouseholdsForDailyDigest()
        let totalSent = 0
        let totalFailed = 0

        for (const householdId of households) {
          const result = await sendDailyDigest(householdId)
          totalSent += result.sent
          totalFailed += result.failed
        }

        results.push({
          type: "daily_digest",
          success: true,
          details: {
            households: households.length,
            sent: totalSent,
            failed: totalFailed,
          },
        })
      } catch (error) {
        results.push({
          type: "daily_digest",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Streak alerts
    if (type === "streak_alert" || type === "all") {
      try {
        // Get all households with active streaks
        const householdsWithStreaks = await query<{ id: string }>(`
          SELECT id FROM households WHERE streak_current > 0
        `)

        let totalSent = 0
        let totalFailed = 0

        for (const household of householdsWithStreaks) {
          const result = await sendStreakAlert(household.id)
          totalSent += result.sent
          totalFailed += result.failed
        }

        results.push({
          type: "streak_alert",
          success: true,
          details: {
            households: householdsWithStreaks.length,
            sent: totalSent,
            failed: totalFailed,
          },
        })
      } catch (error) {
        results.push({
          type: "streak_alert",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Deadline reminders
    if (type === "deadline_reminders" || type === "all") {
      try {
        const tasksToRemind = await getTasksNeedingReminders()
        let sent = 0
        let failed = 0

        for (const { task_id } of tasksToRemind) {
          const success = await sendDeadlineWarning(task_id)
          if (success) {
            sent++
            // Update last_reminder_at
            await query(
              `UPDATE tasks SET last_reminder_at = NOW() WHERE id = $1`,
              [task_id]
            )
          } else {
            failed++
          }
        }

        results.push({
          type: "deadline_reminders",
          success: true,
          details: {
            tasks: tasksToRemind.length,
            sent,
            failed,
          },
        })
      } catch (error) {
        results.push({
          type: "deadline_reminders",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Process scheduled notifications (new scheduler system)
    if (type === "scheduled" || type === "all") {
      try {
        const result = await processScheduledNotifications()
        results.push({
          type: "scheduled",
          success: true,
          details: {
            processed: result.processed,
            sent: result.sent,
            failed: result.failed,
            aggregated: result.aggregated,
          },
        })
      } catch (error) {
        results.push({
          type: "scheduled",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Schedule streak risk notifications (run in evening)
    if (type === "streak_risk" || type === "all") {
      try {
        const result = await scheduleStreakRiskNotifications()
        results.push({
          type: "streak_risk",
          success: true,
          details: {
            scheduled: result.scheduled,
          },
        })
      } catch (error) {
        results.push({
          type: "streak_risk",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Schedule charge alert notifications (run weekly)
    if (type === "charge_alert") {
      try {
        const result = await scheduleChargeAlertNotifications()
        results.push({
          type: "charge_alert",
          success: true,
          details: {
            scheduled: result.scheduled,
          },
        })
      } catch (error) {
        results.push({
          type: "charge_alert",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Process calendar reminders (run every 5 minutes)
    if (type === "calendar_reminders" || type === "all") {
      try {
        const result = await processCalendarReminders()
        results.push({
          type: "calendar_reminders",
          success: true,
          details: {
            processed: result.processed,
            sent: result.sent,
            failed: result.failed,
            webPushSent: result.webPushSent,
          },
        })
      } catch (error) {
        results.push({
          type: "calendar_reminders",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Schedule daily calendar digest (run in morning)
    if (type === "calendar_digest") {
      try {
        const result = await scheduleDailyCalendarDigest()
        results.push({
          type: "calendar_digest",
          success: true,
          details: {
            scheduled: result.scheduled,
          },
        })
      } catch (error) {
        results.push({
          type: "calendar_digest",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error("Notification cron error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// GET /api/cron/notifications - Health check
export async function GET(request: NextRequest) {
  // Verify cron secret if provided
  const authHeader = request.headers.get("authorization")
  const providedSecret = authHeader?.replace("Bearer ", "")

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    types: [
      "daily_digest",
      "streak_alert",
      "deadline_reminders",
      "scheduled",
      "streak_risk",
      "charge_alert",
      "calendar_reminders",
      "calendar_digest",
      "all",
    ],
  })
}
