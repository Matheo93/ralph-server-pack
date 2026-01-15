/**
 * Reminders API Route
 * Handles smart reminder management operations
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  reminderEngine,
  type Reminder,
  type ReminderStore,
  type Task,
  type UserPreferences,
} from "@/lib/reminders/reminder-engine"
import {
  urgencyCalculator,
  type TaskInput,
  type UrgencyScore,
} from "@/lib/reminders/urgency-calculator"
import {
  notificationOptimizer,
  type Notification,
  type UserActivity,
  type EngagementMetric,
  type RateLimitState,
} from "@/lib/reminders/notification-optimizer"

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  householdId: z.string(),
  assigneeId: z.string().nullable(),
  creatorId: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  deadline: z.string().datetime().nullable(),
  estimatedMinutes: z.number().nullable(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const UserPreferencesSchema = z.object({
  userId: z.string(),
  enableReminders: z.boolean().default(true),
  channels: z.array(z.enum(["push", "email", "sms", "in_app"])).default(["push", "in_app"]),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }).nullable(),
  timezone: z.string().default("Europe/Paris"),
  language: z.string().default("fr"),
  reminderLeadTimes: z.object({
    deadline: z.number().default(24),
    recurring: z.number().default(1),
    checkIn: z.number().default(48),
  }),
  maxRemindersPerDay: z.number().default(10),
})

const CreateReminderSchema = z.object({
  action: z.literal("create"),
  task: TaskSchema,
  userId: z.string(),
  type: z.enum(["deadline", "overdue", "recurring", "follow_up", "check_in", "nudge", "celebration", "weekly_summary"]),
  scheduledAt: z.string().datetime(),
  channels: z.array(z.enum(["push", "email", "sms", "in_app"])),
  language: z.string().optional(),
})

const CreateDeadlineReminderSchema = z.object({
  action: z.literal("create_deadline"),
  task: TaskSchema,
  userId: z.string(),
  preferences: UserPreferencesSchema,
})

const SnoozeReminderSchema = z.object({
  action: z.literal("snooze"),
  reminderId: z.string(),
  durationMinutes: z.number().min(5).max(1440),
})

const CancelReminderSchema = z.object({
  action: z.literal("cancel"),
  reminderId: z.string(),
})

const ProcessBatchSchema = z.object({
  action: z.literal("process_batch"),
  preferences: z.array(UserPreferencesSchema),
})

const CalculateUrgencySchema = z.object({
  action: z.literal("calculate_urgency"),
  task: TaskSchema.extend({
    dependencyCount: z.number().default(0),
    blockedTasks: z.number().default(0),
    lastActivityAt: z.string().datetime().nullable(),
    completionRate: z.number().nullable(),
  }),
})

const CalculateBatchUrgencySchema = z.object({
  action: z.literal("calculate_batch_urgency"),
  tasks: z.array(TaskSchema.extend({
    dependencyCount: z.number().default(0),
    blockedTasks: z.number().default(0),
    lastActivityAt: z.string().datetime().nullable(),
    completionRate: z.number().nullable(),
  })),
})

const OptimizeNotificationSchema = z.object({
  action: z.literal("optimize"),
  notification: z.object({
    id: z.string(),
    userId: z.string(),
    type: z.string(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    channel: z.enum(["push", "email", "sms", "in_app"]),
    content: z.object({
      title: z.string(),
      body: z.string(),
      metadata: z.record(z.string(), z.string()),
    }),
    scheduledAt: z.string().datetime(),
  }),
  activity: z.object({
    userId: z.string(),
    lastActiveAt: z.string().datetime(),
    activeHours: z.array(z.number()),
    activeDays: z.array(z.number()),
    averageSessionMinutes: z.number(),
    preferredChannels: z.array(z.enum(["push", "email", "sms", "in_app"])),
    deviceTypes: z.array(z.enum(["mobile", "desktop", "tablet"])),
  }),
  metrics: z.array(z.object({
    userId: z.string(),
    hourOfDay: z.number(),
    dayOfWeek: z.number(),
    openRate: z.number(),
    responseRate: z.number(),
    averageResponseTimeMinutes: z.number(),
    sampleSize: z.number(),
  })).optional(),
})

const RequestSchema = z.discriminatedUnion("action", [
  CreateReminderSchema,
  CreateDeadlineReminderSchema,
  SnoozeReminderSchema,
  CancelReminderSchema,
  ProcessBatchSchema,
  CalculateUrgencySchema,
  CalculateBatchUrgencySchema,
  OptimizeNotificationSchema,
])

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

let reminderStore = reminderEngine.createReminderStore()
const rateLimitStates = new Map<string, RateLimitState>()

// =============================================================================
// HELPERS
// =============================================================================

function parseTask(taskData: z.infer<typeof TaskSchema>): Task {
  return {
    ...taskData,
    deadline: taskData.deadline ? new Date(taskData.deadline) : null,
    completedAt: taskData.completedAt ? new Date(taskData.completedAt) : null,
    createdAt: new Date(taskData.createdAt),
    updatedAt: new Date(taskData.updatedAt),
  }
}

function parseTaskInput(taskData: z.infer<typeof CalculateUrgencySchema>["task"]): TaskInput {
  return {
    id: taskData.id,
    title: taskData.title,
    priority: taskData.priority,
    deadline: taskData.deadline ? new Date(taskData.deadline) : null,
    estimatedMinutes: taskData.estimatedMinutes,
    assigneeId: taskData.assigneeId,
    createdAt: new Date(taskData.createdAt),
    status: taskData.status,
    dependencyCount: taskData.dependencyCount,
    blockedTasks: taskData.blockedTasks,
    lastActivityAt: taskData.lastActivityAt ? new Date(taskData.lastActivityAt) : null,
    completionRate: taskData.completionRate,
  }
}

function parsePreferences(prefData: z.infer<typeof UserPreferencesSchema>): UserPreferences {
  return {
    ...prefData,
    quietHours: prefData.quietHours,
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

function handleCreateReminder(
  data: z.infer<typeof CreateReminderSchema>
): Reminder {
  const task = parseTask(data.task)

  const reminder = reminderEngine.createReminder({
    task,
    userId: data.userId,
    type: data.type,
    scheduledAt: new Date(data.scheduledAt),
    channels: data.channels,
    language: data.language,
  })

  reminderStore = reminderEngine.addReminder(reminderStore, reminder)

  return reminder
}

function handleCreateDeadlineReminder(
  data: z.infer<typeof CreateDeadlineReminderSchema>
): Reminder | null {
  const task = parseTask(data.task)
  const preferences = parsePreferences(data.preferences)

  const reminder = reminderEngine.createDeadlineReminder(task, data.userId, preferences)

  if (reminder) {
    reminderStore = reminderEngine.addReminder(reminderStore, reminder)
  }

  return reminder
}

function handleSnoozeReminder(
  data: z.infer<typeof SnoozeReminderSchema>
): Reminder {
  const reminder = reminderEngine.getReminder(reminderStore, data.reminderId)
  if (!reminder) {
    throw new Error(`Reminder not found: ${data.reminderId}`)
  }

  const snoozed = reminderEngine.snoozeReminder(reminder, data.durationMinutes)
  reminderStore = reminderEngine.updateReminder(reminderStore, snoozed)

  return snoozed
}

function handleCancelReminder(
  data: z.infer<typeof CancelReminderSchema>
): Reminder {
  const reminder = reminderEngine.getReminder(reminderStore, data.reminderId)
  if (!reminder) {
    throw new Error(`Reminder not found: ${data.reminderId}`)
  }

  const cancelled = reminderEngine.cancelReminder(reminder)
  reminderStore = reminderEngine.updateReminder(reminderStore, cancelled)

  return cancelled
}

function handleProcessBatch(
  data: z.infer<typeof ProcessBatchSchema>
): ReturnType<typeof reminderEngine.processBatch> {
  const preferencesMap = new Map<string, UserPreferences>()

  for (const pref of data.preferences) {
    preferencesMap.set(pref.userId, parsePreferences(pref))
  }

  const result = reminderEngine.processBatch(
    reminderStore,
    new Date(),
    preferencesMap
  )

  reminderStore = result.updated

  return result
}

function handleCalculateUrgency(
  data: z.infer<typeof CalculateUrgencySchema>
): UrgencyScore {
  const taskInput = parseTaskInput(data.task)
  return urgencyCalculator.calculateUrgencyScore(taskInput)
}

function handleCalculateBatchUrgency(
  data: z.infer<typeof CalculateBatchUrgencySchema>
): { scores: UrgencyScore[]; distribution: ReturnType<typeof urgencyCalculator.calculateDistribution> } {
  const taskInputs = data.tasks.map(parseTaskInput)
  const scores = urgencyCalculator.calculateBatchScores(taskInputs)
  const distribution = urgencyCalculator.calculateDistribution(scores)

  return { scores, distribution }
}

function handleOptimizeNotification(
  data: z.infer<typeof OptimizeNotificationSchema>
): ReturnType<typeof notificationOptimizer.optimizeNotification> {
  const notification: Notification = {
    ...data.notification,
    scheduledAt: new Date(data.notification.scheduledAt),
    originalScheduledAt: new Date(data.notification.scheduledAt),
    batchId: null,
    optimizationApplied: false,
  }

  const activity: UserActivity = {
    ...data.activity,
    lastActiveAt: new Date(data.activity.lastActiveAt),
  }

  const metrics: EngagementMetric[] = data.metrics ?? []

  // Get or create rate limit state
  let rateLimit = rateLimitStates.get(data.notification.userId)
  if (!rateLimit) {
    rateLimit = notificationOptimizer.createRateLimitState(data.notification.userId)
    rateLimitStates.set(data.notification.userId, rateLimit)
  }

  return notificationOptimizer.optimizeNotification(
    notification,
    activity,
    metrics,
    rateLimit
  )
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    let result: unknown

    switch (data.action) {
      case "create":
        result = handleCreateReminder(data)
        break
      case "create_deadline":
        result = handleCreateDeadlineReminder(data)
        break
      case "snooze":
        result = handleSnoozeReminder(data)
        break
      case "cancel":
        result = handleCancelReminder(data)
        break
      case "process_batch":
        result = handleProcessBatch(data)
        break
      case "calculate_urgency":
        result = handleCalculateUrgency(data)
        break
      case "calculate_batch_urgency":
        result = handleCalculateBatchUrgency(data)
        break
      case "optimize":
        result = handleOptimizeNotification(data)
        break
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Reminders API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")

  try {
    switch (action) {
      case "scheduled": {
        const reminders = reminderEngine.getScheduledReminders(reminderStore)
        return NextResponse.json({ success: true, data: reminders })
      }

      case "by_task": {
        const taskId = searchParams.get("taskId")
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: "taskId required" },
            { status: 400 }
          )
        }
        const reminders = reminderEngine.getRemindersByTask(reminderStore, taskId)
        return NextResponse.json({ success: true, data: reminders })
      }

      case "by_user": {
        const userId = searchParams.get("userId")
        if (!userId) {
          return NextResponse.json(
            { success: false, error: "userId required" },
            { status: 400 }
          )
        }
        const reminders = reminderEngine.getRemindersByUser(reminderStore, userId)
        return NextResponse.json({ success: true, data: reminders })
      }

      case "due": {
        const reminders = reminderEngine.getDueReminders(reminderStore)
        return NextResponse.json({ success: true, data: reminders })
      }

      case "metrics": {
        const allReminders = Array.from(reminderStore.reminders.values())
        const metrics = reminderEngine.calculateMetrics(allReminders)
        return NextResponse.json({ success: true, data: metrics })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
            validActions: ["scheduled", "by_task", "by_user", "due", "metrics"],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Reminders API GET error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
