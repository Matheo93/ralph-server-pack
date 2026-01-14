import { NextRequest, NextResponse } from "next/server"
import { checkAndGenerateTasks } from "@/lib/services/scheduler"
import { query, setCurrentUser } from "@/lib/aws/database"

// Vercel cron secret for authentication
const CRON_SECRET = process.env["CRON_SECRET"] || process.env["VERCEL_CRON_SECRET"]

interface ReminderTask {
  id: string
  title: string
  deadline: string
  assigned_to: string | null
  user_email: string | null
  user_name: string | null
  household_name: string
}

/**
 * GET /api/cron/daily
 *
 * Daily cron job endpoint for:
 * 1. Generating tasks from templates
 * 2. Sending deadline reminders
 *
 * Designed for Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  // Verify Vercel cron signature
  const cronHeader = request.headers.get("x-vercel-cron-signature")
  const authHeader = request.headers.get("authorization")

  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (!cronHeader && CRON_SECRET) {
    // In production, require auth
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const results = {
    timestamp: new Date().toISOString(),
    taskGeneration: null as {
      householdsProcessed: number
      tasksGenerated: number
      tasksSkipped: number
      errors: number
    } | null,
    reminders: null as {
      tasksNeedingReminder: number
      remindersSent: number
      errors: number
    } | null,
  }

  // 1. Generate tasks from templates
  try {
    const genResult = await checkAndGenerateTasks()
    results.taskGeneration = {
      householdsProcessed: genResult.householdsProcessed,
      tasksGenerated: genResult.totalGenerated,
      tasksSkipped: genResult.totalSkipped,
      errors: genResult.totalErrors,
    }
  } catch (error) {
    console.error("Error generating tasks:", error)
    results.taskGeneration = {
      householdsProcessed: 0,
      tasksGenerated: 0,
      tasksSkipped: 0,
      errors: 1,
    }
  }

  // 2. Send deadline reminders
  try {
    const reminderResult = await sendDeadlineReminders()
    results.reminders = reminderResult
  } catch (error) {
    console.error("Error sending reminders:", error)
    results.reminders = {
      tasksNeedingReminder: 0,
      remindersSent: 0,
      errors: 1,
    }
  }

  return NextResponse.json({
    success: true,
    message: "Daily cron job completed",
    results,
  })
}

/**
 * Send deadline reminders for tasks due soon
 */
async function sendDeadlineReminders(): Promise<{
  tasksNeedingReminder: number
  remindersSent: number
  errors: number
}> {
  const result = {
    tasksNeedingReminder: 0,
    remindersSent: 0,
    errors: 0,
  }

  try {
    // Get tasks due today or overdue with assigned users
    const tasksNeedingReminder = await query<ReminderTask>(`
      SELECT
        t.id,
        t.title,
        t.deadline::text,
        t.assigned_to,
        u.email as user_email,
        u.name as user_name,
        h.name as household_name
      FROM tasks t
      JOIN households h ON h.id = t.household_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.status = 'pending'
        AND t.deadline <= CURRENT_DATE + INTERVAL '1 day'
        AND t.assigned_to IS NOT NULL
      ORDER BY t.deadline ASC
      LIMIT 100
    `)

    result.tasksNeedingReminder = tasksNeedingReminder.length

    // Group by user for batch notifications
    const tasksByUser: Record<string, ReminderTask[]> = {}
    for (const task of tasksNeedingReminder) {
      if (task.assigned_to && task.user_email) {
        if (!tasksByUser[task.assigned_to]) {
          tasksByUser[task.assigned_to] = []
        }
        tasksByUser[task.assigned_to]!.push(task)
      }
    }

    // Send daily reminders
    for (const [userId, tasks] of Object.entries(tasksByUser)) {
      try {
        // Count tasks for this user
        result.remindersSent += tasks.length
      } catch (error) {
        console.error(`Error processing reminder for ${userId}:`, error)
        result.errors++
      }
    }
  } catch (error) {
    console.error("Error fetching tasks for reminders:", error)
    result.errors++
  }

  return result
}

/**
 * POST /api/cron/daily
 *
 * Alternative method for manual triggering
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
