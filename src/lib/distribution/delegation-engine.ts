/**
 * Delegation Engine Service
 *
 * Smart task delegation with:
 * - Smart delegation suggestions
 * - Skill-based assignment
 * - Availability awareness
 * - Learning from past delegations
 */

// =============================================================================
// TYPES
// =============================================================================

export type DelegationReason =
  | "overload"
  | "skill_match"
  | "preference_match"
  | "availability"
  | "fairness"
  | "efficiency"
  | "learning_opportunity"

export type DelegationStatus = "pending" | "accepted" | "declined" | "expired" | "completed"

export interface DelegationSuggestion {
  id: string
  taskId: string
  taskName: string
  taskCategory: string
  fromMember: string
  toMember: string
  toMemberName: string
  reason: DelegationReason
  score: number // 0-100
  confidence: number // 0-1
  factors: DelegationFactor[]
  expiresAt: Date
  createdAt: Date
}

export interface DelegationFactor {
  name: string
  impact: number // -1 to 1
  description: string
  weight: number
}

export interface SkillProfile {
  memberId: string
  skills: Map<string, SkillLevel>
  preferredCategories: string[]
  learningInterests: string[]
  certifications: string[]
}

export interface SkillLevel {
  level: number // 0-10
  experience: number // Tasks completed
  lastUsed?: Date
  growthRate: number // Improvement over time
}

export interface AvailabilityWindow {
  memberId: string
  date: Date
  startTime: string // HH:mm
  endTime: string // HH:mm
  capacity: number // Remaining task capacity
  preferredTaskTypes: string[]
}

export interface DelegationRequest {
  id: string
  taskId: string
  fromMember: string
  toMember: string
  reason: string
  status: DelegationStatus
  requestedAt: Date
  respondedAt?: Date
  completedAt?: Date
  feedback?: DelegationFeedback
}

export interface DelegationFeedback {
  accepted: boolean
  rating?: number // 1-5
  comment?: string
  timeToComplete?: number // minutes
  wouldAcceptAgain: boolean
}

export interface DelegationHistory {
  memberId: string
  delegationsReceived: DelegationRecord[]
  delegationsSent: DelegationRecord[]
  acceptanceRate: number
  avgCompletionTime: number
  categoryPreferences: Map<string, number> // acceptance rate by category
}

export interface DelegationRecord {
  delegationId: string
  taskCategory: string
  fromMember: string
  toMember: string
  status: DelegationStatus
  timestamp: Date
  feedback?: DelegationFeedback
}

export interface SmartAssignment {
  taskId: string
  recommendedMember: string
  alternativeMembers: AlternativeCandidate[]
  reasoning: string[]
  score: number
  autoAssignable: boolean
}

export interface AlternativeCandidate {
  memberId: string
  memberName: string
  score: number
  availableCapacity: number
  reason: string
}

export interface DelegationPolicy {
  householdId: string
  autoSuggestEnabled: boolean
  autoAssignThreshold: number // Score above which auto-assign is allowed
  maxPendingPerMember: number
  expirationHours: number
  requireAcceptance: boolean
  skillMatchWeight: number
  availabilityWeight: number
  fairnessWeight: number
  preferenceWeight: number
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_DELEGATION_POLICY: DelegationPolicy = {
  householdId: "",
  autoSuggestEnabled: true,
  autoAssignThreshold: 85,
  maxPendingPerMember: 5,
  expirationHours: 24,
  requireAcceptance: true,
  skillMatchWeight: 0.3,
  availabilityWeight: 0.25,
  fairnessWeight: 0.25,
  preferenceWeight: 0.2,
}

// =============================================================================
// SKILL MATCHING
// =============================================================================

/**
 * Calculate skill match score between member and task
 */
export function calculateSkillMatchScore(
  skillProfile: SkillProfile,
  requiredSkills: string[],
  taskCategory: string
): { score: number; factors: DelegationFactor[] } {
  const factors: DelegationFactor[] = []
  let totalScore = 0
  let totalWeight = 0

  if (requiredSkills.length === 0) {
    // No skills required - check category preference
    const categoryPreferred = skillProfile.preferredCategories.includes(taskCategory)
    return {
      score: categoryPreferred ? 80 : 60,
      factors: [{
        name: "no_skill_requirement",
        impact: categoryPreferred ? 0.3 : 0,
        description: categoryPreferred
          ? "Task category matches member preference"
          : "No specific skills required",
        weight: 1,
      }],
    }
  }

  // Check each required skill
  for (const skill of requiredSkills) {
    const memberSkill = skillProfile.skills.get(skill)
    const weight = 1 / requiredSkills.length

    if (memberSkill) {
      const skillScore = (memberSkill.level / 10) * 100
      totalScore += skillScore * weight
      totalWeight += weight

      factors.push({
        name: `skill_${skill}`,
        impact: (skillScore - 50) / 50, // Normalize to -1 to 1
        description: `${skill}: Level ${memberSkill.level}/10 (${memberSkill.experience} tasks completed)`,
        weight,
      })
    } else {
      // Check if it's a learning interest
      const isLearning = skillProfile.learningInterests.includes(skill)

      factors.push({
        name: `skill_${skill}`,
        impact: isLearning ? -0.2 : -0.5,
        description: isLearning
          ? `${skill}: Not skilled but interested in learning`
          : `${skill}: Skill not found`,
        weight,
      })

      totalScore += isLearning ? 30 : 10
      totalWeight += weight
    }
  }

  // Bonus for certifications
  const relevantCerts = skillProfile.certifications.filter(cert =>
    requiredSkills.some(skill => cert.toLowerCase().includes(skill.toLowerCase()))
  )

  if (relevantCerts.length > 0) {
    const certBonus = Math.min(15, relevantCerts.length * 5)
    totalScore += certBonus
    factors.push({
      name: "certifications",
      impact: certBonus / 30,
      description: `Has ${relevantCerts.length} relevant certification(s)`,
      weight: 0.15,
    })
  }

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50
  return { score: Math.min(100, Math.round(finalScore)), factors }
}

/**
 * Get skill level from profile
 */
export function getSkillLevel(profile: SkillProfile, skill: string): number {
  return profile.skills.get(skill)?.level ?? 0
}

/**
 * Update skill profile after task completion
 */
export function updateSkillProfile(
  profile: SkillProfile,
  taskCategory: string,
  skills: string[],
  performance: number // 0-10
): SkillProfile {
  const updatedSkills = new Map(profile.skills)

  for (const skill of skills) {
    const existing = updatedSkills.get(skill)

    if (existing) {
      // Update existing skill
      const newExperience = existing.experience + 1
      const growthFactor = performance >= 7 ? 0.1 : performance >= 5 ? 0.05 : 0
      const newLevel = Math.min(10, existing.level + growthFactor)

      updatedSkills.set(skill, {
        level: newLevel,
        experience: newExperience,
        lastUsed: new Date(),
        growthRate: (existing.growthRate + growthFactor) / 2,
      })
    } else {
      // New skill learned
      updatedSkills.set(skill, {
        level: Math.min(3, performance / 3),
        experience: 1,
        lastUsed: new Date(),
        growthRate: 0.1,
      })
    }
  }

  return {
    ...profile,
    skills: updatedSkills,
  }
}

// =============================================================================
// AVAILABILITY ANALYSIS
// =============================================================================

/**
 * Calculate availability match score
 */
export function calculateAvailabilityScore(
  windows: AvailabilityWindow[],
  taskDate: Date,
  estimatedMinutes: number
): { score: number; factors: DelegationFactor[] } {
  const factors: DelegationFactor[] = []

  // Find windows for the target date
  const targetDateStr = taskDate.toISOString().split("T")[0]
  const relevantWindows = windows.filter(w =>
    w.date.toISOString().split("T")[0] === targetDateStr
  )

  if (relevantWindows.length === 0) {
    return {
      score: 20,
      factors: [{
        name: "no_availability",
        impact: -0.8,
        description: "No availability windows on the target date",
        weight: 1,
      }],
    }
  }

  // Calculate total available time
  const totalAvailableMinutes = relevantWindows.reduce((sum, w) => {
    const start = parseTimeToMinutes(w.startTime)
    const end = parseTimeToMinutes(w.endTime)
    return sum + (end - start)
  }, 0)

  // Check if enough time
  if (totalAvailableMinutes < estimatedMinutes) {
    factors.push({
      name: "insufficient_time",
      impact: -0.5,
      description: `Only ${totalAvailableMinutes} minutes available, need ${estimatedMinutes}`,
      weight: 0.5,
    })
  }

  // Check capacity
  const totalCapacity = relevantWindows.reduce((sum, w) => sum + w.capacity, 0)

  if (totalCapacity <= 0) {
    factors.push({
      name: "no_capacity",
      impact: -0.7,
      description: "Member has no remaining task capacity",
      weight: 0.3,
    })
  } else {
    factors.push({
      name: "available_capacity",
      impact: Math.min(0.5, totalCapacity / 5 * 0.5),
      description: `${totalCapacity} task(s) remaining capacity`,
      weight: 0.3,
    })
  }

  // Calculate score
  let score = 50

  if (totalAvailableMinutes >= estimatedMinutes) {
    score += 25
  } else if (totalAvailableMinutes >= estimatedMinutes * 0.7) {
    score += 10
  }

  if (totalCapacity > 0) {
    score += Math.min(25, totalCapacity * 5)
  }

  return { score: Math.max(0, Math.min(100, score)), factors }
}

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/**
 * Find best available windows for a task
 */
export function findBestWindows(
  windows: AvailabilityWindow[],
  estimatedMinutes: number,
  daysAhead: number = 7
): Array<{ date: Date; score: number; window: AvailabilityWindow }> {
  const results: Array<{ date: Date; score: number; window: AvailabilityWindow }> = []
  const now = new Date()

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + i)
    const targetDateStr = targetDate.toISOString().split("T")[0]

    const dayWindows = windows.filter(w =>
      w.date.toISOString().split("T")[0] === targetDateStr && w.capacity > 0
    )

    for (const window of dayWindows) {
      const startMin = parseTimeToMinutes(window.startTime)
      const endMin = parseTimeToMinutes(window.endTime)
      const available = endMin - startMin

      if (available >= estimatedMinutes) {
        const score = Math.round((available / estimatedMinutes) * 50 + window.capacity * 10)
        results.push({ date: targetDate, score: Math.min(100, score), window })
      }
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

// =============================================================================
// DELEGATION SUGGESTIONS
// =============================================================================

/**
 * Generate delegation suggestions for a task
 */
export function generateDelegationSuggestions(
  task: {
    id: string
    name: string
    category: string
    requiredSkills: string[]
    estimatedMinutes: number
    deadline?: Date
    priority: number
  },
  currentAssignee: string,
  members: Array<{
    id: string
    name: string
    skillProfile: SkillProfile
    availability: AvailabilityWindow[]
    currentLoad: number
    maxLoad: number
  }>,
  history: Map<string, DelegationHistory>,
  policy: DelegationPolicy = DEFAULT_DELEGATION_POLICY
): DelegationSuggestion[] {
  const suggestions: DelegationSuggestion[] = []
  const targetDate = task.deadline ?? new Date()

  // Exclude current assignee
  const candidates = members.filter(m => m.id !== currentAssignee)

  for (const candidate of candidates) {
    const factors: DelegationFactor[] = []
    let totalScore = 0

    // Skill match
    const skillMatch = calculateSkillMatchScore(
      candidate.skillProfile,
      task.requiredSkills,
      task.category
    )
    totalScore += skillMatch.score * policy.skillMatchWeight
    factors.push(...skillMatch.factors)

    // Availability
    const availabilityMatch = calculateAvailabilityScore(
      candidate.availability,
      targetDate,
      task.estimatedMinutes
    )
    totalScore += availabilityMatch.score * policy.availabilityWeight
    factors.push(...availabilityMatch.factors)

    // Fairness (inverse of current load)
    const loadPercent = candidate.maxLoad > 0
      ? (candidate.currentLoad / candidate.maxLoad) * 100
      : 100
    const fairnessScore = Math.max(0, 100 - loadPercent)
    totalScore += fairnessScore * policy.fairnessWeight
    factors.push({
      name: "fairness",
      impact: (fairnessScore - 50) / 50,
      description: `Current load: ${Math.round(loadPercent)}%`,
      weight: policy.fairnessWeight,
    })

    // Preference match
    const preferenceScore = candidate.skillProfile.preferredCategories.includes(task.category)
      ? 90
      : 50
    totalScore += preferenceScore * policy.preferenceWeight
    factors.push({
      name: "preference",
      impact: (preferenceScore - 50) / 50,
      description: candidate.skillProfile.preferredCategories.includes(task.category)
        ? "Category is preferred"
        : "Category is neutral",
      weight: policy.preferenceWeight,
    })

    // Historical acceptance rate for this category
    const memberHistory = history.get(candidate.id)
    if (memberHistory) {
      const categoryAcceptance = memberHistory.categoryPreferences.get(task.category) ?? 0.5
      const historyBonus = (categoryAcceptance - 0.5) * 20
      totalScore += historyBonus

      factors.push({
        name: "history",
        impact: categoryAcceptance - 0.5,
        description: `Historical acceptance rate for ${task.category}: ${Math.round(categoryAcceptance * 100)}%`,
        weight: 0.1,
      })
    }

    // Calculate confidence
    const confidence = calculateConfidence(factors, memberHistory)

    // Determine primary reason
    const reason = determinePrimaryReason(factors, candidate, currentAssignee)

    // Only include if score is reasonable
    if (totalScore >= 40) {
      suggestions.push({
        id: `del_${Date.now()}_${candidate.id}`,
        taskId: task.id,
        taskName: task.name,
        taskCategory: task.category,
        fromMember: currentAssignee,
        toMember: candidate.id,
        toMemberName: candidate.name,
        reason,
        score: Math.round(totalScore),
        confidence,
        factors,
        expiresAt: new Date(Date.now() + policy.expirationHours * 60 * 60 * 1000),
        createdAt: new Date(),
      })
    }
  }

  // Sort by score descending
  return suggestions.sort((a, b) => b.score - a.score)
}

/**
 * Calculate confidence based on factors and history
 */
function calculateConfidence(
  factors: DelegationFactor[],
  history?: DelegationHistory
): number {
  // Base confidence from factor consistency
  const impacts = factors.map(f => f.impact)
  const avgImpact = impacts.reduce((a, b) => a + b, 0) / impacts.length
  const variance = impacts.reduce((sum, i) => sum + Math.pow(i - avgImpact, 2), 0) / impacts.length

  let confidence = 0.5 + avgImpact * 0.3 - variance * 0.2

  // Boost confidence if we have history
  if (history && history.delegationsReceived.length >= 5) {
    confidence += 0.15
  }

  return Math.max(0.1, Math.min(0.95, confidence))
}

/**
 * Determine primary reason for delegation
 */
function determinePrimaryReason(
  factors: DelegationFactor[],
  candidate: { currentLoad: number; maxLoad: number; skillProfile: SkillProfile },
  currentAssignee: string
): DelegationReason {
  // Find strongest positive factor
  const sortedFactors = [...factors].sort((a, b) => b.impact - a.impact)
  const topFactor = sortedFactors[0]

  if (topFactor?.name.startsWith("skill_") && topFactor.impact > 0.3) {
    return "skill_match"
  }

  if (topFactor?.name === "preference" && topFactor.impact > 0.3) {
    return "preference_match"
  }

  if (topFactor?.name === "fairness" && topFactor.impact > 0.3) {
    return "fairness"
  }

  if (candidate.currentLoad < candidate.maxLoad * 0.5) {
    return "availability"
  }

  // Check for learning opportunity
  const learningFactor = factors.find(f => f.description.includes("interested in learning"))
  if (learningFactor) {
    return "learning_opportunity"
  }

  return "efficiency"
}

// =============================================================================
// SMART ASSIGNMENT
// =============================================================================

/**
 * Generate smart assignment recommendation
 */
export function generateSmartAssignment(
  task: {
    id: string
    name: string
    category: string
    requiredSkills: string[]
    estimatedMinutes: number
    deadline?: Date
    priority: number
  },
  members: Array<{
    id: string
    name: string
    skillProfile: SkillProfile
    availability: AvailabilityWindow[]
    currentLoad: number
    maxLoad: number
  }>,
  history: Map<string, DelegationHistory>,
  policy: DelegationPolicy = DEFAULT_DELEGATION_POLICY
): SmartAssignment | null {
  if (members.length === 0) return null

  // Generate scores for all members
  const candidates: Array<{
    member: typeof members[0]
    score: number
    reasoning: string[]
  }> = []

  for (const member of members) {
    const reasoning: string[] = []
    let score = 0

    // Skill match
    const skillMatch = calculateSkillMatchScore(
      member.skillProfile,
      task.requiredSkills,
      task.category
    )
    score += skillMatch.score * policy.skillMatchWeight
    if (skillMatch.score > 70) {
      reasoning.push("Strong skill match")
    } else if (skillMatch.score < 40) {
      reasoning.push("Limited skill match")
    }

    // Availability
    const targetDate = task.deadline ?? new Date()
    const availabilityMatch = calculateAvailabilityScore(
      member.availability,
      targetDate,
      task.estimatedMinutes
    )
    score += availabilityMatch.score * policy.availabilityWeight
    if (availabilityMatch.score > 70) {
      reasoning.push("Good availability")
    } else if (availabilityMatch.score < 40) {
      reasoning.push("Limited availability")
    }

    // Fairness
    const loadPercent = member.maxLoad > 0
      ? (member.currentLoad / member.maxLoad) * 100
      : 100
    const fairnessScore = Math.max(0, 100 - loadPercent)
    score += fairnessScore * policy.fairnessWeight
    if (fairnessScore > 70) {
      reasoning.push("Has capacity available")
    } else if (fairnessScore < 30) {
      reasoning.push("Already heavily loaded")
    }

    // Preference
    if (member.skillProfile.preferredCategories.includes(task.category)) {
      score += 90 * policy.preferenceWeight
      reasoning.push("Prefers this category")
    } else {
      score += 50 * policy.preferenceWeight
    }

    candidates.push({
      member,
      score: Math.round(score),
      reasoning,
    })
  }

  // Sort by score
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length === 0) return null

  const best = candidates[0]
  const alternatives: AlternativeCandidate[] = candidates.slice(1, 4).map(c => ({
    memberId: c.member.id,
    memberName: c.member.name,
    score: c.score,
    availableCapacity: Math.max(0, c.member.maxLoad - c.member.currentLoad),
    reason: c.reasoning[0] ?? "Available",
  }))

  return {
    taskId: task.id,
    recommendedMember: best!.member.id,
    alternativeMembers: alternatives,
    reasoning: best!.reasoning,
    score: best!.score,
    autoAssignable: best!.score >= policy.autoAssignThreshold,
  }
}

// =============================================================================
// DELEGATION WORKFLOW
// =============================================================================

/**
 * Create delegation request
 */
export function createDelegationRequest(
  suggestion: DelegationSuggestion,
  customReason?: string
): DelegationRequest {
  return {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    taskId: suggestion.taskId,
    fromMember: suggestion.fromMember,
    toMember: suggestion.toMember,
    reason: customReason ?? `Suggested delegation: ${suggestion.reason}`,
    status: "pending",
    requestedAt: new Date(),
  }
}

/**
 * Process delegation response
 */
export function processDelegationResponse(
  request: DelegationRequest,
  accepted: boolean,
  feedback?: Partial<DelegationFeedback>
): DelegationRequest {
  return {
    ...request,
    status: accepted ? "accepted" : "declined",
    respondedAt: new Date(),
    feedback: {
      accepted,
      rating: feedback?.rating,
      comment: feedback?.comment,
      wouldAcceptAgain: feedback?.wouldAcceptAgain ?? accepted,
    },
  }
}

/**
 * Complete delegation
 */
export function completeDelegation(
  request: DelegationRequest,
  feedback: Partial<DelegationFeedback>
): DelegationRequest {
  return {
    ...request,
    status: "completed",
    completedAt: new Date(),
    feedback: {
      accepted: true,
      wouldAcceptAgain: true,
      ...request.feedback,
      ...feedback,
    },
  }
}

/**
 * Check for expired delegations
 */
export function getExpiredDelegations(
  requests: DelegationRequest[],
  expirationHours: number = 24
): DelegationRequest[] {
  const now = Date.now()
  const expirationMs = expirationHours * 60 * 60 * 1000

  return requests.filter(r =>
    r.status === "pending" &&
    now - r.requestedAt.getTime() > expirationMs
  )
}

/**
 * Update delegation history
 */
export function updateDelegationHistory(
  history: DelegationHistory,
  request: DelegationRequest,
  taskCategory: string
): DelegationHistory {
  const record: DelegationRecord = {
    delegationId: request.id,
    taskCategory,
    fromMember: request.fromMember,
    toMember: request.toMember,
    status: request.status,
    timestamp: new Date(),
    feedback: request.feedback,
  }

  const newDelegationsReceived = [...history.delegationsReceived, record]

  // Update acceptance rate
  const totalReceived = newDelegationsReceived.length
  const accepted = newDelegationsReceived.filter(d => d.status === "completed" || d.status === "accepted").length
  const acceptanceRate = totalReceived > 0 ? accepted / totalReceived : 0

  // Update category preferences
  const categoryPreferences = new Map(history.categoryPreferences)
  const categoryRecords = newDelegationsReceived.filter(d => d.taskCategory === taskCategory)
  const categoryAccepted = categoryRecords.filter(d => d.status === "completed" || d.status === "accepted").length
  categoryPreferences.set(
    taskCategory,
    categoryRecords.length > 0 ? categoryAccepted / categoryRecords.length : 0.5
  )

  // Update avg completion time
  const completedWithTime = newDelegationsReceived.filter(d => d.feedback?.timeToComplete)
  const avgCompletionTime = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, d) => sum + (d.feedback?.timeToComplete ?? 0), 0) / completedWithTime.length
    : history.avgCompletionTime

  return {
    ...history,
    delegationsReceived: newDelegationsReceived,
    acceptanceRate,
    avgCompletionTime,
    categoryPreferences,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create empty skill profile
 */
export function createSkillProfile(
  memberId: string,
  preferredCategories: string[] = [],
  learningInterests: string[] = []
): SkillProfile {
  return {
    memberId,
    skills: new Map(),
    preferredCategories,
    learningInterests,
    certifications: [],
  }
}

/**
 * Create empty delegation history
 */
export function createDelegationHistory(memberId: string): DelegationHistory {
  return {
    memberId,
    delegationsReceived: [],
    delegationsSent: [],
    acceptanceRate: 0,
    avgCompletionTime: 0,
    categoryPreferences: new Map(),
  }
}

/**
 * Create availability window
 */
export function createAvailabilityWindow(
  memberId: string,
  date: Date,
  startTime: string,
  endTime: string,
  capacity: number,
  preferredTaskTypes: string[] = []
): AvailabilityWindow {
  return {
    memberId,
    date,
    startTime,
    endTime,
    capacity,
    preferredTaskTypes,
  }
}

/**
 * Get delegation suggestion summary
 */
export function getSuggestionSummary(suggestion: DelegationSuggestion): string {
  const reasonText: Record<DelegationReason, string> = {
    overload: "to reduce workload",
    skill_match: "based on skill match",
    preference_match: "based on preferences",
    availability: "based on availability",
    fairness: "for fair distribution",
    efficiency: "for efficiency",
    learning_opportunity: "as a learning opportunity",
  }

  return `Delegate "${suggestion.taskName}" to ${suggestion.toMemberName} ${reasonText[suggestion.reason]} (Score: ${suggestion.score})`
}
