/**
 * Fairness Algorithm Service
 *
 * Implements weighted fairness calculation for task distribution:
 * - Historical load balancing
 * - Preference-based assignment
 * - Weighted fairness scores
 * - Fair share calculation
 */

// =============================================================================
// TYPES
// =============================================================================

export interface MemberProfile {
  id: string
  name: string
  householdId: string
  preferences: TaskPreferences
  availability: AvailabilitySchedule
  skills: string[]
  maxWeeklyLoad: number // Maximum tasks per week
  currentLoad: number
}

export interface TaskPreferences {
  preferred: string[] // Category IDs
  disliked: string[] // Category IDs
  blocked: string[] // Category IDs (absolutely won't do)
  preferredDays: number[] // 0-6 (Sunday-Saturday)
  preferredTimeSlots: TimeSlot[]
}

export interface TimeSlot {
  start: string // HH:mm
  end: string // HH:mm
}

export interface AvailabilitySchedule {
  weeklyHours: number
  schedule: DaySchedule[]
  exceptions: ScheduleException[]
}

export interface DaySchedule {
  day: number // 0-6
  available: boolean
  slots?: TimeSlot[]
}

export interface ScheduleException {
  date: string // ISO date
  available: boolean
  reason?: string
}

export interface TaskDefinition {
  id: string
  name: string
  category: string
  estimatedMinutes: number
  difficulty: number // 1-10
  requiredSkills: string[]
  preferredDay?: number
  deadline?: Date
  priority: number // 1-10
  recurrence?: RecurrencePattern
}

export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "monthly" | "none"

export interface HistoricalData {
  memberId: string
  taskCounts: Record<string, number> // categoryId -> count
  totalTasks: number
  totalMinutes: number
  averageRating: number
  completionRate: number
  lastAssignedAt?: Date
  weeklyHistory: WeeklySnapshot[]
}

export interface WeeklySnapshot {
  weekStart: string // ISO date
  taskCount: number
  minutesWorked: number
  categories: Record<string, number>
}

export interface FairnessScore {
  memberId: string
  overall: number // 0-100 (higher = needs more tasks)
  components: {
    loadBalance: number // Historical load balance
    recentActivity: number // Recent vs historical activity
    preferenceMatch: number // How well preferences are matched
    skillMatch: number // Skill alignment score
    availabilityMatch: number // Schedule alignment
  }
  recommendation: "assign" | "skip" | "maybe"
  reasons: string[]
}

export interface AssignmentResult {
  taskId: string
  assignedTo: string
  score: FairnessScore
  alternativeCandidates: Array<{ memberId: string; score: number }>
}

export interface FairnessReport {
  householdId: string
  period: { start: Date; end: Date }
  memberStats: MemberFairnessStats[]
  overallFairnessIndex: number // 0-100
  recommendations: string[]
}

export interface MemberFairnessStats {
  memberId: string
  memberName: string
  tasksAssigned: number
  tasksCompleted: number
  minutesWorked: number
  fairSharePercentage: number // Actual % of fair share
  categoryDistribution: Record<string, number>
  preferenceAlignment: number // 0-100
}

// =============================================================================
// CONSTANTS
// =============================================================================

const WEIGHTS = {
  loadBalance: 0.35,
  recentActivity: 0.25,
  preferenceMatch: 0.20,
  skillMatch: 0.10,
  availabilityMatch: 0.10,
} as const

const RECENCY_DECAY_FACTOR = 0.9 // 10% decay per week

// =============================================================================
// LOAD BALANCE CALCULATION
// =============================================================================

/**
 * Calculate fair share for each member based on their availability
 */
export function calculateFairShare(members: MemberProfile[]): Map<string, number> {
  const fairShares = new Map<string, number>()
  const totalCapacity = members.reduce((sum, m) => sum + m.maxWeeklyLoad, 0)

  if (totalCapacity === 0) {
    // Equal distribution if no capacity specified
    const equalShare = 100 / members.length
    members.forEach(m => fairShares.set(m.id, equalShare))
    return fairShares
  }

  members.forEach(member => {
    const share = (member.maxWeeklyLoad / totalCapacity) * 100
    fairShares.set(member.id, share)
  })

  return fairShares
}

/**
 * Calculate load balance score based on historical data
 * Higher score = member is underloaded and should receive more tasks
 */
export function calculateLoadBalanceScore(
  member: MemberProfile,
  history: HistoricalData,
  fairShare: number,
  totalHouseholdTasks: number
): number {
  if (totalHouseholdTasks === 0) return 50 // Neutral if no tasks

  const actualShare = (history.totalTasks / totalHouseholdTasks) * 100
  const deviation = fairShare - actualShare

  // Normalize to 0-100 scale
  // Positive deviation = under fair share = higher score
  // Negative deviation = over fair share = lower score
  const normalizedScore = 50 + (deviation * 2)

  return Math.max(0, Math.min(100, normalizedScore))
}

/**
 * Calculate recent activity score with decay
 * Higher score = less recent activity = should receive more tasks
 */
export function calculateRecentActivityScore(
  history: HistoricalData,
  weeksToConsider: number = 4
): number {
  if (history.weeklyHistory.length === 0) return 100 // No history = should get tasks

  const recentWeeks = history.weeklyHistory.slice(-weeksToConsider)
  let weightedActivity = 0
  let weightSum = 0

  recentWeeks.forEach((week, index) => {
    const weight = Math.pow(RECENCY_DECAY_FACTOR, weeksToConsider - index - 1)
    weightedActivity += week.taskCount * weight
    weightSum += weight
  })

  const averageActivity = weightedActivity / weightSum
  const expectedAverage = history.totalTasks / Math.max(history.weeklyHistory.length, 1)

  if (expectedAverage === 0) return 50

  // Calculate ratio of recent activity to expected
  const activityRatio = averageActivity / expectedAverage

  // Invert: less activity = higher score
  const score = 100 - (activityRatio * 50)

  return Math.max(0, Math.min(100, score))
}

// =============================================================================
// PREFERENCE MATCHING
// =============================================================================

/**
 * Calculate preference match score for a task assignment
 * Higher score = better match
 */
export function calculatePreferenceScore(
  member: MemberProfile,
  task: TaskDefinition
): number {
  const { preferences } = member
  let score = 50 // Neutral baseline

  // Blocked categories are absolute no-go
  if (preferences.blocked.includes(task.category)) {
    return 0
  }

  // Preferred category bonus
  if (preferences.preferred.includes(task.category)) {
    score += 30
  }

  // Disliked category penalty
  if (preferences.disliked.includes(task.category)) {
    score -= 25
  }

  // Preferred day bonus
  if (task.preferredDay !== undefined && preferences.preferredDays.includes(task.preferredDay)) {
    score += 15
  }

  // Check time slot alignment if task has preferred time
  if (task.deadline && preferences.preferredTimeSlots.length > 0) {
    const taskHour = task.deadline.getHours()
    const hasMatchingSlot = preferences.preferredTimeSlots.some(slot => {
      const startHour = parseInt(slot.start.split(":")[0] ?? "0", 10)
      const endHour = parseInt(slot.end.split(":")[0] ?? "0", 10)
      return taskHour >= startHour && taskHour <= endHour
    })

    if (hasMatchingSlot) {
      score += 5
    }
  }

  return Math.max(0, Math.min(100, score))
}

// =============================================================================
// SKILL MATCHING
// =============================================================================

/**
 * Calculate skill match score
 * Higher score = better skill alignment
 */
export function calculateSkillScore(
  member: MemberProfile,
  task: TaskDefinition
): number {
  if (task.requiredSkills.length === 0) return 100 // No skills required = perfect match

  const matchedSkills = task.requiredSkills.filter(skill =>
    member.skills.includes(skill)
  )

  const matchRatio = matchedSkills.length / task.requiredSkills.length
  return Math.round(matchRatio * 100)
}

// =============================================================================
// AVAILABILITY MATCHING
// =============================================================================

/**
 * Calculate availability match score
 * Higher score = better availability alignment
 */
export function calculateAvailabilityScore(
  member: MemberProfile,
  task: TaskDefinition,
  targetDate?: Date
): number {
  const { availability } = member
  let score = 100

  // Check if member has enough weekly hours
  if (availability.weeklyHours < task.estimatedMinutes / 60) {
    score -= 30
  }

  // Check day availability if target date specified
  if (targetDate) {
    const dayOfWeek = targetDate.getDay()
    const daySchedule = availability.schedule.find(s => s.day === dayOfWeek)

    if (!daySchedule || !daySchedule.available) {
      score -= 40
    }

    // Check for exceptions
    const dateStr = targetDate.toISOString().split("T")[0]
    const exception = availability.exceptions.find(e => e.date === dateStr)

    if (exception) {
      if (!exception.available) {
        score -= 50
      } else {
        score += 10 // Explicitly available on this date
      }
    }
  }

  // Penalty if current load is near max
  const loadRatio = member.currentLoad / member.maxWeeklyLoad
  if (loadRatio > 0.9) {
    score -= 40
  } else if (loadRatio > 0.7) {
    score -= 20
  }

  return Math.max(0, Math.min(100, score))
}

// =============================================================================
// COMBINED FAIRNESS SCORING
// =============================================================================

/**
 * Calculate comprehensive fairness score for a member-task pair
 */
export function calculateFairnessScore(
  member: MemberProfile,
  task: TaskDefinition,
  history: HistoricalData,
  fairShare: number,
  totalHouseholdTasks: number,
  targetDate?: Date
): FairnessScore {
  const loadBalance = calculateLoadBalanceScore(member, history, fairShare, totalHouseholdTasks)
  const recentActivity = calculateRecentActivityScore(history)
  const preferenceMatch = calculatePreferenceScore(member, task)
  const skillMatch = calculateSkillScore(member, task)
  const availabilityMatch = calculateAvailabilityScore(member, task, targetDate)

  // Calculate weighted overall score
  const overall = Math.round(
    loadBalance * WEIGHTS.loadBalance +
    recentActivity * WEIGHTS.recentActivity +
    preferenceMatch * WEIGHTS.preferenceMatch +
    skillMatch * WEIGHTS.skillMatch +
    availabilityMatch * WEIGHTS.availabilityMatch
  )

  // Determine recommendation
  const reasons: string[] = []
  let recommendation: FairnessScore["recommendation"] = "maybe"

  // Hard blockers
  if (preferenceMatch === 0) {
    recommendation = "skip"
    reasons.push("Task category is blocked by member preferences")
  } else if (skillMatch < 50 && task.requiredSkills.length > 0) {
    recommendation = "skip"
    reasons.push("Member lacks required skills")
  } else if (availabilityMatch < 30) {
    recommendation = "skip"
    reasons.push("Member unavailable during task time")
  } else if (overall >= 70) {
    recommendation = "assign"
    reasons.push("Good overall fit based on fairness metrics")
  }

  // Add explanatory reasons
  if (loadBalance > 70) {
    reasons.push("Member is currently underloaded")
  } else if (loadBalance < 30) {
    reasons.push("Member may be overloaded")
  }

  if (recentActivity > 70) {
    reasons.push("Member has had low recent activity")
  }

  if (preferenceMatch > 70) {
    reasons.push("Task matches member preferences")
  }

  return {
    memberId: member.id,
    overall,
    components: {
      loadBalance,
      recentActivity,
      preferenceMatch,
      skillMatch,
      availabilityMatch,
    },
    recommendation,
    reasons,
  }
}

// =============================================================================
// TASK ASSIGNMENT ENGINE
// =============================================================================

/**
 * Find the best member to assign a task to
 */
export function findBestAssignment(
  task: TaskDefinition,
  members: MemberProfile[],
  histories: Map<string, HistoricalData>,
  totalHouseholdTasks: number,
  targetDate?: Date
): AssignmentResult | null {
  if (members.length === 0) return null

  const fairShares = calculateFairShare(members)
  const scores: Array<{ member: MemberProfile; score: FairnessScore }> = []

  for (const member of members) {
    const history = histories.get(member.id) ?? createEmptyHistory(member.id)
    const fairShare = fairShares.get(member.id) ?? 0

    const score = calculateFairnessScore(
      member,
      task,
      history,
      fairShare,
      totalHouseholdTasks,
      targetDate
    )

    scores.push({ member, score })
  }

  // Sort by overall score (descending)
  scores.sort((a, b) => b.score.overall - a.score.overall)

  // Filter to only "assign" or "maybe" candidates
  const candidates = scores.filter(s => s.score.recommendation !== "skip")

  if (candidates.length === 0) {
    // All members blocked - return best "skip" as fallback info
    return null
  }

  const best = candidates[0]
  const alternatives = candidates.slice(1, 4).map(c => ({
    memberId: c.member.id,
    score: c.score.overall,
  }))

  return {
    taskId: task.id,
    assignedTo: best!.member.id,
    score: best!.score,
    alternativeCandidates: alternatives,
  }
}

/**
 * Assign multiple tasks fairly
 */
export function assignTasksBatch(
  tasks: TaskDefinition[],
  members: MemberProfile[],
  histories: Map<string, HistoricalData>
): AssignmentResult[] {
  const results: AssignmentResult[] = []
  const mutableHistories = new Map(histories)
  const mutableMembers = members.map(m => ({ ...m }))

  // Sort tasks by priority (high first)
  const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority)

  let totalTasks = Array.from(histories.values()).reduce(
    (sum, h) => sum + h.totalTasks,
    0
  )

  for (const task of sortedTasks) {
    const result = findBestAssignment(
      task,
      mutableMembers,
      mutableHistories,
      totalTasks
    )

    if (result) {
      results.push(result)

      // Update simulated state
      const memberIndex = mutableMembers.findIndex(m => m.id === result.assignedTo)
      if (memberIndex >= 0) {
        mutableMembers[memberIndex]!.currentLoad++
      }

      const history = mutableHistories.get(result.assignedTo)
      if (history) {
        history.totalTasks++
        history.taskCounts[task.category] = (history.taskCounts[task.category] ?? 0) + 1
      }

      totalTasks++
    }
  }

  return results
}

// =============================================================================
// FAIRNESS REPORTING
// =============================================================================

/**
 * Generate fairness report for a household
 */
export function generateFairnessReport(
  householdId: string,
  members: MemberProfile[],
  histories: Map<string, HistoricalData>,
  periodStart: Date,
  periodEnd: Date
): FairnessReport {
  const fairShares = calculateFairShare(members)
  const totalTasks = Array.from(histories.values()).reduce(
    (sum, h) => sum + h.totalTasks,
    0
  )

  const memberStats: MemberFairnessStats[] = members.map(member => {
    const history = histories.get(member.id) ?? createEmptyHistory(member.id)
    const fairShare = fairShares.get(member.id) ?? 0
    const actualShare = totalTasks > 0 ? (history.totalTasks / totalTasks) * 100 : 0
    const fairSharePercentage = fairShare > 0 ? (actualShare / fairShare) * 100 : 0

    // Calculate preference alignment
    const preferredTaskCount = Object.entries(history.taskCounts).reduce(
      (sum, [category, count]) =>
        member.preferences.preferred.includes(category) ? sum + count : sum,
      0
    )
    const preferenceAlignment =
      history.totalTasks > 0
        ? Math.round((preferredTaskCount / history.totalTasks) * 100)
        : 50

    return {
      memberId: member.id,
      memberName: member.name,
      tasksAssigned: history.totalTasks,
      tasksCompleted: Math.round(history.totalTasks * history.completionRate),
      minutesWorked: history.totalMinutes,
      fairSharePercentage: Math.round(fairSharePercentage),
      categoryDistribution: { ...history.taskCounts },
      preferenceAlignment,
    }
  })

  // Calculate overall fairness index (100 = perfectly fair)
  const deviations = memberStats.map(s => Math.abs(100 - s.fairSharePercentage))
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length
  const overallFairnessIndex = Math.max(0, Math.round(100 - avgDeviation))

  // Generate recommendations
  const recommendations: string[] = []

  const overloaded = memberStats.filter(s => s.fairSharePercentage > 120)
  const underloaded = memberStats.filter(s => s.fairSharePercentage < 80)

  if (overloaded.length > 0) {
    recommendations.push(
      `Consider reducing load for: ${overloaded.map(s => s.memberName).join(", ")}`
    )
  }

  if (underloaded.length > 0) {
    recommendations.push(
      `Consider assigning more tasks to: ${underloaded.map(s => s.memberName).join(", ")}`
    )
  }

  if (overallFairnessIndex < 70) {
    recommendations.push("Overall distribution could be improved")
  }

  const lowPreferenceAlignment = memberStats.filter(s => s.preferenceAlignment < 30)
  if (lowPreferenceAlignment.length > 0) {
    recommendations.push(
      `Task preferences not well-matched for: ${lowPreferenceAlignment.map(s => s.memberName).join(", ")}`
    )
  }

  return {
    householdId,
    period: { start: periodStart, end: periodEnd },
    memberStats,
    overallFairnessIndex,
    recommendations,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create empty history record
 */
export function createEmptyHistory(memberId: string): HistoricalData {
  return {
    memberId,
    taskCounts: {},
    totalTasks: 0,
    totalMinutes: 0,
    averageRating: 0,
    completionRate: 1,
    weeklyHistory: [],
  }
}

/**
 * Create member profile with defaults
 */
export function createMemberProfile(
  id: string,
  name: string,
  householdId: string,
  options: Partial<Omit<MemberProfile, "id" | "name" | "householdId">> = {}
): MemberProfile {
  return {
    id,
    name,
    householdId,
    preferences: options.preferences ?? {
      preferred: [],
      disliked: [],
      blocked: [],
      preferredDays: [],
      preferredTimeSlots: [],
    },
    availability: options.availability ?? {
      weeklyHours: 40,
      schedule: Array.from({ length: 7 }, (_, i) => ({
        day: i,
        available: i !== 0 && i !== 6, // Weekdays only by default
      })),
      exceptions: [],
    },
    skills: options.skills ?? [],
    maxWeeklyLoad: options.maxWeeklyLoad ?? 10,
    currentLoad: options.currentLoad ?? 0,
  }
}

/**
 * Calculate Gini coefficient for distribution fairness
 * 0 = perfect equality, 1 = maximum inequality
 */
export function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0 || values.every(v => v === 0)) return 0

  const n = values.length
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / n

  if (mean === 0) return 0

  let sumOfDifferences = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDifferences += Math.abs(sorted[i]! - sorted[j]!)
    }
  }

  return sumOfDifferences / (2 * n * n * mean)
}

/**
 * Suggest rebalancing actions
 */
export function suggestRebalancing(
  report: FairnessReport
): Array<{ action: string; from?: string; to?: string; impact: number }> {
  const suggestions: Array<{ action: string; from?: string; to?: string; impact: number }> = []

  const overloaded = report.memberStats.filter(s => s.fairSharePercentage > 130)
  const underloaded = report.memberStats.filter(s => s.fairSharePercentage < 70)

  for (const over of overloaded) {
    for (const under of underloaded) {
      const transferAmount = Math.min(
        over.fairSharePercentage - 100,
        100 - under.fairSharePercentage
      )

      suggestions.push({
        action: "transfer_tasks",
        from: over.memberName,
        to: under.memberName,
        impact: Math.round(transferAmount / 2),
      })
    }
  }

  // Sort by impact
  suggestions.sort((a, b) => b.impact - a.impact)

  return suggestions.slice(0, 5)
}
