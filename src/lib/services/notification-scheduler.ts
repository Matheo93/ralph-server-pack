import { query, queryOne, insert } from "@/lib/aws/database"
import {
  sendMultiplePush,
  sendStreakRiskPush,
  sendDeadlineWarningPush,
  isFirebaseConfigured,
  type NotificationType,
} from "@/lib/firebase"
import { sendPushToUser, sendPushToHousehold } from "./notifications"

/**
 * Notification schedule configuration
 */
interface ScheduleConfig {
  /** J-1 reminder: 24 hours before deadline */
  dayBefore: boolean
  /** J-0 reminder: morning of the deadline day */
  dayOf: boolean
  /** H-3 reminder: 3 hours before deadline */
  threeHoursBefore: boolean
  /** H-1 reminder: 1 hour before deadline (critical tasks only) */
  oneHourBefore: boolean
}

const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  dayBefore: true,
  dayOf: true,
  threeHoursBefore: true,
  oneHourBefore: true,
}

/**
 * Scheduled notification record
 */
interface ScheduledNotification {
  id: string
  user_id: string
  task_id: string | null
  household_id: string | null
  type: NotificationType
  title: string
  body: string
  scheduled_for: string
  sent_at: string | null
  is_aggregated: boolean
  aggregation_key: string | null
}

/**
 * Task with deadline info for scheduling
 */
interface TaskWithDeadline {
  id: string
  title: string
  deadline: string
  is_critical: boolean
  assigned_to: string | null
  created_by: string
  household_id: string
}

// ============================================================
// SCHEDULE NOTIFICATIONS FOR TASK
// ============================================================

/**
 * Schedule all reminder notifications for a task based on its deadline
 */
export async function scheduleTaskNotifications(
  taskId: string,
  config: Partial<ScheduleConfig> = {}
): Promise<{ scheduled: number }> {
  const mergedConfig = { ...DEFAULT_SCHEDULE_CONFIG, ...config }

  // Get task details
  const task = await queryOne<TaskWithDeadline>(`
    SELECT
      id, title, deadline::text, is_critical,
      assigned_to, created_by, household_id
    FROM tasks
    WHERE id = $1 AND deadline IS NOT NULL AND status = 'pending'
  `, [taskId])

  if (!task || !task.deadline) {
    return { scheduled: 0 }
  }

  const deadline = new Date(task.deadline)
  const now = new Date()
  const userId = task.assigned_to || task.created_by

  let scheduled = 0

  // J-1: 24 hours before (at 9:00 AM the day before)
  if (mergedConfig.dayBefore) {
    const dayBefore = new Date(deadline)
    dayBefore.setDate(dayBefore.getDate() - 1)
    dayBefore.setHours(9, 0, 0, 0)

    if (dayBefore > now) {
      await scheduleNotification({
        userId,
        taskId,
        householdId: task.household_id,
        type: "task_reminder",
        title: `Rappel: ${task.title}`,
        body: `À faire demain`,
        scheduledFor: dayBefore,
        aggregationKey: `task_reminder_${taskId}_day_before`,
      })
      scheduled++
    }
  }

  // J-0: Morning of deadline day (at 8:00 AM)
  if (mergedConfig.dayOf) {
    const dayOf = new Date(deadline)
    dayOf.setHours(8, 0, 0, 0)

    if (dayOf > now) {
      await scheduleNotification({
        userId,
        taskId,
        householdId: task.household_id,
        type: "task_reminder",
        title: `📋 Aujourd'hui: ${task.title}`,
        body: task.is_critical ? "Tâche critique à compléter" : "N'oubliez pas cette tâche",
        scheduledFor: dayOf,
        aggregationKey: `task_reminder_${taskId}_day_of`,
      })
      scheduled++
    }
  }

  // H-3: 3 hours before deadline
  if (mergedConfig.threeHoursBefore) {
    const threeHours = new Date(deadline)
    threeHours.setHours(threeHours.getHours() - 3)

    if (threeHours > now) {
      await scheduleNotification({
        userId,
        taskId,
        householdId: task.household_id,
        type: "deadline_warning",
        title: `⏰ Plus que 3h: ${task.title}`,
        body: "La deadline approche",
        scheduledFor: threeHours,
        aggregationKey: `deadline_warning_${taskId}_h3`,
      })
      scheduled++
    }
  }

  // H-1: 1 hour before (critical tasks only)
  if (mergedConfig.oneHourBefore && task.is_critical) {
    const oneHour = new Date(deadline)
    oneHour.setHours(oneHour.getHours() - 1)

    if (oneHour > now) {
      await scheduleNotification({
        userId,
        taskId,
        householdId: task.household_id,
        type: "deadline_warning",
        title: `⚠️ Dernière heure: ${task.title}`,
        body: "Tâche critique - Dernière chance !",
        scheduledFor: oneHour,
        aggregationKey: `deadline_warning_${taskId}_h1`,
      })
      scheduled++
    }
  }

  return { scheduled }
}

// ============================================================
// SCHEDULE SINGLE NOTIFICATION
// ============================================================

interface ScheduleNotificationParams {
  userId: string
  taskId?: string
  householdId?: string
  type: NotificationType
  title: string
  body: string
  scheduledFor: Date
  aggregationKey?: string
}

async function scheduleNotification(params: ScheduleNotificationParams): Promise<string | null> {
  const {
    userId,
    taskId,
    householdId,
    type,
    title,
    body,
    scheduledFor,
    aggregationKey,
  } = params

  // Check if already scheduled (prevent duplicates)
  if (aggregationKey) {
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM notifications
      WHERE aggregation_key = $1 AND sent_at IS NULL
    `, [aggregationKey])

    if (existing) {
      return existing.id
    }
  }

  // Insert scheduled notification
  const result = await insert<{ id: string }>("notifications", {
    user_id: userId,
    task_id: taskId || null,
    household_id: householdId || null,
    type,
    title,
    body,
    scheduled_for: scheduledFor.toISOString(),
    is_read: false,
    is_sent: false,
    aggregation_key: aggregationKey || null,
    created_at: new Date().toISOString(),
  })

  return result?.id || null
}

// ============================================================
// PROCESS SCHEDULED NOTIFICATIONS
// ============================================================

/**
 * Process all due notifications and send them
 * Should be called by a cron job every few minutes
 */
export async function processScheduledNotifications(): Promise<{
  processed: number
  sent: number
  failed: number
  aggregated: number
}> {
  if (!isFirebaseConfigured()) {
    return { processed: 0, sent: 0, failed: 0, aggregated: 0 }
  }

  // Get all due notifications that haven't been sent
  const dueNotifications = await query<ScheduledNotification>(`
    SELECT
      n.id, n.user_id, n.task_id, n.household_id,
      n.type, n.title, n.body, n.scheduled_for::text,
      n.sent_at::text, n.is_aggregated, n.aggregation_key
    FROM notifications n
    WHERE n.scheduled_for <= NOW()
      AND n.is_sent = false
    ORDER BY n.user_id, n.type, n.scheduled_for
  `)

  if (dueNotifications.length === 0) {
    return { processed: 0, sent: 0, failed: 0, aggregated: 0 }
  }

  let sent = 0
  let failed = 0
  let aggregated = 0

  // Group by user for aggregation
  const byUser = new Map<string, ScheduledNotification[]>()
  for (const notif of dueNotifications) {
    const existing = byUser.get(notif.user_id) || []
    existing.push(notif)
    byUser.set(notif.user_id, existing)
  }

  // Process each user's notifications
  for (const [userId, userNotifications] of byUser) {
    // Aggregate same-type notifications
    const taskReminders = userNotifications.filter((n) => n.type === "task_reminder")
    const deadlineWarnings = userNotifications.filter((n) => n.type === "deadline_warning")
    const others = userNotifications.filter(
      (n) => n.type !== "task_reminder" && n.type !== "deadline_warning"
    )

    // Send aggregated task reminders if multiple
    if (taskReminders.length > 2) {
      const result = await sendPushToUser(
        userId,
        `📋 ${taskReminders.length} tâches à faire`,
        "Consultez votre liste de tâches",
        { type: "task_reminder", link: "/tasks/today" }
      )
      if (result.sent > 0) {
        sent++
        aggregated += taskReminders.length - 1
      } else {
        failed++
      }
      await markNotificationsAsSent(taskReminders.map((n) => n.id), true)
    } else {
      // Send individually
      for (const notif of taskReminders) {
        const result = await sendPushToUser(
          userId,
          notif.title,
          notif.body,
          { type: notif.type, taskId: notif.task_id || "", link: `/tasks/${notif.task_id}` }
        )
        if (result.sent > 0) {
          sent++
        } else {
          failed++
        }
        await markNotificationsAsSent([notif.id], false)
      }
    }

    // Send deadline warnings (don't aggregate - each is important)
    for (const notif of deadlineWarnings) {
      const result = await sendPushToUser(
        userId,
        notif.title,
        notif.body,
        { type: notif.type, taskId: notif.task_id || "", link: `/tasks/${notif.task_id}` }
      )
      if (result.sent > 0) {
        sent++
      } else {
        failed++
      }
      await markNotificationsAsSent([notif.id], false)
    }

    // Send other notifications
    for (const notif of others) {
      const result = await sendPushToUser(userId, notif.title, notif.body, { type: notif.type })
      if (result.sent > 0) {
        sent++
      } else {
        failed++
      }
      await markNotificationsAsSent([notif.id], false)
    }
  }

  return {
    processed: dueNotifications.length,
    sent,
    failed,
    aggregated,
  }
}

// ============================================================
// MARK NOTIFICATIONS AS SENT
// ============================================================

async function markNotificationsAsSent(ids: string[], isAggregated: boolean): Promise<void> {
  if (ids.length === 0) return

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ")

  await query(`
    UPDATE notifications
    SET is_sent = true, sent_at = NOW(), is_aggregated = $${ids.length + 1}
    WHERE id IN (${placeholders})
  `, [...ids, isAggregated])
}

// ============================================================
// CANCEL SCHEDULED NOTIFICATIONS
// ============================================================

/**
 * Cancel all scheduled notifications for a task (e.g., when completed)
 */
export async function cancelTaskNotifications(taskId: string): Promise<number> {
  const result = await query<{ id: string }>(`
    DELETE FROM notifications
    WHERE task_id = $1 AND is_sent = false
    RETURNING id
  `, [taskId])

  return result.length
}

// ============================================================
// SCHEDULE STREAK RISK NOTIFICATION
// ============================================================

/**
 * Schedule a streak risk notification for households at risk
 * Should be called in the evening (e.g., 8 PM)
 */
export async function scheduleStreakRiskNotifications(): Promise<{
  scheduled: number
}> {
  // Find households with active streaks and uncompleted critical tasks
  const atRiskHouseholds = await query<{
    household_id: string
    streak_current: number
    task_id: string
    task_title: string
    user_id: string
  }>(`
    SELECT
      h.id as household_id,
      h.streak_current,
      t.id as task_id,
      t.title as task_title,
      COALESCE(t.assigned_to, t.created_by) as user_id
    FROM households h
    JOIN tasks t ON t.household_id = h.id
    WHERE h.streak_current > 0
      AND t.is_critical = true
      AND t.status = 'pending'
      AND t.deadline::date = CURRENT_DATE
  `)

  let scheduled = 0

  for (const risk of atRiskHouseholds) {
    await scheduleNotification({
      userId: risk.user_id,
      taskId: risk.task_id,
      householdId: risk.household_id,
      type: "streak_risk",
      title: `🔥 Série de ${risk.streak_current} jours en danger`,
      body: `Complétez "${risk.task_title}" avant minuit`,
      scheduledFor: new Date(), // Immediate
      aggregationKey: `streak_risk_${risk.household_id}_${new Date().toISOString().split("T")[0]}`,
    })
    scheduled++
  }

  return { scheduled }
}

// ============================================================
// SCHEDULE CHARGE ALERT NOTIFICATIONS
// ============================================================

interface LoadImbalance {
  household_id: string
  ratio: string
  overloaded_user_id: string
  overloaded_percentage: number
}

/**
 * Schedule charge/imbalance alert notifications
 */
export async function scheduleChargeAlertNotifications(): Promise<{
  scheduled: number
}> {
  // Find households with significant imbalance (>60/40)
  const imbalanced = await query<LoadImbalance>(`
    WITH load_by_user AS (
      SELECT
        t.household_id,
        t.assigned_to as user_id,
        SUM(t.load_weight) as total_load
      FROM tasks t
      WHERE t.status = 'completed'
        AND t.completed_at >= NOW() - INTERVAL '7 days'
        AND t.assigned_to IS NOT NULL
      GROUP BY t.household_id, t.assigned_to
    ),
    household_totals AS (
      SELECT
        household_id,
        SUM(total_load) as household_total
      FROM load_by_user
      GROUP BY household_id
    )
    SELECT
      l.household_id,
      l.user_id as overloaded_user_id,
      ROUND(l.total_load * 100.0 / NULLIF(ht.household_total, 0))::int as overloaded_percentage,
      CONCAT(
        ROUND(l.total_load * 100.0 / NULLIF(ht.household_total, 0))::int,
        '/',
        100 - ROUND(l.total_load * 100.0 / NULLIF(ht.household_total, 0))::int
      ) as ratio
    FROM load_by_user l
    JOIN household_totals ht ON ht.household_id = l.household_id
    WHERE l.total_load * 100.0 / NULLIF(ht.household_total, 0) >= 60
  `)

  let scheduled = 0

  for (const imbalance of imbalanced) {
    const alertLevel = imbalance.overloaded_percentage >= 70 ? "critical" : "warning"
    const title = alertLevel === "critical"
      ? "Alerte déséquilibre critique"
      : "Attention: déséquilibre détecté"

    // Notify all household members
    const members = await query<{ user_id: string }>(`
      SELECT user_id FROM household_members
      WHERE household_id = $1 AND is_active = true
    `, [imbalance.household_id])

    for (const member of members) {
      await scheduleNotification({
        userId: member.user_id,
        householdId: imbalance.household_id,
        type: "charge_alert",
        title,
        body: `Répartition ${imbalance.ratio}. Pensez à rééquilibrer.`,
        scheduledFor: new Date(), // Immediate
        aggregationKey: `charge_alert_${imbalance.household_id}_${new Date().toISOString().split("T")[0]}`,
      })
      scheduled++
    }
  }

  return { scheduled }
}

// ============================================================
// GET USER NOTIFICATION STATS
// ============================================================

interface NotificationStats {
  total_scheduled: number
  total_sent: number
  pending: number
  sent_today: number
}

/**
 * Get notification statistics for a user
 */
export async function getUserNotificationStats(userId: string): Promise<NotificationStats> {
  const stats = await queryOne<NotificationStats>(`
    SELECT
      COUNT(*)::int as total_scheduled,
      COUNT(*) FILTER (WHERE is_sent = true)::int as total_sent,
      COUNT(*) FILTER (WHERE is_sent = false)::int as pending,
      COUNT(*) FILTER (WHERE sent_at::date = CURRENT_DATE)::int as sent_today
    FROM notifications
    WHERE user_id = $1
  `, [userId])

  return stats || {
    total_scheduled: 0,
    total_sent: 0,
    pending: 0,
    sent_today: 0,
  }
}

// ============================================================
// RESCHEDULE NOTIFICATION
// ============================================================

/**
 * Reschedule a notification to a new time
 */
export async function rescheduleNotification(
  notificationId: string,
  newScheduledFor: Date
): Promise<boolean> {
  const result = await query<{ id: string }>(`
    UPDATE notifications
    SET scheduled_for = $2
    WHERE id = $1 AND is_sent = false
    RETURNING id
  `, [notificationId, newScheduledFor.toISOString()])

  return result.length > 0
}
