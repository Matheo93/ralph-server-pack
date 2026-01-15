import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import {
  scheduleTaskNotifications,
  cancelTaskNotifications,
  getUserNotificationStats,
  rescheduleNotification,
} from "@/lib/services/notification-scheduler"

const ScheduleTaskSchema = z.object({
  taskId: z.string().uuid(),
  config: z.object({
    dayBefore: z.boolean().optional(),
    dayOf: z.boolean().optional(),
    threeHoursBefore: z.boolean().optional(),
    oneHourBefore: z.boolean().optional(),
  }).optional(),
})

const CancelScheduleSchema = z.object({
  taskId: z.string().uuid(),
})

const RescheduleSchema = z.object({
  notificationId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
})

/**
 * POST /api/notifications/schedule
 * Schedule notifications for a task
 */
export async function POST(request: NextRequest) {
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

  const validation = ScheduleTaskSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { taskId, config } = validation.data

  try {
    // Verify user has access to this task
    const task = await queryOne<{ household_id: string }>(`
      SELECT t.household_id
      FROM tasks t
      JOIN household_members hm ON hm.household_id = t.household_id
      WHERE t.id = $1 AND hm.user_id = $2 AND hm.is_active = true
    `, [taskId, userId])

    if (!task) {
      return NextResponse.json(
        { error: "Tâche non trouvée" },
        { status: 404 }
      )
    }

    const result = await scheduleTaskNotifications(taskId, config)

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      message: result.scheduled > 0
        ? `${result.scheduled} rappel(s) programmé(s)`
        : "Aucun rappel à programmer (deadline passée ou trop proche)",
    })
  } catch (error) {
    console.error("Error scheduling notifications:", error)
    return NextResponse.json(
      { error: "Erreur lors de la planification" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/schedule
 * Cancel scheduled notifications for a task
 */
export async function DELETE(request: NextRequest) {
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

  const validation = CancelScheduleSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { taskId } = validation.data

  try {
    // Verify user has access to this task
    const task = await queryOne<{ household_id: string }>(`
      SELECT t.household_id
      FROM tasks t
      JOIN household_members hm ON hm.household_id = t.household_id
      WHERE t.id = $1 AND hm.user_id = $2 AND hm.is_active = true
    `, [taskId, userId])

    if (!task) {
      return NextResponse.json(
        { error: "Tâche non trouvée" },
        { status: 404 }
      )
    }

    const cancelled = await cancelTaskNotifications(taskId)

    return NextResponse.json({
      success: true,
      cancelled,
      message: cancelled > 0
        ? `${cancelled} rappel(s) annulé(s)`
        : "Aucun rappel à annuler",
    })
  } catch (error) {
    console.error("Error cancelling notifications:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'annulation" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/schedule
 * Get user's notification stats
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  try {
    const stats = await getUserNotificationStats(userId)

    // Get pending notifications
    const pending = await query<{
      id: string
      type: string
      title: string
      scheduled_for: string
      task_id: string | null
    }>(`
      SELECT id, type, title, scheduled_for::text, task_id
      FROM notifications
      WHERE user_id = $1 AND is_sent = false
      ORDER BY scheduled_for ASC
      LIMIT 10
    `, [userId])

    return NextResponse.json({
      stats,
      pending,
    })
  } catch (error) {
    console.error("Error getting notification stats:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications/schedule
 * Reschedule a specific notification
 */
export async function PATCH(request: NextRequest) {
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

  const validation = RescheduleSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { notificationId, scheduledFor } = validation.data

  try {
    // Verify user owns this notification
    const notification = await queryOne<{ id: string }>(`
      SELECT id FROM notifications
      WHERE id = $1 AND user_id = $2 AND is_sent = false
    `, [notificationId, userId])

    if (!notification) {
      return NextResponse.json(
        { error: "Notification non trouvée" },
        { status: 404 }
      )
    }

    const success = await rescheduleNotification(
      notificationId,
      new Date(scheduledFor)
    )

    if (!success) {
      return NextResponse.json(
        { error: "Impossible de reprogrammer cette notification" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Notification reprogrammée",
    })
  } catch (error) {
    console.error("Error rescheduling notification:", error)
    return NextResponse.json(
      { error: "Erreur lors de la reprogrammation" },
      { status: 500 }
    )
  }
}
