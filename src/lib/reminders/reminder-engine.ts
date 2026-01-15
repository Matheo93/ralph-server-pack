/**
 * Reminder Engine - Smart task reminder system
 * Functional, immutable approach to reminder management
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const ReminderType = z.enum([
  "deadline", // Task deadline approaching
  "overdue", // Task past due
  "recurring", // Recurring task reminder
  "follow_up", // Follow up on pending task
  "check_in", // Check in on task progress
  "nudge", // Gentle nudge for stale task
  "celebration", // Task completion celebration
  "weekly_summary", // Weekly task summary
])
export type ReminderType = z.infer<typeof ReminderType>

export const ReminderPriority = z.enum(["low", "medium", "high", "urgent"])
export type ReminderPriority = z.infer<typeof ReminderPriority>

export const ReminderChannel = z.enum(["push", "email", "sms", "in_app"])
export type ReminderChannel = z.infer<typeof ReminderChannel>

export const DeliveryStatus = z.enum([
  "scheduled",
  "sent",
  "delivered",
  "failed",
  "cancelled",
  "snoozed",
])
export type DeliveryStatus = z.infer<typeof DeliveryStatus>

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  householdId: z.string(),
  assigneeId: z.string().nullable(),
  creatorId: z.string(),
  priority: TaskPrioritySchema,
  deadline: z.date().nullable(),
  estimatedMinutes: z.number().nullable(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Task = z.infer<typeof TaskSchema>

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  enableReminders: z.boolean().default(true),
  channels: z.array(ReminderChannel).default(["push", "in_app"]),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string(), // HH:MM format
    end: z.string(),
  }).nullable(),
  timezone: z.string().default("Europe/Paris"),
  language: z.string().default("fr"),
  reminderLeadTimes: z.object({
    deadline: z.number().default(24), // hours before deadline
    recurring: z.number().default(1), // hours before recurring task
    checkIn: z.number().default(48), // hours after assignment
  }),
  maxRemindersPerDay: z.number().default(10),
})
export type UserPreferences = z.infer<typeof UserPreferencesSchema>

export const ReminderSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  householdId: z.string(),
  type: ReminderType,
  priority: ReminderPriority,
  channels: z.array(ReminderChannel),
  scheduledAt: z.date(),
  sentAt: z.date().nullable(),
  deliveryStatus: DeliveryStatus,
  snoozedUntil: z.date().nullable(),
  snoozeCount: z.number().default(0),
  content: z.object({
    title: z.string(),
    body: z.string(),
    actionUrl: z.string().nullable(),
    metadata: z.record(z.string(), z.string()),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Reminder = z.infer<typeof ReminderSchema>

// =============================================================================
// REMINDER STORE
// =============================================================================

export interface ReminderStore {
  readonly reminders: ReadonlyMap<string, Reminder>
  readonly byTask: ReadonlyMap<string, Set<string>>
  readonly byUser: ReadonlyMap<string, Set<string>>
  readonly scheduled: ReadonlySet<string>
}

/**
 * Create empty reminder store
 */
export function createReminderStore(): ReminderStore {
  return {
    reminders: new Map(),
    byTask: new Map(),
    byUser: new Map(),
    scheduled: new Set(),
  }
}

/**
 * Add reminder to store
 */
export function addReminder(
  store: ReminderStore,
  reminder: Reminder
): ReminderStore {
  const reminders = new Map(store.reminders)
  const byTask = new Map(store.byTask)
  const byUser = new Map(store.byUser)
  const scheduled = new Set(store.scheduled)

  reminders.set(reminder.id, reminder)

  // Update byTask index
  const taskReminders = new Set(byTask.get(reminder.taskId) ?? [])
  taskReminders.add(reminder.id)
  byTask.set(reminder.taskId, taskReminders)

  // Update byUser index
  const userReminders = new Set(byUser.get(reminder.userId) ?? [])
  userReminders.add(reminder.id)
  byUser.set(reminder.userId, userReminders)

  // Add to scheduled if applicable
  if (reminder.deliveryStatus === "scheduled") {
    scheduled.add(reminder.id)
  }

  return { reminders, byTask, byUser, scheduled }
}

/**
 * Update reminder in store
 */
export function updateReminder(
  store: ReminderStore,
  reminder: Reminder
): ReminderStore {
  const reminders = new Map(store.reminders)
  const scheduled = new Set(store.scheduled)

  reminders.set(reminder.id, reminder)

  // Update scheduled set based on status
  if (reminder.deliveryStatus === "scheduled") {
    scheduled.add(reminder.id)
  } else {
    scheduled.delete(reminder.id)
  }

  return { ...store, reminders, scheduled }
}

/**
 * Get reminder by ID
 */
export function getReminder(
  store: ReminderStore,
  reminderId: string
): Reminder | null {
  return store.reminders.get(reminderId) ?? null
}

/**
 * Get reminders by task
 */
export function getRemindersByTask(
  store: ReminderStore,
  taskId: string
): Reminder[] {
  const ids = store.byTask.get(taskId)
  if (!ids) return []

  return Array.from(ids)
    .map((id) => store.reminders.get(id))
    .filter((r): r is Reminder => r !== undefined)
}

/**
 * Get reminders by user
 */
export function getRemindersByUser(
  store: ReminderStore,
  userId: string
): Reminder[] {
  const ids = store.byUser.get(userId)
  if (!ids) return []

  return Array.from(ids)
    .map((id) => store.reminders.get(id))
    .filter((r): r is Reminder => r !== undefined)
}

/**
 * Get scheduled reminders
 */
export function getScheduledReminders(store: ReminderStore): Reminder[] {
  return Array.from(store.scheduled)
    .map((id) => store.reminders.get(id))
    .filter((r): r is Reminder => r !== undefined)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

// =============================================================================
// REMINDER CREATION
// =============================================================================

/**
 * Generate reminder ID
 */
export function generateReminderId(): string {
  return `rem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Calculate reminder priority based on task and deadline
 */
export function calculatePriority(task: Task): ReminderPriority {
  // Urgent tasks are always urgent
  if (task.priority === "urgent") {
    return "urgent"
  }

  // Overdue tasks are high priority
  if (task.deadline && task.deadline.getTime() < Date.now()) {
    return "high"
  }

  // Less than 24 hours to deadline
  if (task.deadline) {
    const hoursUntil = (task.deadline.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < 24) {
      return "high"
    }
    if (hoursUntil < 72) {
      return "medium"
    }
  }

  // Map task priority
  switch (task.priority) {
    case "high":
      return "medium"
    case "medium":
      return "low"
    case "low":
    default:
      return "low"
  }
}

/**
 * Build reminder content
 */
export function buildReminderContent(
  task: Task,
  type: ReminderType,
  language: string = "fr"
): Reminder["content"] {
  const templates = REMINDER_TEMPLATES[type]
  const template = templates?.[language] ?? templates?.["fr"] ?? { title: "", body: "" }

  const variables: Record<string, string> = {
    taskTitle: task.title,
    deadline: task.deadline?.toLocaleDateString(language) ?? "",
    priority: task.priority,
  }

  let title = template.title
  let body = template.body

  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(new RegExp(`{{${key}}}`, "g"), value)
    body = body.replace(new RegExp(`{{${key}}}`, "g"), value)
  }

  return {
    title,
    body,
    actionUrl: `/tasks/${task.id}`,
    metadata: {
      taskId: task.id,
      taskTitle: task.title,
      type,
    },
  }
}

const REMINDER_TEMPLATES: Record<ReminderType, Record<string, { title: string; body: string }>> = {
  deadline: {
    fr: {
      title: "Échéance proche",
      body: "La tâche \"{{taskTitle}}\" arrive à échéance le {{deadline}}",
    },
    en: {
      title: "Deadline approaching",
      body: "Task \"{{taskTitle}}\" is due on {{deadline}}",
    },
  },
  overdue: {
    fr: {
      title: "Tâche en retard",
      body: "La tâche \"{{taskTitle}}\" est en retard depuis le {{deadline}}",
    },
    en: {
      title: "Task overdue",
      body: "Task \"{{taskTitle}}\" was due on {{deadline}}",
    },
  },
  recurring: {
    fr: {
      title: "Tâche récurrente",
      body: "C'est l'heure de faire \"{{taskTitle}}\"",
    },
    en: {
      title: "Recurring task",
      body: "Time to do \"{{taskTitle}}\"",
    },
  },
  follow_up: {
    fr: {
      title: "Suivi de tâche",
      body: "Comment avance la tâche \"{{taskTitle}}\" ?",
    },
    en: {
      title: "Task follow-up",
      body: "How is \"{{taskTitle}}\" going?",
    },
  },
  check_in: {
    fr: {
      title: "Point sur la tâche",
      body: "N'oubliez pas la tâche \"{{taskTitle}}\"",
    },
    en: {
      title: "Task check-in",
      body: "Don't forget about \"{{taskTitle}}\"",
    },
  },
  nudge: {
    fr: {
      title: "Petit rappel",
      body: "La tâche \"{{taskTitle}}\" attend toujours votre attention",
    },
    en: {
      title: "Gentle reminder",
      body: "Task \"{{taskTitle}}\" is still waiting for your attention",
    },
  },
  celebration: {
    fr: {
      title: "Bravo !",
      body: "Vous avez terminé \"{{taskTitle}}\" !",
    },
    en: {
      title: "Well done!",
      body: "You completed \"{{taskTitle}}\"!",
    },
  },
  weekly_summary: {
    fr: {
      title: "Résumé de la semaine",
      body: "Voici votre bilan de la semaine",
    },
    en: {
      title: "Weekly summary",
      body: "Here's your week in review",
    },
  },
}

/**
 * Create reminder for task
 */
export function createReminder(params: {
  task: Task
  userId: string
  type: ReminderType
  scheduledAt: Date
  channels: ReminderChannel[]
  language?: string
}): Reminder {
  const now = new Date()
  const content = buildReminderContent(params.task, params.type, params.language)

  return {
    id: generateReminderId(),
    taskId: params.task.id,
    userId: params.userId,
    householdId: params.task.householdId,
    type: params.type,
    priority: calculatePriority(params.task),
    channels: params.channels,
    scheduledAt: params.scheduledAt,
    sentAt: null,
    deliveryStatus: "scheduled",
    snoozedUntil: null,
    snoozeCount: 0,
    content,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Create deadline reminder
 */
export function createDeadlineReminder(
  task: Task,
  userId: string,
  preferences: UserPreferences
): Reminder | null {
  if (!task.deadline || task.status === "completed" || task.status === "cancelled") {
    return null
  }

  const leadTimeMs = preferences.reminderLeadTimes.deadline * 60 * 60 * 1000
  const reminderTime = new Date(task.deadline.getTime() - leadTimeMs)

  // Don't create if reminder time is in the past
  if (reminderTime.getTime() < Date.now()) {
    return null
  }

  return createReminder({
    task,
    userId,
    type: "deadline",
    scheduledAt: reminderTime,
    channels: preferences.channels,
    language: preferences.language,
  })
}

/**
 * Create overdue reminder
 */
export function createOverdueReminder(
  task: Task,
  userId: string,
  preferences: UserPreferences
): Reminder | null {
  if (!task.deadline || task.status === "completed" || task.status === "cancelled") {
    return null
  }

  // Only if deadline has passed
  if (task.deadline.getTime() > Date.now()) {
    return null
  }

  return createReminder({
    task,
    userId,
    type: "overdue",
    scheduledAt: new Date(), // Send immediately
    channels: preferences.channels,
    language: preferences.language,
  })
}

// =============================================================================
// REMINDER OPERATIONS
// =============================================================================

/**
 * Mark reminder as sent
 */
export function markSent(reminder: Reminder): Reminder {
  return {
    ...reminder,
    sentAt: new Date(),
    deliveryStatus: "sent",
    updatedAt: new Date(),
  }
}

/**
 * Mark reminder as delivered
 */
export function markDelivered(reminder: Reminder): Reminder {
  return {
    ...reminder,
    deliveryStatus: "delivered",
    updatedAt: new Date(),
  }
}

/**
 * Mark reminder as failed
 */
export function markFailed(reminder: Reminder): Reminder {
  return {
    ...reminder,
    deliveryStatus: "failed",
    updatedAt: new Date(),
  }
}

/**
 * Cancel reminder
 */
export function cancelReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    deliveryStatus: "cancelled",
    updatedAt: new Date(),
  }
}

/**
 * Snooze reminder
 */
export function snoozeReminder(
  reminder: Reminder,
  duration: number // minutes
): Reminder {
  const snoozeUntil = new Date(Date.now() + duration * 60 * 1000)

  return {
    ...reminder,
    snoozedUntil: snoozeUntil,
    snoozeCount: reminder.snoozeCount + 1,
    deliveryStatus: "snoozed",
    scheduledAt: snoozeUntil,
    updatedAt: new Date(),
  }
}

/**
 * Unsnooze reminder (reset scheduled time)
 */
export function unsnoozeReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    snoozedUntil: null,
    deliveryStatus: "scheduled",
    updatedAt: new Date(),
  }
}

// =============================================================================
// SCHEDULING
// =============================================================================

export interface ScheduleWindow {
  start: Date
  end: Date
}

/**
 * Check if time is within quiet hours
 */
export function isQuietHours(
  time: Date,
  preferences: UserPreferences
): boolean {
  if (!preferences.quietHours?.enabled) {
    return false
  }

  const { start, end } = preferences.quietHours
  const [startHour, startMin] = start.split(":").map(Number)
  const [endHour, endMin] = end.split(":").map(Number)

  const timeMinutes = time.getHours() * 60 + time.getMinutes()
  const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0)
  const endMinutes = (endHour ?? 0) * 60 + (endMin ?? 0)

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return timeMinutes >= startMinutes || timeMinutes < endMinutes
  }

  return timeMinutes >= startMinutes && timeMinutes < endMinutes
}

/**
 * Get next available send time (respecting quiet hours)
 */
export function getNextSendTime(
  proposedTime: Date,
  preferences: UserPreferences
): Date {
  if (!isQuietHours(proposedTime, preferences)) {
    return proposedTime
  }

  // Find end of quiet hours
  if (!preferences.quietHours) {
    return proposedTime
  }

  const { end } = preferences.quietHours
  const [endHour, endMin] = end.split(":").map(Number)

  const result = new Date(proposedTime)
  result.setHours(endHour ?? 0, endMin ?? 0, 0, 0)

  // If quiet hours end is before current time (overnight), add a day
  if (result.getTime() < proposedTime.getTime()) {
    result.setDate(result.getDate() + 1)
  }

  return result
}

/**
 * Get due reminders
 */
export function getDueReminders(
  store: ReminderStore,
  now: Date = new Date()
): Reminder[] {
  return getScheduledReminders(store)
    .filter((r) => r.scheduledAt.getTime() <= now.getTime())
}

/**
 * Get reminders due in window
 */
export function getRemindersInWindow(
  store: ReminderStore,
  window: ScheduleWindow
): Reminder[] {
  return getScheduledReminders(store)
    .filter((r) =>
      r.scheduledAt.getTime() >= window.start.getTime() &&
      r.scheduledAt.getTime() <= window.end.getTime()
    )
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

export interface ReminderBatch {
  reminders: Reminder[]
  userId: string
  totalCount: number
  sentAt: Date
}

/**
 * Group reminders by user
 */
export function groupByUser(reminders: Reminder[]): Map<string, Reminder[]> {
  const groups = new Map<string, Reminder[]>()

  for (const reminder of reminders) {
    const existing = groups.get(reminder.userId) ?? []
    existing.push(reminder)
    groups.set(reminder.userId, existing)
  }

  return groups
}

/**
 * Limit reminders per user per day
 */
export function applyDailyLimit(
  reminders: Reminder[],
  limit: number
): { allowed: Reminder[]; deferred: Reminder[] } {
  // Sort by priority then scheduled time
  const sorted = [...reminders].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const aPriority = priorityOrder[a.priority]
    const bPriority = priorityOrder[b.priority]

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    return a.scheduledAt.getTime() - b.scheduledAt.getTime()
  })

  return {
    allowed: sorted.slice(0, limit),
    deferred: sorted.slice(limit),
  }
}

/**
 * Process batch of reminders
 */
export function processBatch(
  store: ReminderStore,
  now: Date = new Date(),
  preferencesMap: Map<string, UserPreferences>
): {
  toSend: ReminderBatch[]
  deferred: Reminder[]
  updated: ReminderStore
} {
  const due = getDueReminders(store, now)
  const byUser = groupByUser(due)
  const batches: ReminderBatch[] = []
  const allDeferred: Reminder[] = []
  let updatedStore = store

  for (const [userId, userReminders] of byUser) {
    const prefs = preferencesMap.get(userId)
    const limit = prefs?.maxRemindersPerDay ?? 10

    const { allowed, deferred } = applyDailyLimit(userReminders, limit)

    // Check quiet hours for each allowed reminder
    const toSend: Reminder[] = []
    for (const reminder of allowed) {
      if (prefs && isQuietHours(now, prefs)) {
        const nextTime = getNextSendTime(now, prefs)
        const rescheduled = { ...reminder, scheduledAt: nextTime }
        updatedStore = updateReminder(updatedStore, rescheduled)
        allDeferred.push(rescheduled)
      } else {
        toSend.push(reminder)
      }
    }

    if (toSend.length > 0) {
      batches.push({
        reminders: toSend,
        userId,
        totalCount: toSend.length,
        sentAt: now,
      })
    }

    // Defer remaining
    for (const rem of deferred) {
      const nextDay = new Date(now)
      nextDay.setDate(nextDay.getDate() + 1)
      nextDay.setHours(9, 0, 0, 0) // Next day at 9 AM

      const rescheduled = { ...rem, scheduledAt: nextDay }
      updatedStore = updateReminder(updatedStore, rescheduled)
      allDeferred.push(rescheduled)
    }
  }

  return {
    toSend: batches,
    deferred: allDeferred,
    updated: updatedStore,
  }
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface ReminderMetrics {
  totalReminders: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  snoozedCount: number
  cancelledCount: number
  averageSnoozeCount: number
  byType: Record<ReminderType, number>
  byPriority: Record<ReminderPriority, number>
}

/**
 * Calculate reminder metrics
 */
export function calculateMetrics(reminders: Reminder[]): ReminderMetrics {
  const byStatus = {
    sent: 0,
    delivered: 0,
    failed: 0,
    snoozed: 0,
    cancelled: 0,
  }

  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  let totalSnoozes = 0

  for (const rem of reminders) {
    // Count by status
    if (rem.deliveryStatus === "sent" || rem.deliveryStatus === "delivered") {
      byStatus.sent++
    }
    if (rem.deliveryStatus === "delivered") {
      byStatus.delivered++
    }
    if (rem.deliveryStatus === "failed") {
      byStatus.failed++
    }
    if (rem.deliveryStatus === "snoozed") {
      byStatus.snoozed++
    }
    if (rem.deliveryStatus === "cancelled") {
      byStatus.cancelled++
    }

    // Count by type
    byType[rem.type] = (byType[rem.type] ?? 0) + 1

    // Count by priority
    byPriority[rem.priority] = (byPriority[rem.priority] ?? 0) + 1

    // Sum snoozes
    totalSnoozes += rem.snoozeCount
  }

  return {
    totalReminders: reminders.length,
    sentCount: byStatus.sent,
    deliveredCount: byStatus.delivered,
    failedCount: byStatus.failed,
    snoozedCount: byStatus.snoozed,
    cancelledCount: byStatus.cancelled,
    averageSnoozeCount: reminders.length > 0 ? totalSnoozes / reminders.length : 0,
    byType: byType as Record<ReminderType, number>,
    byPriority: byPriority as Record<ReminderPriority, number>,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const reminderEngine = {
  // Store
  createReminderStore,
  addReminder,
  updateReminder,
  getReminder,
  getRemindersByTask,
  getRemindersByUser,
  getScheduledReminders,

  // Creation
  generateReminderId,
  calculatePriority,
  buildReminderContent,
  createReminder,
  createDeadlineReminder,
  createOverdueReminder,

  // Operations
  markSent,
  markDelivered,
  markFailed,
  cancelReminder,
  snoozeReminder,
  unsnoozeReminder,

  // Scheduling
  isQuietHours,
  getNextSendTime,
  getDueReminders,
  getRemindersInWindow,

  // Batch
  groupByUser,
  applyDailyLimit,
  processBatch,

  // Analytics
  calculateMetrics,
}
