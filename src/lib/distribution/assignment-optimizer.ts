/**
 * Assignment Optimizer
 *
 * Optimal task assignment with:
 * - Workload balancing algorithm
 * - Rotation enforcement
 * - Exclusion period handling
 * - Override capability
 * - Fair distribution scoring
 */

import { z } from "zod"
import {
  calculateTaskWeight,
  calculateFatigueLevel,
  getCategoryWeight,
  TaskWeightInputSchema as BaseTaskWeightInputSchema,
  HistoricalLoadEntrySchema as BaseHistoricalLoadEntrySchema,
  type TaskWeightInput,
  type HistoricalLoadEntry,
} from "./load-calculator-v2"

// =============================================================================
// SCHEMAS
// =============================================================================

// Extended task schema with required skills
export const TaskWeightInputSchemaWithSkills = BaseTaskWeightInputSchema.extend({
  requiredSkills: z.array(z.string()).default([]),
})

export type TaskWeightInputWithSkills = z.infer<typeof TaskWeightInputSchemaWithSkills>

export const MemberAvailabilitySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  isActive: z.boolean().default(true),
  currentLoad: z.number().default(0),
  maxWeeklyLoad: z.number().default(20),
  preferredCategories: z.array(z.string()).default([]),
  blockedCategories: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  exclusionPeriods: z
    .array(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        reason: z.string().optional(),
      })
    )
    .default([]),
})

export const AssignmentRequestSchema = z.object({
  task: TaskWeightInputSchemaWithSkills,
  candidates: z.array(MemberAvailabilitySchema),
  historicalEntries: z.array(BaseHistoricalLoadEntrySchema),
  targetDate: z.date().optional(),
  forceAssignee: z.string().optional(),
  rotationEnabled: z.boolean().default(true),
})

export const AssignmentScoreSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  totalScore: z.number(),
  components: z.object({
    loadBalance: z.number(),
    categoryPreference: z.number(),
    skillMatch: z.number(),
    availability: z.number(),
    rotation: z.number(),
    fatigue: z.number(),
  }),
  eligible: z.boolean(),
  disqualifyReason: z.string().optional(),
})

export const AssignmentResultSchema = z.object({
  taskId: z.string(),
  assignedTo: z.string(),
  assignedToName: z.string(),
  score: AssignmentScoreSchema,
  alternativeCandidates: z.array(
    z.object({
      userId: z.string(),
      userName: z.string(),
      score: z.number(),
    })
  ),
  wasForced: z.boolean(),
  explanation: z.array(z.string()),
})

export const BatchAssignmentResultSchema = z.object({
  assignments: z.array(AssignmentResultSchema),
  unassigned: z.array(
    z.object({
      taskId: z.string(),
      reason: z.string(),
    })
  ),
  balanceImpact: z.object({
    beforeScore: z.number(),
    afterScore: z.number(),
    improvement: z.number(),
  }),
})

// =============================================================================
// TYPES
// =============================================================================

export type MemberAvailability = z.infer<typeof MemberAvailabilitySchema>
export type AssignmentRequest = z.infer<typeof AssignmentRequestSchema>
export type AssignmentScore = z.infer<typeof AssignmentScoreSchema>
export type AssignmentResult = z.infer<typeof AssignmentResultSchema>
export type BatchAssignmentResult = z.infer<typeof BatchAssignmentResultSchema>

export interface RotationTracker {
  categoryLastAssigned: Map<string, Map<string, Date>> // category -> userId -> lastDate
  taskTypeLastAssigned: Map<string, Map<string, Date>> // taskType -> userId -> lastDate
}

export interface ExclusionPeriod {
  startDate: Date
  endDate: Date
  reason?: string
}

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const SCORING_WEIGHTS = {
  loadBalance: 0.30,
  categoryPreference: 0.20,
  skillMatch: 0.15,
  availability: 0.15,
  rotation: 0.10,
  fatigue: 0.10,
} as const

// =============================================================================
// ELIGIBILITY CHECKS
// =============================================================================

/**
 * Check if member is currently in exclusion period
 */
export function isInExclusionPeriod(
  member: MemberAvailability,
  date: Date = new Date()
): { excluded: boolean; reason?: string } {
  for (const period of member.exclusionPeriods) {
    if (date >= period.startDate && date <= period.endDate) {
      return { excluded: true, reason: period.reason ?? "Période d'exclusion" }
    }
  }
  return { excluded: false }
}

/**
 * Check if member can handle task category
 */
export function canHandleCategory(
  member: MemberAvailability,
  category: string
): { canHandle: boolean; reason?: string } {
  if (member.blockedCategories.includes(category)) {
    return { canHandle: false, reason: `Catégorie bloquée: ${category}` }
  }
  return { canHandle: true }
}

/**
 * Check if member has required skills
 */
export function hasRequiredSkills(
  member: MemberAvailability,
  requiredSkills: string[]
): { hasSkills: boolean; matchRatio: number } {
  if (requiredSkills.length === 0) {
    return { hasSkills: true, matchRatio: 1 }
  }

  const matchedSkills = requiredSkills.filter((skill) =>
    member.skills.includes(skill)
  )
  const matchRatio = matchedSkills.length / requiredSkills.length

  return {
    hasSkills: matchRatio >= 0.5, // At least 50% skills required
    matchRatio,
  }
}

/**
 * Check if member has capacity for more tasks
 */
export function hasCapacity(member: MemberAvailability): {
  hasCapacity: boolean
  loadPercentage: number
} {
  const loadPercentage = (member.currentLoad / member.maxWeeklyLoad) * 100
  return {
    hasCapacity: loadPercentage < 100,
    loadPercentage,
  }
}

/**
 * Check complete eligibility for a member
 */
export function checkEligibility(
  member: MemberAvailability,
  task: TaskWeightInputWithSkills,
  targetDate?: Date
): { eligible: boolean; reason?: string } {
  // Check if member is active
  if (!member.isActive) {
    return { eligible: false, reason: "Membre inactif" }
  }

  // Check exclusion period
  const exclusion = isInExclusionPeriod(member, targetDate)
  if (exclusion.excluded) {
    return { eligible: false, reason: exclusion.reason }
  }

  // Check category
  const category = canHandleCategory(member, task.category)
  if (!category.canHandle) {
    return { eligible: false, reason: category.reason }
  }

  // Check skills
  const skills = hasRequiredSkills(member, task.requiredSkills)
  if (!skills.hasSkills) {
    return {
      eligible: false,
      reason: `Compétences insuffisantes (${Math.round(skills.matchRatio * 100)}%)`,
    }
  }

  // Check capacity
  const capacity = hasCapacity(member)
  if (!capacity.hasCapacity) {
    return {
      eligible: false,
      reason: `Capacité dépassée (${Math.round(capacity.loadPercentage)}%)`,
    }
  }

  return { eligible: true }
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate load balance score (higher = better candidate due to lower load)
 */
export function calculateLoadBalanceScore(
  member: MemberAvailability,
  allMembers: MemberAvailability[]
): number {
  const totalLoad = allMembers.reduce((sum, m) => sum + m.currentLoad, 0)

  if (totalLoad === 0) return 50 // Neutral if no tasks

  const memberPercentage = (member.currentLoad / totalLoad) * 100
  const idealPercentage = 100 / allMembers.length
  const deviation = memberPercentage - idealPercentage

  // Negative deviation = under fair share = higher score (should get task)
  // Score ranges from 0 to 100
  const score = 50 - deviation
  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate category preference score
 */
export function calculateCategoryPreferenceScore(
  member: MemberAvailability,
  category: string
): number {
  let score = 50 // Neutral baseline

  if (member.preferredCategories.includes(category)) {
    score += 40
  }

  // Already checked blocked in eligibility, but add slight negative for neutral
  if (!member.preferredCategories.includes(category)) {
    score -= 5
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate skill match score
 */
export function calculateSkillMatchScore(
  member: MemberAvailability,
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 100

  const matchedSkills = requiredSkills.filter((skill) =>
    member.skills.includes(skill)
  )
  const matchRatio = matchedSkills.length / requiredSkills.length

  return Math.round(matchRatio * 100)
}

/**
 * Calculate availability score
 */
export function calculateAvailabilityScore(
  member: MemberAvailability,
  targetDate?: Date
): number {
  let score = 100

  // Check load percentage
  const loadPercentage = (member.currentLoad / member.maxWeeklyLoad) * 100

  if (loadPercentage >= 90) score -= 50
  else if (loadPercentage >= 70) score -= 30
  else if (loadPercentage >= 50) score -= 10

  // Check proximity to exclusion periods
  if (targetDate) {
    for (const period of member.exclusionPeriods) {
      const daysUntilExclusion = Math.floor(
        (period.startDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000)
      )

      if (daysUntilExclusion > 0 && daysUntilExclusion <= 3) {
        score -= 20 // Close to exclusion period
      }
    }
  }

  return Math.max(0, score)
}

/**
 * Calculate rotation score based on last assignment
 */
export function calculateRotationScore(
  member: MemberAvailability,
  category: string,
  rotationTracker: RotationTracker
): number {
  const categoryMap = rotationTracker.categoryLastAssigned.get(category)

  if (!categoryMap) return 100 // No previous assignments in this category

  const lastAssigned = categoryMap.get(member.userId)

  if (!lastAssigned) return 100 // Never assigned this category

  const daysSinceAssigned = Math.floor(
    (Date.now() - lastAssigned.getTime()) / (24 * 60 * 60 * 1000)
  )

  // More days since last assignment = higher score
  if (daysSinceAssigned >= 14) return 100
  if (daysSinceAssigned >= 7) return 80
  if (daysSinceAssigned >= 3) return 60
  if (daysSinceAssigned >= 1) return 40
  return 20 // Same day - low rotation score
}

/**
 * Calculate fatigue penalty score
 */
export function calculateFatigueScore(
  member: MemberAvailability,
  historicalEntries: HistoricalLoadEntry[]
): number {
  const fatigueLevel = calculateFatigueLevel(
    historicalEntries,
    member.userId
  )

  // Lower fatigue = higher score (better candidate)
  if (fatigueLevel <= 20) return 100
  if (fatigueLevel <= 40) return 80
  if (fatigueLevel <= 60) return 60
  if (fatigueLevel <= 80) return 40
  return 20 // High fatigue - penalize
}

/**
 * Calculate comprehensive assignment score
 */
export function calculateAssignmentScore(
  member: MemberAvailability,
  task: TaskWeightInputWithSkills,
  allMembers: MemberAvailability[],
  historicalEntries: HistoricalLoadEntry[],
  rotationTracker: RotationTracker,
  targetDate?: Date
): AssignmentScore {
  // Check eligibility first
  const eligibility = checkEligibility(member, task, targetDate)

  if (!eligibility.eligible) {
    return {
      userId: member.userId,
      userName: member.userName,
      totalScore: 0,
      components: {
        loadBalance: 0,
        categoryPreference: 0,
        skillMatch: 0,
        availability: 0,
        rotation: 0,
        fatigue: 0,
      },
      eligible: false,
      disqualifyReason: eligibility.reason,
    }
  }

  // Calculate component scores
  const loadBalance = calculateLoadBalanceScore(member, allMembers)
  const categoryPreference = calculateCategoryPreferenceScore(
    member,
    task.category
  )
  const skillMatch = calculateSkillMatchScore(member, task.requiredSkills)
  const availability = calculateAvailabilityScore(member, targetDate)
  const rotation = calculateRotationScore(member, task.category, rotationTracker)
  const fatigue = calculateFatigueScore(member, historicalEntries)

  // Calculate weighted total
  const totalScore = Math.round(
    loadBalance * SCORING_WEIGHTS.loadBalance +
      categoryPreference * SCORING_WEIGHTS.categoryPreference +
      skillMatch * SCORING_WEIGHTS.skillMatch +
      availability * SCORING_WEIGHTS.availability +
      rotation * SCORING_WEIGHTS.rotation +
      fatigue * SCORING_WEIGHTS.fatigue
  )

  return {
    userId: member.userId,
    userName: member.userName,
    totalScore,
    components: {
      loadBalance,
      categoryPreference,
      skillMatch,
      availability,
      rotation,
      fatigue,
    },
    eligible: true,
  }
}

// =============================================================================
// ASSIGNMENT ALGORITHM
// =============================================================================

/**
 * Find optimal assignee for a task
 */
export function findOptimalAssignee(
  task: TaskWeightInput,
  candidates: MemberAvailability[],
  historicalEntries: HistoricalLoadEntry[],
  rotationTracker: RotationTracker,
  targetDate?: Date,
  forceAssignee?: string
): AssignmentResult | null {
  const explanation: string[] = []

  // Handle forced assignment
  if (forceAssignee) {
    const forcedMember = candidates.find((c) => c.userId === forceAssignee)

    if (forcedMember) {
      const score = calculateAssignmentScore(
        forcedMember,
        task,
        candidates,
        historicalEntries,
        rotationTracker,
        targetDate
      )

      explanation.push(`Attribution forcée à ${forcedMember.userName}`)
      if (!score.eligible) {
        explanation.push(
          `Attention: ${score.disqualifyReason ?? "membre non éligible"}`
        )
      }

      return {
        taskId: task.taskId,
        assignedTo: forcedMember.userId,
        assignedToName: forcedMember.userName,
        score,
        alternativeCandidates: [],
        wasForced: true,
        explanation,
      }
    }
  }

  // Calculate scores for all candidates
  const scores: AssignmentScore[] = candidates.map((candidate) =>
    calculateAssignmentScore(
      candidate,
      task,
      candidates,
      historicalEntries,
      rotationTracker,
      targetDate
    )
  )

  // Filter eligible candidates
  const eligibleScores = scores.filter((s) => s.eligible)

  if (eligibleScores.length === 0) {
    explanation.push("Aucun membre éligible trouvé")
    const reasons = scores
      .filter((s) => s.disqualifyReason)
      .map((s) => `${s.userName}: ${s.disqualifyReason}`)
    explanation.push(...reasons)
    return null
  }

  // Sort by score (descending)
  const sortedScores = [...eligibleScores].sort(
    (a, b) => b.totalScore - a.totalScore
  )

  const best = sortedScores[0]!
  const alternatives = sortedScores.slice(1, 4).map((s) => ({
    userId: s.userId,
    userName: s.userName,
    score: s.totalScore,
  }))

  // Build explanation
  explanation.push(`Meilleur candidat: ${best.userName} (score: ${best.totalScore})`)

  if (best.components.loadBalance > 70) {
    explanation.push("Charge actuelle équilibrée")
  }
  if (best.components.categoryPreference > 70) {
    explanation.push(`Préférence pour la catégorie ${task.category}`)
  }
  if (best.components.rotation < 50) {
    explanation.push("Attention: rotation faible pour cette catégorie")
  }
  if (best.components.fatigue < 50) {
    explanation.push("Attention: niveau de fatigue élevé")
  }

  return {
    taskId: task.taskId,
    assignedTo: best.userId,
    assignedToName: best.userName,
    score: best,
    alternativeCandidates: alternatives,
    wasForced: false,
    explanation,
  }
}

/**
 * Assign multiple tasks optimally
 */
export function assignTasksBatch(
  tasks: TaskWeightInput[],
  candidates: MemberAvailability[],
  historicalEntries: HistoricalLoadEntry[],
  rotationTracker: RotationTracker
): BatchAssignmentResult {
  const assignments: AssignmentResult[] = []
  const unassigned: Array<{ taskId: string; reason: string }> = []

  // Create mutable copies for simulation
  const mutableCandidates = candidates.map((c) => ({ ...c }))
  const mutableTracker: RotationTracker = {
    categoryLastAssigned: new Map(rotationTracker.categoryLastAssigned),
    taskTypeLastAssigned: new Map(rotationTracker.taskTypeLastAssigned),
  }

  // Calculate initial balance score
  const initialLoads = mutableCandidates.map((c) => c.currentLoad)
  const beforeScore = calculateBalanceScore(initialLoads)

  // Sort tasks by priority (high first) and critical status
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
    return a.priority - b.priority
  })

  // Assign each task
  for (const task of sortedTasks) {
    const result = findOptimalAssignee(
      task,
      mutableCandidates,
      historicalEntries,
      mutableTracker
    )

    if (result) {
      assignments.push(result)

      // Update simulated state
      const candidateIndex = mutableCandidates.findIndex(
        (c) => c.userId === result.assignedTo
      )
      if (candidateIndex >= 0) {
        const taskWeight = calculateTaskWeight(task)
        mutableCandidates[candidateIndex]!.currentLoad += taskWeight.adjustedWeight
      }

      // Update rotation tracker
      if (!mutableTracker.categoryLastAssigned.has(task.category)) {
        mutableTracker.categoryLastAssigned.set(task.category, new Map())
      }
      mutableTracker.categoryLastAssigned
        .get(task.category)!
        .set(result.assignedTo, new Date())
    } else {
      unassigned.push({
        taskId: task.taskId,
        reason: "Aucun membre éligible disponible",
      })
    }
  }

  // Calculate final balance score
  const finalLoads = mutableCandidates.map((c) => c.currentLoad)
  const afterScore = calculateBalanceScore(finalLoads)

  return {
    assignments,
    unassigned,
    balanceImpact: {
      beforeScore,
      afterScore,
      improvement: afterScore - beforeScore,
    },
  }
}

// =============================================================================
// ROTATION MANAGEMENT
// =============================================================================

/**
 * Create empty rotation tracker
 */
export function createRotationTracker(): RotationTracker {
  return {
    categoryLastAssigned: new Map(),
    taskTypeLastAssigned: new Map(),
  }
}

/**
 * Update rotation tracker after assignment
 */
export function updateRotationTracker(
  tracker: RotationTracker,
  userId: string,
  category: string,
  taskType?: string
): RotationTracker {
  const now = new Date()

  // Update category tracking
  if (!tracker.categoryLastAssigned.has(category)) {
    tracker.categoryLastAssigned.set(category, new Map())
  }
  tracker.categoryLastAssigned.get(category)!.set(userId, now)

  // Update task type tracking if provided
  if (taskType) {
    if (!tracker.taskTypeLastAssigned.has(taskType)) {
      tracker.taskTypeLastAssigned.set(taskType, new Map())
    }
    tracker.taskTypeLastAssigned.get(taskType)!.set(userId, now)
  }

  return tracker
}

/**
 * Get rotation status for a category
 */
export function getCategoryRotationStatus(
  tracker: RotationTracker,
  category: string
): Array<{ userId: string; lastAssigned: Date; daysSince: number }> {
  const categoryMap = tracker.categoryLastAssigned.get(category)

  if (!categoryMap) return []

  const now = Date.now()
  const status: Array<{ userId: string; lastAssigned: Date; daysSince: number }> = []

  for (const [userId, lastAssigned] of categoryMap) {
    const daysSince = Math.floor(
      (now - lastAssigned.getTime()) / (24 * 60 * 60 * 1000)
    )
    status.push({ userId, lastAssigned, daysSince })
  }

  return status.sort((a, b) => b.daysSince - a.daysSince)
}

// =============================================================================
// EXCLUSION PERIOD MANAGEMENT
// =============================================================================

/**
 * Add exclusion period to member
 */
export function addExclusionPeriod(
  member: MemberAvailability,
  period: ExclusionPeriod
): MemberAvailability {
  return {
    ...member,
    exclusionPeriods: [...member.exclusionPeriods, period],
  }
}

/**
 * Remove expired exclusion periods
 */
export function cleanupExclusionPeriods(
  member: MemberAvailability,
  referenceDate: Date = new Date()
): MemberAvailability {
  return {
    ...member,
    exclusionPeriods: member.exclusionPeriods.filter(
      (p) => p.endDate >= referenceDate
    ),
  }
}

/**
 * Check upcoming exclusion periods
 */
export function getUpcomingExclusions(
  member: MemberAvailability,
  daysAhead: number = 7
): ExclusionPeriod[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  return member.exclusionPeriods.filter(
    (p) => p.startDate >= now && p.startDate <= cutoff
  )
}

// =============================================================================
// REBALANCING
// =============================================================================

/**
 * Suggest task reassignments to improve balance
 */
export function suggestReassignments(
  currentAssignments: Array<{
    taskId: string
    title: string
    category: string
    assignedTo: string
    weight: number
  }>,
  members: MemberAvailability[],
  targetBalanceImprovement: number = 10
): Array<{
  taskId: string
  taskTitle: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  reason: string
  balanceImpact: number
}> {
  const suggestions: Array<{
    taskId: string
    taskTitle: string
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    reason: string
    balanceImpact: number
  }> = []

  // Calculate current loads
  const memberLoads = new Map<string, number>()
  for (const member of members) {
    memberLoads.set(member.userId, member.currentLoad)
  }

  // Find overloaded and underloaded members
  const totalLoad = Array.from(memberLoads.values()).reduce((a, b) => a + b, 0)
  const avgLoad = totalLoad / members.length

  const overloaded = members.filter(
    (m) => (memberLoads.get(m.userId) ?? 0) > avgLoad * 1.2
  )
  const underloaded = members.filter(
    (m) => (memberLoads.get(m.userId) ?? 0) < avgLoad * 0.8
  )

  // For each overloaded member, find tasks to reassign
  for (const over of overloaded) {
    const overTasks = currentAssignments.filter(
      (a) => a.assignedTo === over.userId
    )

    // Sort by weight (move lighter tasks first for minimal disruption)
    const sortedTasks = [...overTasks].sort((a, b) => a.weight - b.weight)

    for (const task of sortedTasks) {
      // Find suitable underloaded recipient
      const recipient = underloaded.find((u) => {
        const canHandle = canHandleCategory(u, task.category)
        const hasSpace =
          (memberLoads.get(u.userId) ?? 0) + task.weight < avgLoad * 1.1
        return canHandle.canHandle && hasSpace
      })

      if (recipient) {
        suggestions.push({
          taskId: task.taskId,
          taskTitle: task.title,
          fromUserId: over.userId,
          fromUserName: over.userName,
          toUserId: recipient.userId,
          toUserName: recipient.userName,
          reason: `Rééquilibrer la charge de ${over.userName}`,
          balanceImpact: Math.round(
            (task.weight / totalLoad) * 100
          ),
        })

        // Update simulated loads
        memberLoads.set(
          over.userId,
          (memberLoads.get(over.userId) ?? 0) - task.weight
        )
        memberLoads.set(
          recipient.userId,
          (memberLoads.get(recipient.userId) ?? 0) + task.weight
        )
      }

      // Stop if we've suggested enough improvements
      if (suggestions.length >= 5) break
    }

    if (suggestions.length >= 5) break
  }

  return suggestions
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate simple balance score
 */
function calculateBalanceScore(loads: number[]): number {
  if (loads.length <= 1) return 100
  if (loads.every((l) => l === 0)) return 100

  const total = loads.reduce((a, b) => a + b, 0)
  if (total === 0) return 100

  const ideal = 100 / loads.length
  const percentages = loads.map((l) => (l / total) * 100)
  const deviations = percentages.map((p) => Math.abs(p - ideal))
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length

  return Math.max(0, Math.round(100 - avgDeviation * 2))
}

/**
 * Create default member availability
 */
export function createMemberAvailability(
  userId: string,
  userName: string,
  options: Partial<Omit<MemberAvailability, "userId" | "userName">> = {}
): MemberAvailability {
  return {
    userId,
    userName,
    isActive: options.isActive ?? true,
    currentLoad: options.currentLoad ?? 0,
    maxWeeklyLoad: options.maxWeeklyLoad ?? 20,
    preferredCategories: options.preferredCategories ?? [],
    blockedCategories: options.blockedCategories ?? [],
    skills: options.skills ?? [],
    exclusionPeriods: options.exclusionPeriods ?? [],
  }
}

/**
 * Get assignment summary stats
 */
export function getAssignmentStats(
  results: AssignmentResult[]
): {
  total: number
  assigned: number
  forced: number
  averageScore: number
  byUser: Record<string, number>
} {
  const byUser: Record<string, number> = {}

  for (const result of results) {
    byUser[result.assignedToName] = (byUser[result.assignedToName] ?? 0) + 1
  }

  const scores = results.map((r) => r.score.totalScore)
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

  return {
    total: results.length,
    assigned: results.length,
    forced: results.filter((r) => r.wasForced).length,
    averageScore,
    byUser,
  }
}
