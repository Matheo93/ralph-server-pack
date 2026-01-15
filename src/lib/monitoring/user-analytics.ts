/**
 * User Analytics Service
 *
 * Comprehensive user behavior tracking:
 * - Feature usage tracking
 * - Conversion funnels
 * - Retention metrics
 * - Engagement scoring
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type EventType = "page_view" | "feature_use" | "action" | "error" | "custom"
export type TimeGranularity = "hour" | "day" | "week" | "month"
export type UserSegment = "new" | "active" | "power" | "churned" | "resurrected"

export interface AnalyticsEvent {
  id: string
  userId: string
  householdId?: string
  type: EventType
  name: string
  category: string
  properties: Record<string, unknown>
  timestamp: Date
  sessionId: string
  deviceInfo?: DeviceInfo
  location?: LocationInfo
}

export interface DeviceInfo {
  platform: "web" | "ios" | "android" | "desktop"
  browser?: string
  browserVersion?: string
  os?: string
  osVersion?: string
  deviceType?: "mobile" | "tablet" | "desktop"
  screenWidth?: number
  screenHeight?: number
}

export interface LocationInfo {
  country?: string
  region?: string
  city?: string
  timezone?: string
}

export interface FeatureUsage {
  featureName: string
  category: string
  totalUses: number
  uniqueUsers: number
  avgUsesPerUser: number
  lastUsed: Date
  usageByDay: Map<string, number>
  usageByUserSegment: Record<UserSegment, number>
}

export interface FeatureAdoption {
  featureName: string
  totalUsers: number
  adoptedUsers: number
  adoptionRate: number
  timeToFirstUse: number // avg days
  retentionAfter7Days: number
  retentionAfter30Days: number
}

export interface FunnelStep {
  name: string
  eventName: string
  filters?: Record<string, unknown>
}

export interface FunnelDefinition {
  id: string
  name: string
  description: string
  steps: FunnelStep[]
  timeWindow: number // ms
}

export interface FunnelResult {
  funnelId: string
  funnelName: string
  startDate: Date
  endDate: Date
  steps: FunnelStepResult[]
  overallConversion: number
  avgTimeToComplete: number
}

export interface FunnelStepResult {
  stepIndex: number
  stepName: string
  entered: number
  completed: number
  dropped: number
  conversionRate: number
  dropoffRate: number
  avgTimeInStep: number
}

export interface RetentionCohort {
  cohortDate: Date
  cohortSize: number
  retention: Record<number, RetentionData> // day -> data
}

export interface RetentionData {
  retained: number
  retentionRate: number
  churned: number
}

export interface RetentionMatrix {
  cohorts: RetentionCohort[]
  avgRetention: Record<number, number> // day -> avg rate
  overallRetention: {
    day1: number
    day7: number
    day14: number
    day30: number
    day60: number
    day90: number
  }
}

export interface EngagementMetrics {
  userId: string
  score: number // 0-100
  level: "low" | "medium" | "high" | "power"
  daysActive: number
  totalSessions: number
  avgSessionDuration: number
  featuresUsed: number
  actionsPerSession: number
  lastActive: Date
  trend: "increasing" | "stable" | "decreasing"
}

export interface UserJourney {
  userId: string
  events: AnalyticsEvent[]
  firstSeen: Date
  lastSeen: Date
  totalSessions: number
  currentSegment: UserSegment
  milestones: UserMilestone[]
}

export interface UserMilestone {
  name: string
  achievedAt: Date
  metadata?: Record<string, unknown>
}

export interface SessionMetrics {
  sessionId: string
  userId: string
  startTime: Date
  endTime?: Date
  duration: number
  pageViews: number
  actions: number
  events: AnalyticsEvent[]
}

export interface DailyActiveUsers {
  date: Date
  total: number
  new: number
  returning: number
  churned: number
  resurrected: number
}

export interface MonthlyActiveUsers {
  month: string // YYYY-MM
  total: number
  avgDaily: number
  peakDaily: number
  newUsers: number
  churnedUsers: number
  churnRate: number
  growthRate: number
}

export interface AnalyticsSummary {
  period: {
    start: Date
    end: Date
  }
  users: {
    total: number
    active: number
    new: number
    churned: number
  }
  engagement: {
    avgSessionDuration: number
    avgActionsPerSession: number
    avgPagesPerSession: number
  }
  topFeatures: Array<{
    name: string
    uses: number
    uniqueUsers: number
  }>
  funnels: Array<{
    name: string
    conversion: number
  }>
  retention: {
    day1: number
    day7: number
    day30: number
  }
}

export interface UserActivityPattern {
  userId: string
  peakHours: number[]
  peakDays: number[]
  avgSessionsPerWeek: number
  preferredFeatures: string[]
  activityScore: number
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const AnalyticsEventSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  householdId: z.string().optional(),
  type: z.enum(["page_view", "feature_use", "action", "error", "custom"]),
  name: z.string().min(1),
  category: z.string().min(1),
  properties: z.record(z.string(), z.unknown()),
  timestamp: z.date(),
  sessionId: z.string().min(1),
})

export const FunnelDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  steps: z.array(z.object({
    name: z.string().min(1),
    eventName: z.string().min(1),
    filters: z.record(z.string(), z.unknown()).optional(),
  })).min(2),
  timeWindow: z.number().positive(),
})

// =============================================================================
// CONSTANTS
// =============================================================================

export const ENGAGEMENT_THRESHOLDS = {
  low: 20,
  medium: 50,
  high: 75,
  power: 90,
}

export const CHURN_DAYS = 30 // Days without activity to consider churned
export const RESURRECTION_DAYS = 30 // Days to consider a user resurrected

export const DEFAULT_FUNNELS: FunnelDefinition[] = [
  {
    id: "signup_to_first_task",
    name: "Signup to First Task",
    description: "User journey from registration to creating first task",
    steps: [
      { name: "Sign Up", eventName: "user_registered" },
      { name: "Create Household", eventName: "household_created" },
      { name: "Create First Task", eventName: "task_created" },
    ],
    timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  {
    id: "task_assignment_flow",
    name: "Task Assignment Flow",
    description: "Complete task assignment and completion flow",
    steps: [
      { name: "View Tasks", eventName: "tasks_viewed" },
      { name: "Assign Task", eventName: "task_assigned" },
      { name: "Complete Task", eventName: "task_completed" },
    ],
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
  },
  {
    id: "household_engagement",
    name: "Household Engagement",
    description: "Household member engagement flow",
    steps: [
      { name: "Join Household", eventName: "household_joined" },
      { name: "View Dashboard", eventName: "dashboard_viewed" },
      { name: "First Contribution", eventName: "task_completed" },
    ],
    timeWindow: 3 * 24 * 60 * 60 * 1000, // 3 days
  },
]

// =============================================================================
// EVENT CREATION
// =============================================================================

/**
 * Create analytics event
 */
export function createAnalyticsEvent(
  userId: string,
  type: EventType,
  name: string,
  category: string,
  sessionId: string,
  properties: Record<string, unknown> = {},
  householdId?: string
): AnalyticsEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    householdId,
    type,
    name,
    category,
    properties,
    timestamp: new Date(),
    sessionId,
  }
}

/**
 * Create page view event
 */
export function createPageViewEvent(
  userId: string,
  sessionId: string,
  pageName: string,
  path: string,
  householdId?: string
): AnalyticsEvent {
  return createAnalyticsEvent(
    userId,
    "page_view",
    pageName,
    "navigation",
    sessionId,
    { path, referrer: typeof document !== "undefined" ? document.referrer : "" },
    householdId
  )
}

/**
 * Create feature use event
 */
export function createFeatureUseEvent(
  userId: string,
  sessionId: string,
  featureName: string,
  category: string,
  metadata: Record<string, unknown> = {},
  householdId?: string
): AnalyticsEvent {
  return createAnalyticsEvent(
    userId,
    "feature_use",
    featureName,
    category,
    sessionId,
    metadata,
    householdId
  )
}

/**
 * Create action event
 */
export function createActionEvent(
  userId: string,
  sessionId: string,
  actionName: string,
  category: string,
  metadata: Record<string, unknown> = {},
  householdId?: string
): AnalyticsEvent {
  return createAnalyticsEvent(
    userId,
    "action",
    actionName,
    category,
    sessionId,
    metadata,
    householdId
  )
}

// =============================================================================
// FEATURE USAGE TRACKING
// =============================================================================

/**
 * Create feature usage tracker
 */
export function createFeatureUsage(
  featureName: string,
  category: string
): FeatureUsage {
  return {
    featureName,
    category,
    totalUses: 0,
    uniqueUsers: 0,
    avgUsesPerUser: 0,
    lastUsed: new Date(),
    usageByDay: new Map(),
    usageByUserSegment: {
      new: 0,
      active: 0,
      power: 0,
      churned: 0,
      resurrected: 0,
    },
  }
}

/**
 * Record feature usage
 */
export function recordFeatureUsage(
  usage: FeatureUsage,
  userId: string,
  segment: UserSegment,
  existingUsers: Set<string>
): FeatureUsage {
  const today = new Date().toISOString().split("T")[0]!
  const newTotalUses = usage.totalUses + 1
  const isNewUser = !existingUsers.has(userId)
  const newUniqueUsers = isNewUser ? usage.uniqueUsers + 1 : usage.uniqueUsers

  const newUsageByDay = new Map(usage.usageByDay)
  newUsageByDay.set(today, (newUsageByDay.get(today) ?? 0) + 1)

  const newUsageBySegment = { ...usage.usageByUserSegment }
  newUsageBySegment[segment]++

  return {
    ...usage,
    totalUses: newTotalUses,
    uniqueUsers: newUniqueUsers,
    avgUsesPerUser: newUniqueUsers > 0 ? newTotalUses / newUniqueUsers : 0,
    lastUsed: new Date(),
    usageByDay: newUsageByDay,
    usageByUserSegment: newUsageBySegment,
  }
}

/**
 * Calculate feature adoption
 */
export function calculateFeatureAdoption(
  featureName: string,
  events: AnalyticsEvent[],
  allUsers: string[],
  userFirstSeen: Map<string, Date>
): FeatureAdoption {
  const featureEvents = events.filter(e =>
    e.name === featureName && e.type === "feature_use"
  )

  const adoptedUsers = new Set(featureEvents.map(e => e.userId))
  const adoptedUsersArray = Array.from(adoptedUsers)

  // Calculate time to first use
  let totalTimeToFirstUse = 0
  let usersWithFirstUse = 0

  for (const userId of adoptedUsersArray) {
    const firstSeen = userFirstSeen.get(userId)
    const firstUse = featureEvents
      .filter(e => e.userId === userId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]

    if (firstSeen && firstUse) {
      totalTimeToFirstUse += firstUse.timestamp.getTime() - firstSeen.getTime()
      usersWithFirstUse++
    }
  }

  const avgTimeToFirstUseDays = usersWithFirstUse > 0
    ? (totalTimeToFirstUse / usersWithFirstUse) / (1000 * 60 * 60 * 24)
    : 0

  // Calculate retention (simplified)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const usersActiveAfter7Days = adoptedUsersArray.filter(userId =>
    featureEvents.some(e =>
      e.userId === userId && e.timestamp >= sevenDaysAgo
    )
  ).length

  const usersActiveAfter30Days = adoptedUsersArray.filter(userId =>
    featureEvents.some(e =>
      e.userId === userId && e.timestamp >= thirtyDaysAgo
    )
  ).length

  return {
    featureName,
    totalUsers: allUsers.length,
    adoptedUsers: adoptedUsers.size,
    adoptionRate: allUsers.length > 0
      ? Math.round((adoptedUsers.size / allUsers.length) * 10000) / 100
      : 0,
    timeToFirstUse: Math.round(avgTimeToFirstUseDays * 10) / 10,
    retentionAfter7Days: adoptedUsers.size > 0
      ? Math.round((usersActiveAfter7Days / adoptedUsers.size) * 10000) / 100
      : 0,
    retentionAfter30Days: adoptedUsers.size > 0
      ? Math.round((usersActiveAfter30Days / adoptedUsers.size) * 10000) / 100
      : 0,
  }
}

/**
 * Get top features by usage
 */
export function getTopFeatures(
  usageMap: Map<string, FeatureUsage>,
  limit: number = 10
): Array<{ name: string; uses: number; uniqueUsers: number }> {
  return Array.from(usageMap.entries())
    .map(([name, usage]) => ({
      name,
      uses: usage.totalUses,
      uniqueUsers: usage.uniqueUsers,
    }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, limit)
}

// =============================================================================
// FUNNEL ANALYSIS
// =============================================================================

/**
 * Analyze funnel
 */
export function analyzeFunnel(
  funnel: FunnelDefinition,
  events: AnalyticsEvent[],
  startDate: Date,
  endDate: Date
): FunnelResult {
  const stepResults: FunnelStepResult[] = []

  // Filter events by date range
  const filteredEvents = events.filter(e =>
    e.timestamp >= startDate && e.timestamp <= endDate
  )

  // Group events by user
  const eventsByUser = new Map<string, AnalyticsEvent[]>()
  for (const event of filteredEvents) {
    const userEvents = eventsByUser.get(event.userId) ?? []
    userEvents.push(event)
    eventsByUser.set(event.userId, userEvents)
  }

  // Track users at each step
  let usersInFunnel = new Set<string>()
  let previousStepTimes = new Map<string, Date>()

  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i]!
    const stepUsers = new Set<string>()
    const stepTimes = new Map<string, Date>()
    let totalTimeInStep = 0
    let usersWithTime = 0

    for (const [userId, userEvents] of eventsByUser) {
      // For first step, check if user has the event
      if (i === 0) {
        const stepEvent = userEvents.find(e =>
          e.name === step.eventName &&
          matchesFilters(e, step.filters)
        )

        if (stepEvent) {
          stepUsers.add(userId)
          usersInFunnel.add(userId)
          stepTimes.set(userId, stepEvent.timestamp)
        }
      } else {
        // For subsequent steps, check if user was in previous step
        if (!usersInFunnel.has(userId)) continue

        const previousTime = previousStepTimes.get(userId)
        if (!previousTime) continue

        // Find event after previous step, within time window
        const stepEvent = userEvents.find(e =>
          e.name === step.eventName &&
          e.timestamp > previousTime &&
          e.timestamp.getTime() - previousTime.getTime() <= funnel.timeWindow &&
          matchesFilters(e, step.filters)
        )

        if (stepEvent) {
          stepUsers.add(userId)
          stepTimes.set(userId, stepEvent.timestamp)

          const timeInStep = stepEvent.timestamp.getTime() - previousTime.getTime()
          totalTimeInStep += timeInStep
          usersWithTime++
        }
      }
    }

    const entered = i === 0 ? stepUsers.size : usersInFunnel.size
    const completed = stepUsers.size
    const dropped = entered - completed

    stepResults.push({
      stepIndex: i,
      stepName: step.name,
      entered,
      completed,
      dropped,
      conversionRate: entered > 0 ? Math.round((completed / entered) * 10000) / 100 : 0,
      dropoffRate: entered > 0 ? Math.round((dropped / entered) * 10000) / 100 : 0,
      avgTimeInStep: usersWithTime > 0 ? Math.round(totalTimeInStep / usersWithTime) : 0,
    })

    // Update for next iteration
    usersInFunnel = stepUsers
    previousStepTimes = stepTimes
  }

  // Calculate overall metrics
  const firstStep = stepResults[0]
  const lastStep = stepResults[stepResults.length - 1]!
  const totalStarted = firstStep?.entered ?? 0
  const totalCompleted = lastStep.completed

  const totalTime = stepResults.reduce((sum, step) => sum + step.avgTimeInStep, 0)

  return {
    funnelId: funnel.id,
    funnelName: funnel.name,
    startDate,
    endDate,
    steps: stepResults,
    overallConversion: totalStarted > 0
      ? Math.round((totalCompleted / totalStarted) * 10000) / 100
      : 0,
    avgTimeToComplete: totalTime,
  }
}

/**
 * Check if event matches filters
 */
function matchesFilters(
  event: AnalyticsEvent,
  filters?: Record<string, unknown>
): boolean {
  if (!filters) return true

  for (const [key, value] of Object.entries(filters)) {
    if (event.properties[key] !== value) return false
  }

  return true
}

/**
 * Identify funnel bottlenecks
 */
export function identifyBottlenecks(
  result: FunnelResult
): Array<{ stepName: string; dropoffRate: number; recommendation: string }> {
  return result.steps
    .filter(step => step.dropoffRate > 20)
    .map(step => ({
      stepName: step.stepName,
      dropoffRate: step.dropoffRate,
      recommendation: step.dropoffRate > 50
        ? `Critical: ${step.dropoffRate}% dropoff - investigate UX and technical issues`
        : step.dropoffRate > 30
          ? `High: ${step.dropoffRate}% dropoff - consider simplifying this step`
          : `Moderate: ${step.dropoffRate}% dropoff - monitor and test improvements`,
    }))
    .sort((a, b) => b.dropoffRate - a.dropoffRate)
}

// =============================================================================
// RETENTION ANALYSIS
// =============================================================================

/**
 * Calculate retention cohort
 */
export function calculateRetentionCohort(
  cohortDate: Date,
  userFirstSeen: Map<string, Date>,
  userLastSeen: Map<string, Date>,
  maxDays: number = 90
): RetentionCohort {
  // Find users in this cohort
  const cohortStart = new Date(cohortDate)
  cohortStart.setHours(0, 0, 0, 0)
  const cohortEnd = new Date(cohortDate)
  cohortEnd.setHours(23, 59, 59, 999)

  const cohortUsers: string[] = []
  for (const [userId, firstSeen] of userFirstSeen) {
    if (firstSeen >= cohortStart && firstSeen <= cohortEnd) {
      cohortUsers.push(userId)
    }
  }

  const cohortSize = cohortUsers.length
  const retention: Record<number, RetentionData> = {}

  // Calculate retention for each day
  for (let day = 1; day <= maxDays; day++) {
    const targetDate = new Date(cohortStart)
    targetDate.setDate(targetDate.getDate() + day)

    let retained = 0
    for (const userId of cohortUsers) {
      const lastSeen = userLastSeen.get(userId)
      if (lastSeen && lastSeen >= targetDate) {
        retained++
      }
    }

    retention[day] = {
      retained,
      retentionRate: cohortSize > 0
        ? Math.round((retained / cohortSize) * 10000) / 100
        : 0,
      churned: cohortSize - retained,
    }
  }

  return {
    cohortDate,
    cohortSize,
    retention,
  }
}

/**
 * Build retention matrix
 */
export function buildRetentionMatrix(
  cohorts: RetentionCohort[],
  keyDays: number[] = [1, 7, 14, 30, 60, 90]
): RetentionMatrix {
  // Calculate average retention per day
  const avgRetention: Record<number, number> = {}
  const maxDay = Math.max(...keyDays)

  for (let day = 1; day <= maxDay; day++) {
    const rates: number[] = []
    for (const cohort of cohorts) {
      const dayData = cohort.retention[day]
      if (dayData) {
        rates.push(dayData.retentionRate)
      }
    }
    avgRetention[day] = rates.length > 0
      ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100
      : 0
  }

  return {
    cohorts,
    avgRetention,
    overallRetention: {
      day1: avgRetention[1] ?? 0,
      day7: avgRetention[7] ?? 0,
      day14: avgRetention[14] ?? 0,
      day30: avgRetention[30] ?? 0,
      day60: avgRetention[60] ?? 0,
      day90: avgRetention[90] ?? 0,
    },
  }
}

/**
 * Calculate churn rate
 */
export function calculateChurnRate(
  activeUsersStart: number,
  activeUsersEnd: number,
  newUsers: number
): number {
  // Churn = (Lost Users) / (Start Users + New Users)
  const lostUsers = activeUsersStart + newUsers - activeUsersEnd
  const denominator = activeUsersStart + newUsers

  if (denominator === 0) return 0
  return Math.round((lostUsers / denominator) * 10000) / 100
}

// =============================================================================
// USER SEGMENTATION
// =============================================================================

/**
 * Determine user segment
 */
export function determineUserSegment(
  userId: string,
  firstSeen: Date,
  lastSeen: Date,
  sessionCount: number,
  actionsCount: number,
  now: Date = new Date()
): UserSegment {
  const daysSinceFirstSeen = (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
  const daysSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)

  // New user: first seen within last 7 days
  if (daysSinceFirstSeen <= 7) {
    return "new"
  }

  // Churned user: not seen in CHURN_DAYS
  if (daysSinceLastSeen >= CHURN_DAYS) {
    return "churned"
  }

  // Resurrected: was churned but came back
  const wasChurned = daysSinceLastSeen < CHURN_DAYS &&
    daysSinceFirstSeen > CHURN_DAYS + RESURRECTION_DAYS

  if (wasChurned) {
    return "resurrected"
  }

  // Power user: high engagement
  const avgActionsPerSession = sessionCount > 0 ? actionsCount / sessionCount : 0
  const avgSessionsPerWeek = sessionCount / (daysSinceFirstSeen / 7)

  if (avgSessionsPerWeek >= 5 && avgActionsPerSession >= 10) {
    return "power"
  }

  return "active"
}

/**
 * Segment users
 */
export function segmentUsers(
  users: Array<{
    userId: string
    firstSeen: Date
    lastSeen: Date
    sessionCount: number
    actionsCount: number
  }>
): Map<UserSegment, string[]> {
  const segments = new Map<UserSegment, string[]>([
    ["new", []],
    ["active", []],
    ["power", []],
    ["churned", []],
    ["resurrected", []],
  ])

  for (const user of users) {
    const segment = determineUserSegment(
      user.userId,
      user.firstSeen,
      user.lastSeen,
      user.sessionCount,
      user.actionsCount
    )
    segments.get(segment)!.push(user.userId)
  }

  return segments
}

// =============================================================================
// ENGAGEMENT SCORING
// =============================================================================

/**
 * Calculate engagement score
 */
export function calculateEngagementScore(
  sessionsLast30Days: number,
  avgSessionDuration: number, // minutes
  featuresUsed: number,
  totalFeatures: number,
  actionsPerSession: number
): number {
  // Session frequency (0-25 points)
  // 1+ sessions per day = 25, scale down from there
  const sessionScore = Math.min(sessionsLast30Days / 30 * 25, 25)

  // Session duration (0-25 points)
  // 15+ minutes = 25
  const durationScore = Math.min(avgSessionDuration / 15 * 25, 25)

  // Feature adoption (0-25 points)
  const featureScore = totalFeatures > 0
    ? (featuresUsed / totalFeatures) * 25
    : 0

  // Actions per session (0-25 points)
  // 10+ actions = 25
  const actionScore = Math.min(actionsPerSession / 10 * 25, 25)

  return Math.round(sessionScore + durationScore + featureScore + actionScore)
}

/**
 * Get engagement level from score
 */
export function getEngagementLevel(
  score: number
): "low" | "medium" | "high" | "power" {
  if (score >= ENGAGEMENT_THRESHOLDS.power) return "power"
  if (score >= ENGAGEMENT_THRESHOLDS.high) return "high"
  if (score >= ENGAGEMENT_THRESHOLDS.medium) return "medium"
  return "low"
}

/**
 * Calculate engagement metrics for user
 */
export function calculateEngagementMetrics(
  userId: string,
  events: AnalyticsEvent[],
  sessions: SessionMetrics[],
  totalFeatures: number
): EngagementMetrics {
  const userEvents = events.filter(e => e.userId === userId)
  const userSessions = sessions.filter(s => s.userId === userId)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentSessions = userSessions.filter(s => s.startTime >= thirtyDaysAgo)

  // Calculate metrics
  const sessionsLast30Days = recentSessions.length
  const avgSessionDuration = recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + s.duration, 0) / recentSessions.length / 60000
    : 0

  const featuresUsed = new Set(
    userEvents
      .filter(e => e.type === "feature_use")
      .map(e => e.name)
  ).size

  const actionsPerSession = recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + s.actions, 0) / recentSessions.length
    : 0

  const score = calculateEngagementScore(
    sessionsLast30Days,
    avgSessionDuration,
    featuresUsed,
    totalFeatures,
    actionsPerSession
  )

  // Calculate trend
  const firstHalfSessions = recentSessions.filter(s =>
    s.startTime < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
  )
  const secondHalfSessions = recentSessions.filter(s =>
    s.startTime >= new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
  )

  let trend: "increasing" | "stable" | "decreasing" = "stable"
  if (secondHalfSessions.length > firstHalfSessions.length * 1.2) {
    trend = "increasing"
  } else if (secondHalfSessions.length < firstHalfSessions.length * 0.8) {
    trend = "decreasing"
  }

  const lastActive = userSessions.length > 0
    ? userSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]!.startTime
    : new Date(0)

  const firstSeen = userEvents.length > 0
    ? userEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]!.timestamp
    : new Date()

  const daysActive = Math.ceil(
    (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    userId,
    score,
    level: getEngagementLevel(score),
    daysActive,
    totalSessions: userSessions.length,
    avgSessionDuration: avgSessionDuration * 60000, // Convert back to ms
    featuresUsed,
    actionsPerSession,
    lastActive,
    trend,
  }
}

// =============================================================================
// DAILY/MONTHLY ACTIVE USERS
// =============================================================================

/**
 * Calculate daily active users
 */
export function calculateDailyActiveUsers(
  date: Date,
  events: AnalyticsEvent[],
  userFirstSeen: Map<string, Date>,
  userSegments: Map<string, UserSegment>
): DailyActiveUsers {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const activeUsers = new Set<string>()
  const newUsers = new Set<string>()
  const resurrectedUsers = new Set<string>()

  for (const event of events) {
    if (event.timestamp >= dayStart && event.timestamp <= dayEnd) {
      activeUsers.add(event.userId)

      const firstSeen = userFirstSeen.get(event.userId)
      if (firstSeen && firstSeen >= dayStart && firstSeen <= dayEnd) {
        newUsers.add(event.userId)
      }

      const segment = userSegments.get(event.userId)
      if (segment === "resurrected") {
        resurrectedUsers.add(event.userId)
      }
    }
  }

  // Count churned (users who were active before but not today)
  const previouslyActive = new Set<string>()
  const thirtyDaysAgo = new Date(dayStart)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const event of events) {
    if (event.timestamp >= thirtyDaysAgo && event.timestamp < dayStart) {
      previouslyActive.add(event.userId)
    }
  }

  const churnedUsers = new Set<string>()
  for (const userId of previouslyActive) {
    if (!activeUsers.has(userId)) {
      churnedUsers.add(userId)
    }
  }

  return {
    date,
    total: activeUsers.size,
    new: newUsers.size,
    returning: activeUsers.size - newUsers.size - resurrectedUsers.size,
    churned: churnedUsers.size,
    resurrected: resurrectedUsers.size,
  }
}

/**
 * Calculate monthly active users
 */
export function calculateMonthlyActiveUsers(
  year: number,
  month: number,
  events: AnalyticsEvent[],
  previousMonthMAU?: MonthlyActiveUsers
): MonthlyActiveUsers {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  const daysInMonth = monthEnd.getDate()

  const activeUsersInMonth = new Set<string>()
  const dailyActiveUsers: number[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStart = new Date(year, month - 1, day)
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999)

    const dailyUsers = new Set<string>()
    for (const event of events) {
      if (event.timestamp >= dayStart && event.timestamp <= dayEnd) {
        dailyUsers.add(event.userId)
        activeUsersInMonth.add(event.userId)
      }
    }
    dailyActiveUsers.push(dailyUsers.size)
  }

  // Find new users this month
  const newUsers = new Set<string>()
  for (const event of events) {
    if (event.timestamp >= monthStart && event.timestamp <= monthEnd) {
      if (event.name === "user_registered" || event.type === "page_view") {
        // Simplified: count first events as potential new users
        newUsers.add(event.userId)
      }
    }
  }

  const total = activeUsersInMonth.size
  const avgDaily = dailyActiveUsers.length > 0
    ? Math.round(dailyActiveUsers.reduce((a, b) => a + b, 0) / dailyActiveUsers.length)
    : 0
  const peakDaily = dailyActiveUsers.length > 0
    ? Math.max(...dailyActiveUsers)
    : 0

  const previousTotal = previousMonthMAU?.total ?? total
  const churnedUsers = Math.max(0, previousTotal - total + newUsers.size)

  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    total,
    avgDaily,
    peakDaily,
    newUsers: newUsers.size,
    churnedUsers,
    churnRate: previousTotal > 0
      ? Math.round((churnedUsers / previousTotal) * 10000) / 100
      : 0,
    growthRate: previousTotal > 0
      ? Math.round(((total - previousTotal) / previousTotal) * 10000) / 100
      : 0,
  }
}

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

/**
 * Generate analytics summary
 */
export function generateAnalyticsSummary(
  events: AnalyticsEvent[],
  sessions: SessionMetrics[],
  funnelResults: FunnelResult[],
  retentionMatrix: RetentionMatrix,
  featureUsage: Map<string, FeatureUsage>,
  startDate: Date,
  endDate: Date
): AnalyticsSummary {
  // Filter to period
  const periodEvents = events.filter(e =>
    e.timestamp >= startDate && e.timestamp <= endDate
  )
  const periodSessions = sessions.filter(s =>
    s.startTime >= startDate && s.startTime <= endDate
  )

  // User counts
  const uniqueUsers = new Set(periodEvents.map(e => e.userId))
  const newUserEvents = periodEvents.filter(e => e.name === "user_registered")
  const newUsers = new Set(newUserEvents.map(e => e.userId))

  // Engagement metrics
  const avgSessionDuration = periodSessions.length > 0
    ? periodSessions.reduce((sum, s) => sum + s.duration, 0) / periodSessions.length
    : 0
  const avgActionsPerSession = periodSessions.length > 0
    ? periodSessions.reduce((sum, s) => sum + s.actions, 0) / periodSessions.length
    : 0
  const avgPagesPerSession = periodSessions.length > 0
    ? periodSessions.reduce((sum, s) => sum + s.pageViews, 0) / periodSessions.length
    : 0

  // Top features
  const topFeatures = getTopFeatures(featureUsage, 5)

  // Funnel conversions
  const funnelConversions = funnelResults.map(f => ({
    name: f.funnelName,
    conversion: f.overallConversion,
  }))

  return {
    period: {
      start: startDate,
      end: endDate,
    },
    users: {
      total: uniqueUsers.size,
      active: uniqueUsers.size,
      new: newUsers.size,
      churned: 0, // Would need historical data
    },
    engagement: {
      avgSessionDuration,
      avgActionsPerSession,
      avgPagesPerSession,
    },
    topFeatures,
    funnels: funnelConversions,
    retention: {
      day1: retentionMatrix.overallRetention.day1,
      day7: retentionMatrix.overallRetention.day7,
      day30: retentionMatrix.overallRetention.day30,
    },
  }
}

// =============================================================================
// ACTIVITY PATTERNS
// =============================================================================

/**
 * Analyze user activity pattern
 */
export function analyzeActivityPattern(
  userId: string,
  events: AnalyticsEvent[]
): UserActivityPattern {
  const userEvents = events.filter(e => e.userId === userId)

  // Analyze peak hours
  const hourCounts: Record<number, number> = {}
  for (let i = 0; i < 24; i++) hourCounts[i] = 0

  // Analyze peak days
  const dayCounts: Record<number, number> = {}
  for (let i = 0; i < 7; i++) dayCounts[i] = 0

  // Count features
  const featureSet = new Set<string>()

  for (const event of userEvents) {
    const hour = event.timestamp.getHours()
    const day = event.timestamp.getDay()

    hourCounts[hour]!++
    dayCounts[day]!++

    if (event.type === "feature_use") {
      featureSet.add(event.name)
    }
  }

  // Find peak hours (top 3)
  const peakHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // Find peak days (top 3)
  const peakDays = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day]) => parseInt(day))

  // Calculate sessions per week
  const firstEvent = userEvents[0]
  const lastEvent = userEvents[userEvents.length - 1]
  const weeks = firstEvent && lastEvent
    ? Math.max(1, (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 1

  const sessionIds = new Set(userEvents.map(e => e.sessionId))
  const avgSessionsPerWeek = sessionIds.size / weeks

  // Activity score (0-100)
  const activityScore = Math.min(100, Math.round(avgSessionsPerWeek * 10 + featureSet.size * 5))

  return {
    userId,
    peakHours,
    peakDays,
    avgSessionsPerWeek: Math.round(avgSessionsPerWeek * 10) / 10,
    preferredFeatures: Array.from(featureSet).slice(0, 10),
    activityScore,
  }
}

/**
 * Get day name from day index
 */
export function getDayName(dayIndex: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[dayIndex] ?? "Unknown"
}

/**
 * Format hour for display
 */
export function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:00 ${ampm}`
}
