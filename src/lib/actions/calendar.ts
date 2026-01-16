"use server"

import { revalidatePath } from "next/cache"
import {
  CalendarEventCreateSchema,
  CalendarEventUpdateSchema,
  CalendarEventFilterSchema,
  type CalendarEventCreateInput,
  type CalendarEventUpdateInput,
  type CalendarEventFilter,
  getEventColor,
} from "@/lib/validations/calendar"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"

// ============================================================
// TYPES
// ============================================================

export interface CalendarEvent {
  id: string
  household_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  recurrence: string
  recurrence_end_date: string | null
  color: string
  assigned_to: string | null
  assigned_to_name: string | null
  child_id: string | null
  child_name: string | null
  event_type: string
  location: string | null
  reminder_minutes: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface CalendarActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface HouseholdMembership {
  household_id: string
  role: string
}

// ============================================================
// HELPERS
// ============================================================

async function getHouseholdForUser(userId: string): Promise<HouseholdMembership | null> {
  await setCurrentUser(userId)
  return queryOne<HouseholdMembership>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])
}

// ============================================================
// CREATE EVENT
// ============================================================

export async function createCalendarEvent(
  data: CalendarEventCreateInput
): Promise<CalendarActionResult<{ eventId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = CalendarEventCreateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const eventData = {
    ...validation.data,
    household_id: membership.household_id,
    created_by: userId,
    color: validation.data.color || getEventColor(validation.data.event_type),
  } as Record<string, unknown>

  const event = await insert<{ id: string }>("calendar_events", eventData)
  if (!event) {
    return { success: false, error: "Erreur lors de la creation de l'evenement" }
  }

  revalidatePath("/calendar")
  revalidatePath("/dashboard")

  return { success: true, data: { eventId: event.id } }
}

// ============================================================
// UPDATE EVENT
// ============================================================

export async function updateCalendarEvent(
  data: CalendarEventUpdateInput
): Promise<CalendarActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = CalendarEventUpdateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const { id, ...updateData } = validation.data
  const keys = Object.keys(updateData)
  if (keys.length === 0) {
    return { success: false, error: "Aucune modification fournie" }
  }

  const values = Object.values(updateData)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ")

  const result = await query(
    `UPDATE calendar_events
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
       AND household_id = $${keys.length + 2}
     RETURNING id`,
    [...values, id, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Evenement introuvable ou non autorise" }
  }

  revalidatePath("/calendar")
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// DELETE EVENT
// ============================================================

export async function deleteCalendarEvent(
  eventId: string
): Promise<CalendarActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `DELETE FROM calendar_events
     WHERE id = $1 AND household_id = $2
     RETURNING id`,
    [eventId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Evenement introuvable ou non autorise" }
  }

  revalidatePath("/calendar")
  revalidatePath("/dashboard")

  return { success: true }
}

// ============================================================
// GET EVENTS (with date range filter)
// ============================================================

export async function getCalendarEvents(
  filters: CalendarEventFilter
): Promise<CalendarEvent[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const validation = CalendarEventFilterSchema.safeParse(filters)
  if (!validation.success) {
    return []
  }

  const { start_date, end_date, event_type, assigned_to, child_id } = validation.data

  const conditions: string[] = [
    "ce.household_id = $1",
    "ce.start_date <= $3",
    "(ce.end_date >= $2 OR ce.end_date IS NULL)",
  ]
  const params: unknown[] = [membership.household_id, start_date, end_date]
  let paramIndex = 4

  if (event_type) {
    conditions.push(`ce.event_type = $${paramIndex}`)
    params.push(event_type)
    paramIndex++
  }

  if (assigned_to) {
    conditions.push(`ce.assigned_to = $${paramIndex}`)
    params.push(assigned_to)
    paramIndex++
  }

  if (child_id) {
    conditions.push(`ce.child_id = $${paramIndex}`)
    params.push(child_id)
  }

  const whereClause = conditions.join(" AND ")

  const events = await query<CalendarEvent>(`
    SELECT
      ce.id,
      ce.household_id,
      ce.title,
      ce.description,
      ce.start_date::text,
      ce.end_date::text,
      ce.all_day,
      ce.recurrence,
      ce.recurrence_end_date::text,
      ce.color,
      ce.assigned_to,
      u.name as assigned_to_name,
      ce.child_id,
      c.first_name as child_name,
      ce.event_type,
      ce.location,
      ce.reminder_minutes,
      ce.created_by,
      ce.created_at::text,
      ce.updated_at::text
    FROM calendar_events ce
    LEFT JOIN users u ON ce.assigned_to = u.id
    LEFT JOIN children c ON ce.child_id = c.id
    WHERE ${whereClause}
    ORDER BY ce.start_date ASC
  `, params)

  return events
}

// ============================================================
// GET SINGLE EVENT
// ============================================================

export async function getCalendarEvent(
  eventId: string
): Promise<CalendarEvent | null> {
  const userId = await getUserId()
  if (!userId) return null

  const membership = await getHouseholdForUser(userId)
  if (!membership) return null

  const event = await queryOne<CalendarEvent>(`
    SELECT
      ce.id,
      ce.household_id,
      ce.title,
      ce.description,
      ce.start_date::text,
      ce.end_date::text,
      ce.all_day,
      ce.recurrence,
      ce.recurrence_end_date::text,
      ce.color,
      ce.assigned_to,
      u.name as assigned_to_name,
      ce.child_id,
      c.first_name as child_name,
      ce.event_type,
      ce.location,
      ce.reminder_minutes,
      ce.created_by,
      ce.created_at::text,
      ce.updated_at::text
    FROM calendar_events ce
    LEFT JOIN users u ON ce.assigned_to = u.id
    LEFT JOIN children c ON ce.child_id = c.id
    WHERE ce.id = $1 AND ce.household_id = $2
  `, [eventId, membership.household_id])

  return event
}

// ============================================================
// GET TODAY'S EVENTS
// ============================================================

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const events = await query<CalendarEvent>(`
    SELECT
      ce.id,
      ce.household_id,
      ce.title,
      ce.description,
      ce.start_date::text,
      ce.end_date::text,
      ce.all_day,
      ce.recurrence,
      ce.recurrence_end_date::text,
      ce.color,
      ce.assigned_to,
      u.name as assigned_to_name,
      ce.child_id,
      c.first_name as child_name,
      ce.event_type,
      ce.location,
      ce.reminder_minutes,
      ce.created_by,
      ce.created_at::text,
      ce.updated_at::text
    FROM calendar_events ce
    LEFT JOIN users u ON ce.assigned_to = u.id
    LEFT JOIN children c ON ce.child_id = c.id
    WHERE ce.household_id = $1
      AND ce.start_date::date = CURRENT_DATE
    ORDER BY ce.all_day DESC, ce.start_date ASC
  `, [membership.household_id])

  return events
}

// ============================================================
// GET UPCOMING EVENTS (next 7 days)
// ============================================================

export async function getUpcomingEvents(
  limit: number = 5
): Promise<CalendarEvent[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const events = await query<CalendarEvent>(`
    SELECT
      ce.id,
      ce.household_id,
      ce.title,
      ce.description,
      ce.start_date::text,
      ce.end_date::text,
      ce.all_day,
      ce.recurrence,
      ce.recurrence_end_date::text,
      ce.color,
      ce.assigned_to,
      u.name as assigned_to_name,
      ce.child_id,
      c.first_name as child_name,
      ce.event_type,
      ce.location,
      ce.reminder_minutes,
      ce.created_by,
      ce.created_at::text,
      ce.updated_at::text
    FROM calendar_events ce
    LEFT JOIN users u ON ce.assigned_to = u.id
    LEFT JOIN children c ON ce.child_id = c.id
    WHERE ce.household_id = $1
      AND ce.start_date >= NOW()
      AND ce.start_date <= NOW() + INTERVAL '7 days'
    ORDER BY ce.start_date ASC
    LIMIT $2
  `, [membership.household_id, limit])

  return events
}

// ============================================================
// GET EVENTS BY CHILD
// ============================================================

export async function getEventsByChild(
  childId: string
): Promise<CalendarEvent[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const events = await query<CalendarEvent>(`
    SELECT
      ce.id,
      ce.household_id,
      ce.title,
      ce.description,
      ce.start_date::text,
      ce.end_date::text,
      ce.all_day,
      ce.recurrence,
      ce.recurrence_end_date::text,
      ce.color,
      ce.assigned_to,
      u.name as assigned_to_name,
      ce.child_id,
      c.first_name as child_name,
      ce.event_type,
      ce.location,
      ce.reminder_minutes,
      ce.created_by,
      ce.created_at::text,
      ce.updated_at::text
    FROM calendar_events ce
    LEFT JOIN users u ON ce.assigned_to = u.id
    LEFT JOIN children c ON ce.child_id = c.id
    WHERE ce.household_id = $1
      AND ce.child_id = $2
      AND ce.start_date >= NOW() - INTERVAL '1 month'
    ORDER BY ce.start_date ASC
  `, [membership.household_id, childId])

  return events
}

// ============================================================
// GET EVENTS COUNT BY DATE (for calendar dots)
// ============================================================

export async function getEventsCountByDate(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const userId = await getUserId()
  if (!userId) return {}

  const membership = await getHouseholdForUser(userId)
  if (!membership) return {}

  const results = await query<{ date: string; count: string }>(`
    SELECT
      start_date::date::text as date,
      COUNT(*)::text as count
    FROM calendar_events
    WHERE household_id = $1
      AND start_date::date >= $2::date
      AND start_date::date <= $3::date
    GROUP BY start_date::date
  `, [membership.household_id, startDate, endDate])

  return results.reduce((acc, row) => {
    acc[row.date] = parseInt(row.count, 10)
    return acc
  }, {} as Record<string, number>)
}

// ============================================================
// DUPLICATE EVENT
// ============================================================

export async function duplicateCalendarEvent(
  eventId: string,
  newStartDate: string
): Promise<CalendarActionResult<{ eventId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  // Get the original event
  const original = await queryOne<CalendarEvent>(`
    SELECT * FROM calendar_events
    WHERE id = $1 AND household_id = $2
  `, [eventId, membership.household_id])

  if (!original) {
    return { success: false, error: "Evenement original introuvable" }
  }

  // Calculate duration if end_date exists
  let newEndDate: string | null = null
  if (original.end_date) {
    const originalStart = new Date(original.start_date)
    const originalEnd = new Date(original.end_date)
    const duration = originalEnd.getTime() - originalStart.getTime()
    const newStart = new Date(newStartDate)
    newEndDate = new Date(newStart.getTime() + duration).toISOString()
  }

  const eventData = {
    household_id: membership.household_id,
    title: original.title,
    description: original.description,
    start_date: newStartDate,
    end_date: newEndDate,
    all_day: original.all_day,
    recurrence: "none",
    color: original.color,
    assigned_to: original.assigned_to,
    child_id: original.child_id,
    event_type: original.event_type,
    location: original.location,
    reminder_minutes: original.reminder_minutes,
    created_by: userId,
  }

  const event = await insert<{ id: string }>("calendar_events", eventData)
  if (!event) {
    return { success: false, error: "Erreur lors de la duplication" }
  }

  revalidatePath("/calendar")

  return { success: true, data: { eventId: event.id } }
}
