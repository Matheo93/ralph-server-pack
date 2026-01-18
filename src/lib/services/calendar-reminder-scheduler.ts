import { query, queryOne, insert } from "@/lib/aws/database"
import { sendPushToUser } from "./notifications"
import { isFirebaseConfigured } from "@/lib/firebase"
import {
  isWebPushConfigured,
  sendWebPush,
  type WebPushSubscription,
} from "@/lib/web-push"

/**
 * Calendar event with reminder info
 */
interface CalendarEventWithReminder {
  id: string
  title: string
  start_date: string
  reminder_minutes: number
  assigned_to: string | null
  created_by: string
  household_id: string
  event_type: string
  location: string | null
}

/**
 * Scheduled calendar notification record
 */
interface ScheduledCalendarNotification {
  id: string
  user_id: string
  event_id: string
  household_id: string
  type: string
  title: string
  body: string
  scheduled_for: string
  sent_at: string | null
  aggregation_key: string
}

// ============================================================
// SCHEDULE CALENDAR EVENT NOTIFICATION
// ============================================================

interface ScheduleCalendarNotificationParams {
  userId: string
  eventId: string
  householdId: string
  title: string
  body: string
  scheduledFor: Date
  aggregationKey: string
}

async function scheduleCalendarNotification(
  params: ScheduleCalendarNotificationParams
): Promise<string | null> {
  const {
    userId,
    eventId,
    householdId,
    title,
    body,
    scheduledFor,
    aggregationKey,
  } = params

  // Check if already scheduled (prevent duplicates)
  const existing = await queryOne<{ id: string }>(`
    SELECT id FROM notifications
    WHERE aggregation_key = $1 AND sent_at IS NULL
  `, [aggregationKey])

  if (existing) {
    return existing.id
  }

  // Insert scheduled notification
  const result = await insert<{ id: string }>("notifications", {
    user_id: userId,
    event_id: eventId,
    household_id: householdId,
    type: "calendar_reminder",
    title,
    body,
    scheduled_for: scheduledFor.toISOString(),
    is_read: false,
    is_sent: false,
    aggregation_key: aggregationKey,
    created_at: new Date().toISOString(),
  })

  return result?.id || null
}

// ============================================================
// SCHEDULE REMINDER FOR A CALENDAR EVENT
// ============================================================

/**
 * Schedule reminder notification for a calendar event
 * Uses the event's reminder_minutes setting (default 60 = 1 hour before)
 */
export async function scheduleCalendarEventReminder(
  eventId: string
): Promise<{ scheduled: boolean; notificationId: string | null }> {
  // Get event details
  const event = await queryOne<CalendarEventWithReminder>(`
    SELECT
      id, title, start_date::text, reminder_minutes,
      assigned_to, created_by, household_id, event_type, location
    FROM calendar_events
    WHERE id = $1
  `, [eventId])

  if (!event) {
    return { scheduled: false, notificationId: null }
  }

  // Calculate reminder time
  const startDate = new Date(event.start_date)
  const reminderMinutes = event.reminder_minutes || 60 // Default: 1 hour before
  const reminderTime = new Date(startDate.getTime() - reminderMinutes * 60 * 1000)
  const now = new Date()

  // Skip if reminder time is in the past
  if (reminderTime <= now) {
    return { scheduled: false, notificationId: null }
  }

  // Determine who to notify
  const userId = event.assigned_to || event.created_by

  // Build notification content
  const timeStr = startDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  let body = `Commence à ${timeStr}`
  if (event.location) {
    body += ` - ${event.location}`
  }

  const aggregationKey = `calendar_reminder_${eventId}_${reminderMinutes}min`

  const notificationId = await scheduleCalendarNotification({
    userId,
    eventId,
    householdId: event.household_id,
    title: `📅 ${event.title}`,
    body,
    scheduledFor: reminderTime,
    aggregationKey,
  })

  return {
    scheduled: notificationId !== null,
    notificationId,
  }
}

// ============================================================
// CANCEL CALENDAR EVENT REMINDERS
// ============================================================

/**
 * Cancel all scheduled reminders for a calendar event
 */
export async function cancelCalendarEventReminders(
  eventId: string
): Promise<number> {
  const result = await query<{ id: string }>(`
    DELETE FROM notifications
    WHERE event_id = $1 AND is_sent = false
    RETURNING id
  `, [eventId])

  return result.length
}

// ============================================================
// RESCHEDULE CALENDAR EVENT REMINDER
// ============================================================

/**
 * Reschedule reminder when event time changes
 */
export async function rescheduleCalendarEventReminder(
  eventId: string
): Promise<{ rescheduled: boolean }> {
  // First cancel existing reminders
  await cancelCalendarEventReminders(eventId)

  // Then schedule new one
  const result = await scheduleCalendarEventReminder(eventId)

  return { rescheduled: result.scheduled }
}

// ============================================================
// PROCESS DUE CALENDAR REMINDERS
// ============================================================

/**
 * Process all due calendar reminders and send push notifications
 * Should be called by a cron job every few minutes
 * Supports both Firebase Cloud Messaging and Web Push API (VAPID)
 */
export async function processCalendarReminders(): Promise<{
  processed: number
  sent: number
  failed: number
  webPushSent: number
}> {
  const hasFirebase = isFirebaseConfigured()
  const hasWebPush = isWebPushConfigured()

  // At least one push service must be configured
  if (!hasFirebase && !hasWebPush) {
    return { processed: 0, sent: 0, failed: 0, webPushSent: 0 }
  }

  // Get all due calendar reminders that haven't been sent
  const dueReminders = await query<ScheduledCalendarNotification>(`
    SELECT
      n.id, n.user_id, n.event_id, n.household_id,
      n.type, n.title, n.body, n.scheduled_for::text,
      n.sent_at::text, n.aggregation_key
    FROM notifications n
    WHERE n.type = 'calendar_reminder'
      AND n.scheduled_for <= NOW()
      AND n.is_sent = false
    ORDER BY n.scheduled_for ASC
    LIMIT 100
  `)

  if (dueReminders.length === 0) {
    return { processed: 0, sent: 0, failed: 0, webPushSent: 0 }
  }

  let sent = 0
  let failed = 0
  let webPushSent = 0

  for (const reminder of dueReminders) {
    // Verify event still exists and hasn't passed
    const event = await queryOne<{ id: string; start_date: string }>(`
      SELECT id, start_date::text
      FROM calendar_events
      WHERE id = $1
    `, [reminder.event_id])

    // Skip if event was deleted or has already passed
    if (!event || new Date(event.start_date) < new Date()) {
      await markReminderAsSent(reminder.id)
      continue
    }

    let pushSentSuccessfully = false

    // Try Firebase Cloud Messaging first
    if (hasFirebase) {
      const result = await sendPushToUser(
        reminder.user_id,
        reminder.title,
        reminder.body,
        {
          type: "calendar_reminder",
          eventId: reminder.event_id,
          link: `/calendar?event=${reminder.event_id}`,
        }
      )

      if (result.sent > 0) {
        sent++
        pushSentSuccessfully = true
      }
    }

    // Also try Web Push API (VAPID) for broader browser support
    if (hasWebPush) {
      const webPushResult = await sendWebPushToUser(
        reminder.user_id,
        reminder.title,
        reminder.body,
        {
          type: "calendar_reminder",
          eventId: reminder.event_id,
          link: `/calendar?event=${reminder.event_id}`,
        }
      )

      if (webPushResult.sent > 0) {
        webPushSent += webPushResult.sent
        pushSentSuccessfully = true
      }
    }

    if (!pushSentSuccessfully) {
      failed++
    }

    // Mark as sent regardless of push success (to avoid retry loops)
    await markReminderAsSent(reminder.id)
  }

  return {
    processed: dueReminders.length,
    sent,
    failed,
    webPushSent,
  }
}

// ============================================================
// SEND WEB PUSH TO USER
// ============================================================

interface WebPushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Send Web Push notification to a user using VAPID
 */
async function sendWebPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ sent: number; failed: number }> {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0 }
  }

  // Get user's web push subscriptions
  const subscriptions = await query<WebPushSubscriptionRecord>(`
    SELECT endpoint, p256dh, auth
    FROM web_push_subscriptions
    WHERE user_id = $1 AND enabled = true
  `, [userId])

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  const expiredEndpoints: string[] = []

  for (const sub of subscriptions) {
    const subscription: WebPushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    }

    const result = await sendWebPush(subscription, {
      title,
      body,
      data,
      requireInteraction: true,
      actions: [
        { action: "view", title: "Voir" },
        { action: "dismiss", title: "OK" },
      ],
    })

    if (result.success) {
      sent++
    } else {
      failed++
      if (result.expired) {
        expiredEndpoints.push(sub.endpoint)
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    const placeholders = expiredEndpoints.map((_, i) => `$${i + 1}`).join(", ")
    await query(`
      DELETE FROM web_push_subscriptions
      WHERE endpoint IN (${placeholders})
    `, expiredEndpoints)
  }

  return { sent, failed }
}

// ============================================================
// MARK REMINDER AS SENT
// ============================================================

async function markReminderAsSent(notificationId: string): Promise<void> {
  await query(`
    UPDATE notifications
    SET is_sent = true, sent_at = NOW()
    WHERE id = $1
  `, [notificationId])
}

// ============================================================
// SCHEDULE REMINDERS FOR UPCOMING EVENTS
// ============================================================

/**
 * Schedule reminders for all upcoming calendar events
 * Useful for bulk scheduling (e.g., when user enables notifications)
 */
export async function scheduleUpcomingEventReminders(
  householdId: string
): Promise<{ scheduled: number }> {
  // Get all upcoming events in the next 7 days
  const upcomingEvents = await query<{ id: string }>(`
    SELECT id
    FROM calendar_events
    WHERE household_id = $1
      AND start_date > NOW()
      AND start_date <= NOW() + INTERVAL '7 days'
      AND reminder_minutes > 0
  `, [householdId])

  let scheduled = 0

  for (const event of upcomingEvents) {
    const result = await scheduleCalendarEventReminder(event.id)
    if (result.scheduled) {
      scheduled++
    }
  }

  return { scheduled }
}

// ============================================================
// GET SCHEDULED REMINDERS FOR EVENT
// ============================================================

/**
 * Get all scheduled (not yet sent) reminders for an event
 */
export async function getEventScheduledReminders(
  eventId: string
): Promise<Array<{ id: string; scheduled_for: string }>> {
  const reminders = await query<{ id: string; scheduled_for: string }>(`
    SELECT id, scheduled_for::text
    FROM notifications
    WHERE event_id = $1 AND is_sent = false
    ORDER BY scheduled_for ASC
  `, [eventId])

  return reminders
}

// ============================================================
// SCHEDULE DAILY CALENDAR DIGEST
// ============================================================

/**
 * Schedule a morning digest of today's calendar events
 * To be called by a cron job early in the morning
 */
export async function scheduleDailyCalendarDigest(): Promise<{
  scheduled: number
}> {
  // Get all households with events today
  const householdsWithEvents = await query<{
    household_id: string
    event_count: number
  }>(`
    SELECT
      household_id,
      COUNT(*)::int as event_count
    FROM calendar_events
    WHERE start_date::date = CURRENT_DATE
    GROUP BY household_id
    HAVING COUNT(*) > 0
  `)

  let scheduled = 0

  for (const household of householdsWithEvents) {
    // Get members to notify
    const members = await query<{ user_id: string }>(`
      SELECT hm.user_id
      FROM household_members hm
      JOIN user_preferences up ON up.user_id = hm.user_id
      WHERE hm.household_id = $1
        AND hm.is_active = true
        AND COALESCE(up.push_enabled, true) = true
    `, [household.household_id])

    // Get today's events for the digest
    const events = await query<{ title: string; start_date: string }>(`
      SELECT title, start_date::text
      FROM calendar_events
      WHERE household_id = $1
        AND start_date::date = CURRENT_DATE
      ORDER BY start_date ASC
      LIMIT 5
    `, [household.household_id])

    const eventList = events
      .map((e) => {
        const time = new Date(e.start_date).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
        return `${time} - ${e.title}`
      })
      .join("\n")

    const title = `📅 ${household.event_count} événement${household.event_count > 1 ? "s" : ""} aujourd'hui`
    const body = eventList || "Consultez votre calendrier"

    for (const member of members) {
      const aggregationKey = `calendar_digest_${household.household_id}_${new Date().toISOString().split("T")[0]}_${member.user_id}`

      await scheduleCalendarNotification({
        userId: member.user_id,
        eventId: "", // No specific event for digest
        householdId: household.household_id,
        title,
        body,
        scheduledFor: new Date(), // Immediate
        aggregationKey,
      })
      scheduled++
    }
  }

  return { scheduled }
}
