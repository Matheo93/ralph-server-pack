/**
 * Smart Scheduler Service
 *
 * Intelligent task scheduling with:
 * - Time preference learning
 * - Pattern recognition
 * - Optimal time suggestions
 * - Workload balancing
 */

import { z } from "zod"

// ============================================================
// TYPES
// ============================================================

export interface Task {
  id: string
  title: string
  deadline?: string | Date | null
  priority: "low" | "normal" | "high" | "urgent"
  estimatedDuration?: number // minutes
  category?: string
  childId?: string
  assignedTo?: string
  completedAt?: string | Date | null
  createdAt?: string | Date
}

export interface TimeSlot {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  hour: number // 0-23
  score: number // 0-1 preference score
}

export interface UserPattern {
  userId: string
  preferredHours: number[] // Hours when user is most active
  preferredDays: number[] // Days when user completes most tasks
  avgTasksPerDay: number
  avgCompletionTime: number // Average minutes to complete tasks
  categoryPreferences: Map<string, TimeSlot[]>
  lastUpdated: Date
}

export interface ScheduleSuggestion {
  taskId: string
  suggestedTime: Date
  confidence: number // 0-1
  reason: string
  alternatives: Date[]
}

export interface DaySchedule {
  date: Date
  slots: ScheduledSlot[]
  workload: number // 0-1 how full the day is
}

export interface ScheduledSlot {
  time: Date
  taskId: string
  duration: number
  isFixed: boolean // Has deadline vs flexible
}

// ============================================================
// SCHEMAS
// ============================================================

export const TimePreferenceSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  hour: z.number().min(0).max(23),
  score: z.number().min(0).max(1),
})

export const TaskForSchedulingSchema = z.object({
  id: z.string(),
  title: z.string(),
  deadline: z.string().nullable().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  estimatedDuration: z.number().optional(),
  category: z.string().optional(),
  childId: z.string().optional(),
  assignedTo: z.string().optional(),
})

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_TASK_DURATION = 30 // minutes
const HOURS_IN_DAY = 24
const DAYS_IN_WEEK = 7
const MIN_CONFIDENCE_THRESHOLD = 0.3
const LEARNING_WEIGHT = 0.1 // How much new data affects patterns

// Default productive hours (9 AM - 9 PM)
const DEFAULT_PRODUCTIVE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

// Priority weights for scheduling
const PRIORITY_WEIGHTS: Record<Task["priority"], number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
}

// ============================================================
// PATTERN LEARNING
// ============================================================

/**
 * Initialize empty user pattern
 */
export function createEmptyPattern(userId: string): UserPattern {
  return {
    userId,
    preferredHours: [...DEFAULT_PRODUCTIVE_HOURS],
    preferredDays: [1, 2, 3, 4, 5], // Monday-Friday
    avgTasksPerDay: 5,
    avgCompletionTime: DEFAULT_TASK_DURATION,
    categoryPreferences: new Map(),
    lastUpdated: new Date(),
  }
}

/**
 * Learn patterns from completed tasks
 */
export function learnFromCompletedTasks(
  existingPattern: UserPattern,
  completedTasks: Task[]
): UserPattern {
  if (completedTasks.length === 0) {
    return existingPattern
  }

  // Analyze completion times
  const completionHours: number[] = []
  const completionDays: number[] = []
  const categoryTimes: Map<string, number[]> = new Map()

  for (const task of completedTasks) {
    if (!task.completedAt) continue

    const completedDate = new Date(task.completedAt)
    const hour = completedDate.getHours()
    const day = completedDate.getDay()

    completionHours.push(hour)
    completionDays.push(day)

    if (task.category) {
      const times = categoryTimes.get(task.category) || []
      times.push(hour)
      categoryTimes.set(task.category, times)
    }
  }

  // Calculate preferred hours (hours with most completions)
  const hourCounts = new Map<number, number>()
  for (const hour of completionHours) {
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
  }

  const sortedHours = [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hour]) => hour)
    .sort((a, b) => a - b)

  // Calculate preferred days
  const dayCounts = new Map<number, number>()
  for (const day of completionDays) {
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
  }

  const sortedDays = [...dayCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([day]) => day)
    .sort((a, b) => a - b)

  // Update category preferences
  const newCategoryPrefs = new Map(existingPattern.categoryPreferences)
  for (const [category, hours] of categoryTimes) {
    const hourFreq = new Map<number, number>()
    for (const h of hours) {
      hourFreq.set(h, (hourFreq.get(h) || 0) + 1)
    }

    const slots: TimeSlot[] = [...hourFreq.entries()].map(([hour, count]) => ({
      dayOfWeek: -1, // Any day
      hour,
      score: Math.min(count / hours.length + 0.3, 1),
    }))

    newCategoryPrefs.set(category, slots)
  }

  // Blend with existing pattern using learning weight
  const blendedHours = blendArrays(
    existingPattern.preferredHours,
    sortedHours.length > 0 ? sortedHours : existingPattern.preferredHours,
    LEARNING_WEIGHT
  )

  const blendedDays = blendArrays(
    existingPattern.preferredDays,
    sortedDays.length > 0 ? sortedDays : existingPattern.preferredDays,
    LEARNING_WEIGHT
  )

  // Calculate average tasks per day
  const tasksByDay = new Map<string, number>()
  for (const task of completedTasks) {
    if (!task.completedAt) continue
    const dateKey = new Date(task.completedAt).toDateString()
    tasksByDay.set(dateKey, (tasksByDay.get(dateKey) || 0) + 1)
  }

  const avgTasks = tasksByDay.size > 0
    ? [...tasksByDay.values()].reduce((a, b) => a + b, 0) / tasksByDay.size
    : existingPattern.avgTasksPerDay

  return {
    ...existingPattern,
    preferredHours: blendedHours,
    preferredDays: blendedDays,
    avgTasksPerDay: existingPattern.avgTasksPerDay * (1 - LEARNING_WEIGHT) + avgTasks * LEARNING_WEIGHT,
    categoryPreferences: newCategoryPrefs,
    lastUpdated: new Date(),
  }
}

/**
 * Blend two arrays with a weight factor
 */
function blendArrays(existing: number[], newData: number[], weight: number): number[] {
  // Combine both arrays, preferring items from both
  const combined = new Set([...existing, ...newData])
  const result = [...combined].sort((a, b) => a - b)

  // If too many items, prefer the existing ones
  if (result.length > existing.length + 2) {
    return result.slice(0, existing.length + 2)
  }

  return result
}

// ============================================================
// SCHEDULING ALGORITHM
// ============================================================

/**
 * Calculate optimal time score for a task
 */
export function calculateTimeScore(
  time: Date,
  task: Task,
  pattern: UserPattern,
  existingSchedule: ScheduledSlot[]
): number {
  let score = 0.5 // Base score

  const hour = time.getHours()
  const dayOfWeek = time.getDay()

  // Preferred hour bonus
  if (pattern.preferredHours.includes(hour)) {
    score += 0.2
  }

  // Preferred day bonus
  if (pattern.preferredDays.includes(dayOfWeek)) {
    score += 0.1
  }

  // Category preference bonus
  if (task.category && pattern.categoryPreferences.has(task.category)) {
    const categorySlots = pattern.categoryPreferences.get(task.category)!
    const matchingSlot = categorySlots.find(s => s.hour === hour)
    if (matchingSlot) {
      score += matchingSlot.score * 0.15
    }
  }

  // Deadline proximity (higher urgency = higher score for earlier times)
  if (task.deadline) {
    const deadline = new Date(task.deadline)
    const hoursUntilDeadline = (deadline.getTime() - time.getTime()) / (1000 * 60 * 60)

    if (hoursUntilDeadline < 24) {
      score += 0.3 // Very urgent
    } else if (hoursUntilDeadline < 72) {
      score += 0.2 // Urgent
    } else if (hoursUntilDeadline < 168) {
      score += 0.1 // This week
    }
  }

  // Priority bonus
  score += (PRIORITY_WEIGHTS[task.priority] - 1) * 0.05

  // Penalize if slot is already busy
  const duration = task.estimatedDuration || DEFAULT_TASK_DURATION
  const slotEnd = new Date(time.getTime() + duration * 60 * 1000)

  for (const scheduled of existingSchedule) {
    const scheduledEnd = new Date(scheduled.time.getTime() + scheduled.duration * 60 * 1000)

    // Check for overlap
    if (time < scheduledEnd && slotEnd > scheduled.time) {
      score -= 0.4 // Heavy penalty for conflicts
    }
  }

  // Penalize very early or very late hours
  if (hour < 7 || hour > 21) {
    score -= 0.3
  } else if (hour < 8 || hour > 20) {
    score -= 0.1
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Generate schedule suggestions for a task
 */
export function suggestSchedule(
  task: Task,
  pattern: UserPattern,
  existingSchedule: ScheduledSlot[],
  options: {
    startDate?: Date
    daysToConsider?: number
    maxSuggestions?: number
  } = {}
): ScheduleSuggestion {
  const {
    startDate = new Date(),
    daysToConsider = 7,
    maxSuggestions = 3,
  } = options

  const candidates: { time: Date; score: number }[] = []

  // Generate candidate time slots
  for (let day = 0; day < daysToConsider; day++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + day)

    for (const hour of pattern.preferredHours) {
      const candidate = new Date(date)
      candidate.setHours(hour, 0, 0, 0)

      // Skip if in the past
      if (candidate < startDate) continue

      // Skip if past deadline
      if (task.deadline && candidate > new Date(task.deadline)) continue

      const score = calculateTimeScore(candidate, task, pattern, existingSchedule)
      candidates.push({ time: candidate, score })
    }
  }

  // Sort by score
  candidates.sort((a, b) => b.score - a.score)

  // Take top candidates
  const best = candidates[0]
  const alternatives = candidates
    .slice(1, maxSuggestions)
    .map(c => c.time)

  if (!best || best.score < MIN_CONFIDENCE_THRESHOLD) {
    // Fallback to next available slot
    const fallback = new Date(startDate)
    fallback.setHours(10, 0, 0, 0)
    if (fallback < startDate) {
      fallback.setDate(fallback.getDate() + 1)
    }

    return {
      taskId: task.id,
      suggestedTime: fallback,
      confidence: 0.3,
      reason: "Suggestion basée sur les heures de bureau standard",
      alternatives: [],
    }
  }

  // Generate reason
  const reason = generateReason(best.time, task, pattern, best.score)

  return {
    taskId: task.id,
    suggestedTime: best.time,
    confidence: best.score,
    reason,
    alternatives,
  }
}

/**
 * Generate human-readable reason for suggestion
 */
function generateReason(
  time: Date,
  task: Task,
  pattern: UserPattern,
  score: number
): string {
  const reasons: string[] = []
  const hour = time.getHours()
  const dayOfWeek = time.getDay()
  const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

  if (pattern.preferredHours.includes(hour)) {
    reasons.push(`${hour}h est une de vos heures les plus productives`)
  }

  if (pattern.preferredDays.includes(dayOfWeek)) {
    reasons.push(`${dayNames[dayOfWeek]} est un jour où vous êtes souvent actif`)
  }

  if (task.deadline) {
    const deadline = new Date(task.deadline)
    const hoursUntil = (deadline.getTime() - time.getTime()) / (1000 * 60 * 60)
    if (hoursUntil < 24) {
      reasons.push("la deadline approche")
    }
  }

  if (task.category && pattern.categoryPreferences.has(task.category)) {
    reasons.push(`vous traitez souvent les tâches "${task.category}" à cette heure`)
  }

  if (reasons.length === 0) {
    return "Créneau disponible pendant vos heures habituelles"
  }

  return reasons.slice(0, 2).join(" et ")
}

// ============================================================
// BATCH SCHEDULING
// ============================================================

/**
 * Schedule multiple tasks optimally
 */
export function scheduleMultipleTasks(
  tasks: Task[],
  pattern: UserPattern,
  existingSchedule: ScheduledSlot[] = [],
  options: {
    startDate?: Date
    daysToConsider?: number
  } = {}
): ScheduleSuggestion[] {
  const { startDate = new Date(), daysToConsider = 7 } = options

  // Sort tasks by priority and deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    // Deadline first
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    if (a.deadline && b.deadline) {
      const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (diff !== 0) return diff
    }

    // Then priority
    return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
  })

  const suggestions: ScheduleSuggestion[] = []
  const schedule = [...existingSchedule]

  for (const task of sortedTasks) {
    const suggestion = suggestSchedule(task, pattern, schedule, {
      startDate,
      daysToConsider,
    })

    suggestions.push(suggestion)

    // Add to schedule for next iteration
    schedule.push({
      time: suggestion.suggestedTime,
      taskId: task.id,
      duration: task.estimatedDuration || DEFAULT_TASK_DURATION,
      isFixed: !!task.deadline,
    })
  }

  return suggestions
}

/**
 * Generate a weekly schedule view
 */
export function generateWeeklySchedule(
  tasks: Task[],
  pattern: UserPattern,
  startDate: Date = new Date()
): DaySchedule[] {
  const suggestions = scheduleMultipleTasks(tasks, pattern, [], {
    startDate,
    daysToConsider: 7,
  })

  // Group by day
  const dayMap = new Map<string, ScheduledSlot[]>()

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dayMap.set(date.toDateString(), [])
  }

  for (const suggestion of suggestions) {
    const dateKey = suggestion.suggestedTime.toDateString()
    const slots = dayMap.get(dateKey) || []
    const task = tasks.find(t => t.id === suggestion.taskId)

    slots.push({
      time: suggestion.suggestedTime,
      taskId: suggestion.taskId,
      duration: task?.estimatedDuration || DEFAULT_TASK_DURATION,
      isFixed: !!task?.deadline,
    })

    dayMap.set(dateKey, slots)
  }

  // Calculate workload
  const maxDailyMinutes = pattern.avgTasksPerDay * pattern.avgCompletionTime * 1.5

  return [...dayMap.entries()].map(([dateStr, slots]) => {
    const totalMinutes = slots.reduce((sum, s) => sum + s.duration, 0)

    return {
      date: new Date(dateStr),
      slots: slots.sort((a, b) => a.time.getTime() - b.time.getTime()),
      workload: Math.min(totalMinutes / maxDailyMinutes, 1),
    }
  })
}

// ============================================================
// WORKLOAD ANALYSIS
// ============================================================

/**
 * Calculate workload balance for a day
 */
export function calculateDayWorkload(
  scheduledTasks: ScheduledSlot[],
  pattern: UserPattern
): {
  totalMinutes: number
  workloadPercent: number
  isOverloaded: boolean
  suggestion: string
} {
  const totalMinutes = scheduledTasks.reduce((sum, slot) => sum + slot.duration, 0)
  const expectedMax = pattern.avgTasksPerDay * pattern.avgCompletionTime

  const workloadPercent = Math.min((totalMinutes / expectedMax) * 100, 150)
  const isOverloaded = workloadPercent > 100

  let suggestion = ""
  if (isOverloaded) {
    const overBy = totalMinutes - expectedMax
    suggestion = `Journée chargée ! Envisagez de reporter ${Math.round(overBy)} minutes de tâches.`
  } else if (workloadPercent < 50) {
    suggestion = "Journée légère - bon moment pour des tâches moins urgentes."
  } else {
    suggestion = "Charge de travail équilibrée."
  }

  return {
    totalMinutes,
    workloadPercent,
    isOverloaded,
    suggestion,
  }
}

/**
 * Find the best day for a new task
 */
export function findBestDayForTask(
  task: Task,
  weekSchedule: DaySchedule[],
  pattern: UserPattern
): { date: Date; reason: string } {
  // Filter days before deadline if exists
  let eligibleDays = weekSchedule
  if (task.deadline) {
    const deadline = new Date(task.deadline)
    eligibleDays = weekSchedule.filter(d => d.date <= deadline)
  }

  if (eligibleDays.length === 0) {
    return {
      date: weekSchedule[0]?.date || new Date(),
      reason: "Aucun jour disponible avant la deadline",
    }
  }

  // Sort by workload (prefer less busy days)
  const sorted = [...eligibleDays].sort((a, b) => a.workload - b.workload)

  // Prefer days in user's preferred days
  const preferred = sorted.filter(d => pattern.preferredDays.includes(d.date.getDay()))

  const best = preferred[0] || sorted[0]
  const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

  if (!best) {
    return { date: new Date(), reason: "Aucun jour disponible" }
  }

  let reason = `${dayNames[best.date.getDay()]} `
  if (best.workload < 0.5) {
    reason += "est une journée légère"
  } else if (best.workload < 0.8) {
    reason += "a encore de la disponibilité"
  } else {
    reason += "est le jour le moins chargé"
  }

  return { date: best.date, reason }
}

// ============================================================
// SMART SCHEDULER CLASS
// ============================================================

export class SmartScheduler {
  private pattern: UserPattern

  constructor(userId: string, initialPattern?: UserPattern) {
    this.pattern = initialPattern || createEmptyPattern(userId)
  }

  /**
   * Get current user pattern
   */
  getPattern(): UserPattern {
    return { ...this.pattern }
  }

  /**
   * Update pattern with completed tasks
   */
  learn(completedTasks: Task[]): void {
    this.pattern = learnFromCompletedTasks(this.pattern, completedTasks)
  }

  /**
   * Suggest time for a single task
   */
  suggest(task: Task, existingSchedule: ScheduledSlot[] = []): ScheduleSuggestion {
    return suggestSchedule(task, this.pattern, existingSchedule)
  }

  /**
   * Schedule multiple tasks
   */
  scheduleAll(tasks: Task[], existingSchedule: ScheduledSlot[] = []): ScheduleSuggestion[] {
    return scheduleMultipleTasks(tasks, this.pattern, existingSchedule)
  }

  /**
   * Get weekly view
   */
  getWeeklySchedule(tasks: Task[]): DaySchedule[] {
    return generateWeeklySchedule(tasks, this.pattern)
  }

  /**
   * Check workload for a day
   */
  checkWorkload(scheduledTasks: ScheduledSlot[]): ReturnType<typeof calculateDayWorkload> {
    return calculateDayWorkload(scheduledTasks, this.pattern)
  }

  /**
   * Find best day for a task
   */
  findBestDay(task: Task): { date: Date; reason: string } {
    const weekSchedule = generateWeeklySchedule([], this.pattern)
    return findBestDayForTask(task, weekSchedule, this.pattern)
  }

  /**
   * Export pattern for storage
   */
  exportPattern(): object {
    return {
      ...this.pattern,
      categoryPreferences: Object.fromEntries(this.pattern.categoryPreferences),
    }
  }

  /**
   * Import pattern from storage
   */
  importPattern(data: Record<string, unknown>): void {
    this.pattern = {
      userId: data["userId"] as string,
      preferredHours: data["preferredHours"] as number[],
      preferredDays: data["preferredDays"] as number[],
      avgTasksPerDay: data["avgTasksPerDay"] as number,
      avgCompletionTime: data["avgCompletionTime"] as number,
      categoryPreferences: new Map(
        Object.entries(data["categoryPreferences"] as Record<string, TimeSlot[]> || {})
      ),
      lastUpdated: new Date(data["lastUpdated"] as string),
    }
  }
}

/**
 * Create a smart scheduler instance
 */
export function createSmartScheduler(
  userId: string,
  savedPattern?: Record<string, unknown>
): SmartScheduler {
  const scheduler = new SmartScheduler(userId)

  if (savedPattern) {
    scheduler.importPattern(savedPattern)
  }

  return scheduler
}
