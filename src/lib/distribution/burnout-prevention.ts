/**
 * Burnout Prevention Service
 *
 * Monitors and prevents member overload:
 * - Surcharge detection
 * - Auto-balancing triggers
 * - Recovery period suggestions
 * - Workload health scoring
 */

// =============================================================================
// TYPES
// =============================================================================

export type WorkloadHealthStatus = "healthy" | "elevated" | "high" | "critical" | "burnout_risk"
export type StressLevel = "low" | "moderate" | "high" | "severe"
export type RecoveryType = "short_break" | "light_day" | "day_off" | "extended_rest"

export interface MemberWorkloadState {
  memberId: string
  memberName: string
  currentLoad: number
  maxLoad: number
  loadPercentage: number
  consecutiveHighLoadDays: number
  recentWorkload: DailyWorkload[]
  healthStatus: WorkloadHealthStatus
  stressIndicators: StressIndicator[]
  lastRestDay?: Date
}

export interface DailyWorkload {
  date: Date
  taskCount: number
  minutesWorked: number
  loadPercentage: number
  wasOverloaded: boolean
}

export interface StressIndicator {
  type: "consecutive_overload" | "no_rest" | "high_variance" | "long_tasks" | "deadline_pressure"
  severity: number // 1-10
  description: string
  detectedAt: Date
}

export interface OverloadAlert {
  memberId: string
  memberName: string
  alertType: "warning" | "critical" | "emergency"
  reason: string
  currentMetrics: {
    loadPercentage: number
    consecutiveDays: number
    taskCount: number
  }
  suggestedActions: SuggestedAction[]
  createdAt: Date
}

export interface SuggestedAction {
  type: "redistribute" | "delay" | "skip" | "delegate" | "rest"
  description: string
  priority: number
  estimatedRelief: number // Percentage reduction
  affectedTasks?: string[]
}

export interface RecoveryPlan {
  memberId: string
  type: RecoveryType
  startDate: Date
  endDate: Date
  reducedLoad: number // Target load during recovery
  reason: string
  tasks: RecoveryTask[]
}

export interface RecoveryTask {
  action: "postpone" | "reassign" | "cancel"
  taskId?: string
  taskName?: string
  newAssignee?: string
  newDate?: Date
}

export interface AutoBalanceConfig {
  enabled: boolean
  thresholds: {
    warningLoadPercent: number
    criticalLoadPercent: number
    maxConsecutiveHighDays: number
    minRestDayInterval: number // Days
  }
  actions: {
    autoRedistribute: boolean
    autoDelay: boolean
    notifyMembers: boolean
    notifyAdmins: boolean
  }
}

export interface BalanceResult {
  success: boolean
  redistributedTasks: RedistributedTask[]
  membersAffected: string[]
  loadReduction: Map<string, number>
  message: string
}

export interface RedistributedTask {
  taskId: string
  taskName: string
  fromMember: string
  toMember: string
  reason: string
}

export interface WorkloadHealthReport {
  householdId: string
  generatedAt: Date
  period: { start: Date; end: Date }
  overallHealth: WorkloadHealthStatus
  memberStates: MemberWorkloadState[]
  alerts: OverloadAlert[]
  recommendations: string[]
  trendAnalysis: {
    direction: "improving" | "stable" | "worsening"
    riskMembers: string[]
    healthyMembers: string[]
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_BALANCE_CONFIG: AutoBalanceConfig = {
  enabled: true,
  thresholds: {
    warningLoadPercent: 80,
    criticalLoadPercent: 100,
    maxConsecutiveHighDays: 3,
    minRestDayInterval: 7,
  },
  actions: {
    autoRedistribute: true,
    autoDelay: false,
    notifyMembers: true,
    notifyAdmins: true,
  },
}

const HEALTH_STATUS_THRESHOLDS = {
  healthy: 60,
  elevated: 80,
  high: 100,
  critical: 120,
} as const

// =============================================================================
// WORKLOAD ASSESSMENT
// =============================================================================

/**
 * Calculate workload health status
 */
export function calculateHealthStatus(loadPercentage: number): WorkloadHealthStatus {
  if (loadPercentage <= HEALTH_STATUS_THRESHOLDS.healthy) return "healthy"
  if (loadPercentage <= HEALTH_STATUS_THRESHOLDS.elevated) return "elevated"
  if (loadPercentage <= HEALTH_STATUS_THRESHOLDS.high) return "high"
  if (loadPercentage <= HEALTH_STATUS_THRESHOLDS.critical) return "critical"
  return "burnout_risk"
}

/**
 * Assess stress level from indicators
 */
export function assessStressLevel(indicators: StressIndicator[]): StressLevel {
  if (indicators.length === 0) return "low"

  const avgSeverity = indicators.reduce((sum, i) => sum + i.severity, 0) / indicators.length
  const maxSeverity = Math.max(...indicators.map(i => i.severity))

  if (maxSeverity >= 9 || avgSeverity >= 7) return "severe"
  if (maxSeverity >= 7 || avgSeverity >= 5) return "high"
  if (maxSeverity >= 4 || avgSeverity >= 3) return "moderate"
  return "low"
}

/**
 * Detect stress indicators from workload history
 */
export function detectStressIndicators(
  recentWorkload: DailyWorkload[],
  lastRestDay?: Date,
  config: AutoBalanceConfig = DEFAULT_BALANCE_CONFIG
): StressIndicator[] {
  const indicators: StressIndicator[] = []
  const now = new Date()

  if (recentWorkload.length === 0) return indicators

  // Check consecutive overload
  let consecutiveOverload = 0
  for (let i = recentWorkload.length - 1; i >= 0; i--) {
    if (recentWorkload[i]!.wasOverloaded) {
      consecutiveOverload++
    } else {
      break
    }
  }

  if (consecutiveOverload >= config.thresholds.maxConsecutiveHighDays) {
    indicators.push({
      type: "consecutive_overload",
      severity: Math.min(10, 5 + consecutiveOverload),
      description: `${consecutiveOverload} consecutive days of high workload`,
      detectedAt: now,
    })
  }

  // Check no rest period
  if (lastRestDay) {
    const daysSinceRest = Math.floor(
      (now.getTime() - lastRestDay.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceRest > config.thresholds.minRestDayInterval * 2) {
      indicators.push({
        type: "no_rest",
        severity: Math.min(10, Math.floor(daysSinceRest / config.thresholds.minRestDayInterval) + 3),
        description: `${daysSinceRest} days since last rest day`,
        detectedAt: now,
      })
    }
  }

  // Check high variance (inconsistent workload)
  const loadPercentages = recentWorkload.map(w => w.loadPercentage)
  const avgLoad = loadPercentages.reduce((a, b) => a + b, 0) / loadPercentages.length
  const variance = loadPercentages.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) / loadPercentages.length
  const stdDev = Math.sqrt(variance)

  if (stdDev > 30) {
    indicators.push({
      type: "high_variance",
      severity: Math.min(10, Math.floor(stdDev / 10) + 2),
      description: `High workload variance (±${Math.round(stdDev)}%)`,
      detectedAt: now,
    })
  }

  // Check for long task days
  const longTaskDays = recentWorkload.filter(w => w.minutesWorked > 480) // > 8 hours
  if (longTaskDays.length >= 3) {
    indicators.push({
      type: "long_tasks",
      severity: Math.min(10, longTaskDays.length + 3),
      description: `${longTaskDays.length} days with 8+ hours of work recently`,
      detectedAt: now,
    })
  }

  return indicators
}

/**
 * Build complete member workload state
 */
export function buildMemberWorkloadState(
  memberId: string,
  memberName: string,
  currentLoad: number,
  maxLoad: number,
  recentWorkload: DailyWorkload[],
  lastRestDay?: Date,
  config: AutoBalanceConfig = DEFAULT_BALANCE_CONFIG
): MemberWorkloadState {
  const loadPercentage = maxLoad > 0 ? (currentLoad / maxLoad) * 100 : 0
  const healthStatus = calculateHealthStatus(loadPercentage)

  // Count consecutive high load days
  let consecutiveHighLoadDays = 0
  for (let i = recentWorkload.length - 1; i >= 0; i--) {
    if (recentWorkload[i]!.loadPercentage >= config.thresholds.warningLoadPercent) {
      consecutiveHighLoadDays++
    } else {
      break
    }
  }

  const stressIndicators = detectStressIndicators(recentWorkload, lastRestDay, config)

  return {
    memberId,
    memberName,
    currentLoad,
    maxLoad,
    loadPercentage: Math.round(loadPercentage),
    consecutiveHighLoadDays,
    recentWorkload,
    healthStatus,
    stressIndicators,
    lastRestDay,
  }
}

// =============================================================================
// OVERLOAD DETECTION & ALERTS
// =============================================================================

/**
 * Check if member is overloaded and generate alert
 */
export function checkOverload(
  state: MemberWorkloadState,
  config: AutoBalanceConfig = DEFAULT_BALANCE_CONFIG
): OverloadAlert | null {
  const { memberId, memberName, loadPercentage, consecutiveHighLoadDays, healthStatus, stressIndicators } = state

  // Determine alert type
  let alertType: OverloadAlert["alertType"] | null = null
  let reason = ""

  if (healthStatus === "burnout_risk") {
    alertType = "emergency"
    reason = "Severe burnout risk detected"
  } else if (healthStatus === "critical" || loadPercentage >= config.thresholds.criticalLoadPercent) {
    alertType = "critical"
    reason = `Workload at ${Math.round(loadPercentage)}% of capacity`
  } else if (consecutiveHighLoadDays >= config.thresholds.maxConsecutiveHighDays) {
    alertType = "critical"
    reason = `${consecutiveHighLoadDays} consecutive high-load days`
  } else if (healthStatus === "high" || loadPercentage >= config.thresholds.warningLoadPercent) {
    alertType = "warning"
    reason = `Elevated workload at ${Math.round(loadPercentage)}%`
  } else if (stressIndicators.some(i => i.severity >= 7)) {
    alertType = "warning"
    reason = "High stress indicators detected"
  }

  if (!alertType) return null

  // Generate suggested actions
  const suggestedActions: SuggestedAction[] = []

  if (alertType === "emergency" || alertType === "critical") {
    suggestedActions.push({
      type: "rest",
      description: "Schedule immediate rest period",
      priority: 10,
      estimatedRelief: 30,
    })

    suggestedActions.push({
      type: "redistribute",
      description: "Redistribute pending tasks to other members",
      priority: 9,
      estimatedRelief: 25,
    })
  }

  if (loadPercentage > 100) {
    suggestedActions.push({
      type: "delay",
      description: "Delay non-urgent tasks",
      priority: 7,
      estimatedRelief: 15,
    })
  }

  suggestedActions.push({
    type: "delegate",
    description: "Delegate upcoming tasks",
    priority: 6,
    estimatedRelief: 20,
  })

  return {
    memberId,
    memberName,
    alertType,
    reason,
    currentMetrics: {
      loadPercentage: Math.round(loadPercentage),
      consecutiveDays: consecutiveHighLoadDays,
      taskCount: state.currentLoad,
    },
    suggestedActions,
    createdAt: new Date(),
  }
}

/**
 * Check all members for overload
 */
export function checkHouseholdOverload(
  memberStates: MemberWorkloadState[],
  config: AutoBalanceConfig = DEFAULT_BALANCE_CONFIG
): OverloadAlert[] {
  return memberStates
    .map(state => checkOverload(state, config))
    .filter((alert): alert is OverloadAlert => alert !== null)
    .sort((a, b) => {
      const priorityOrder = { emergency: 3, critical: 2, warning: 1 }
      return priorityOrder[b.alertType] - priorityOrder[a.alertType]
    })
}

// =============================================================================
// RECOVERY PLANNING
// =============================================================================

/**
 * Determine appropriate recovery type based on state
 */
export function determineRecoveryType(state: MemberWorkloadState): RecoveryType {
  const stressLevel = assessStressLevel(state.stressIndicators)

  if (state.healthStatus === "burnout_risk" || stressLevel === "severe") {
    return "extended_rest"
  }

  if (state.healthStatus === "critical" || stressLevel === "high") {
    return "day_off"
  }

  if (state.healthStatus === "high" || stressLevel === "moderate") {
    return "light_day"
  }

  return "short_break"
}

/**
 * Calculate recovery duration based on type
 */
export function calculateRecoveryDuration(type: RecoveryType): number {
  switch (type) {
    case "short_break":
      return 0.5 // Half day
    case "light_day":
      return 1
    case "day_off":
      return 1
    case "extended_rest":
      return 3
    default:
      return 1
  }
}

/**
 * Calculate reduced load target during recovery
 */
export function calculateRecoveryLoad(type: RecoveryType, normalMax: number): number {
  switch (type) {
    case "short_break":
      return normalMax * 0.5
    case "light_day":
      return normalMax * 0.3
    case "day_off":
      return 0
    case "extended_rest":
      return 0
    default:
      return normalMax * 0.5
  }
}

/**
 * Create recovery plan for a member
 */
export function createRecoveryPlan(
  state: MemberWorkloadState,
  availableMembers: Array<{ id: string; name: string; currentLoadPercent: number }>,
  pendingTasks: Array<{ id: string; name: string; canDelay: boolean; canReassign: boolean }>
): RecoveryPlan {
  const recoveryType = determineRecoveryType(state)
  const duration = calculateRecoveryDuration(recoveryType)
  const reducedLoad = calculateRecoveryLoad(recoveryType, state.maxLoad)

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + duration)

  const reason = `Recovery from ${state.healthStatus} workload status`

  // Plan task actions
  const tasks: RecoveryTask[] = []

  // Find members who can take reassigned tasks (lowest load first)
  const reassignCandidates = availableMembers
    .filter(m => m.id !== state.memberId && m.currentLoadPercent < 80)
    .sort((a, b) => a.currentLoadPercent - b.currentLoadPercent)

  for (const task of pendingTasks) {
    if (recoveryType === "day_off" || recoveryType === "extended_rest") {
      // Must reassign or postpone all tasks
      if (task.canReassign && reassignCandidates.length > 0) {
        tasks.push({
          action: "reassign",
          taskId: task.id,
          taskName: task.name,
          newAssignee: reassignCandidates[0]!.id,
        })
      } else if (task.canDelay) {
        tasks.push({
          action: "postpone",
          taskId: task.id,
          taskName: task.name,
          newDate: endDate,
        })
      }
    } else if (recoveryType === "light_day") {
      // Postpone some tasks
      if (task.canDelay) {
        tasks.push({
          action: "postpone",
          taskId: task.id,
          taskName: task.name,
          newDate: endDate,
        })
      }
    }
  }

  return {
    memberId: state.memberId,
    type: recoveryType,
    startDate,
    endDate,
    reducedLoad,
    reason,
    tasks,
  }
}

// =============================================================================
// AUTO-BALANCING
// =============================================================================

/**
 * Auto-balance workload across household members
 */
export function autoBalanceWorkload(
  memberStates: MemberWorkloadState[],
  pendingTasks: Array<{
    id: string
    name: string
    assignedTo: string
    canReassign: boolean
    priority: number
  }>,
  config: AutoBalanceConfig = DEFAULT_BALANCE_CONFIG
): BalanceResult {
  if (!config.enabled || !config.actions.autoRedistribute) {
    return {
      success: false,
      redistributedTasks: [],
      membersAffected: [],
      loadReduction: new Map(),
      message: "Auto-balancing is disabled",
    }
  }

  const redistributedTasks: RedistributedTask[] = []
  const loadReduction = new Map<string, number>()

  // Find overloaded members
  const overloadedMembers = memberStates
    .filter(s => s.loadPercentage >= config.thresholds.warningLoadPercent)
    .sort((a, b) => b.loadPercentage - a.loadPercentage)

  // Find underloaded members
  const underloadedMembers = memberStates
    .filter(s => s.loadPercentage < config.thresholds.warningLoadPercent - 20)
    .sort((a, b) => a.loadPercentage - b.loadPercentage)

  if (overloadedMembers.length === 0 || underloadedMembers.length === 0) {
    return {
      success: true,
      redistributedTasks: [],
      membersAffected: [],
      loadReduction: new Map(),
      message: "No rebalancing needed or no available members",
    }
  }

  // Try to redistribute tasks
  for (const overloaded of overloadedMembers) {
    const tasksToMove = pendingTasks
      .filter(t => t.assignedTo === overloaded.memberId && t.canReassign)
      .sort((a, b) => a.priority - b.priority) // Move lower priority first

    let movedCount = 0
    const targetReduction = overloaded.loadPercentage - 70 // Target 70% load

    for (const task of tasksToMove) {
      if (movedCount * 10 >= targetReduction) break // Rough estimate: each task = 10% load

      // Find best recipient
      const recipient = underloadedMembers.find(m => {
        const currentTasks = redistributedTasks.filter(t => t.toMember === m.memberId).length
        return m.loadPercentage + (currentTasks * 10) < config.thresholds.warningLoadPercent - 10
      })

      if (recipient) {
        redistributedTasks.push({
          taskId: task.id,
          taskName: task.name,
          fromMember: overloaded.memberId,
          toMember: recipient.memberId,
          reason: `Balancing workload from ${overloaded.memberName} to ${recipient.memberName}`,
        })
        movedCount++
      }
    }

    if (movedCount > 0) {
      loadReduction.set(overloaded.memberId, movedCount * 10)
    }
  }

  const membersAffected = [
    ...new Set([
      ...redistributedTasks.map(t => t.fromMember),
      ...redistributedTasks.map(t => t.toMember),
    ]),
  ]

  return {
    success: redistributedTasks.length > 0,
    redistributedTasks,
    membersAffected,
    loadReduction,
    message: redistributedTasks.length > 0
      ? `Redistributed ${redistributedTasks.length} tasks across ${membersAffected.length} members`
      : "No tasks could be redistributed",
  }
}

// =============================================================================
// HEALTH REPORTING
// =============================================================================

/**
 * Generate comprehensive workload health report
 */
export function generateHealthReport(
  householdId: string,
  memberStates: MemberWorkloadState[],
  periodStart: Date,
  periodEnd: Date
): WorkloadHealthReport {
  const alerts = checkHouseholdOverload(memberStates)

  // Determine overall health
  const healthStatuses = memberStates.map(s => s.healthStatus)
  let overallHealth: WorkloadHealthStatus = "healthy"

  if (healthStatuses.includes("burnout_risk")) {
    overallHealth = "burnout_risk"
  } else if (healthStatuses.includes("critical")) {
    overallHealth = "critical"
  } else if (healthStatuses.includes("high")) {
    overallHealth = "high"
  } else if (healthStatuses.includes("elevated")) {
    overallHealth = "elevated"
  }

  // Analyze trends
  const riskMembers = memberStates
    .filter(s => s.healthStatus === "critical" || s.healthStatus === "burnout_risk" || s.healthStatus === "high")
    .map(s => s.memberName)

  const healthyMembers = memberStates
    .filter(s => s.healthStatus === "healthy")
    .map(s => s.memberName)

  // Determine trend direction
  const avgLoadHistory = memberStates.flatMap(s =>
    s.recentWorkload.map(w => w.loadPercentage)
  )

  let direction: "improving" | "stable" | "worsening" = "stable"
  if (avgLoadHistory.length >= 7) {
    const recent = avgLoadHistory.slice(-7)
    const older = avgLoadHistory.slice(-14, -7)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg

    if (recentAvg < olderAvg - 10) direction = "improving"
    else if (recentAvg > olderAvg + 10) direction = "worsening"
  }

  // Generate recommendations
  const recommendations: string[] = []

  if (riskMembers.length > 0) {
    recommendations.push(`Prioritize reducing load for: ${riskMembers.join(", ")}`)
  }

  if (alerts.some(a => a.alertType === "emergency")) {
    recommendations.push("Immediate intervention required - emergency alerts detected")
  }

  const noRestMembers = memberStates.filter(s =>
    s.stressIndicators.some(i => i.type === "no_rest")
  )
  if (noRestMembers.length > 0) {
    recommendations.push(`Schedule rest days for: ${noRestMembers.map(m => m.memberName).join(", ")}`)
  }

  if (overallHealth === "healthy" && healthyMembers.length === memberStates.length) {
    recommendations.push("Workload distribution is healthy - maintain current balance")
  }

  return {
    householdId,
    generatedAt: new Date(),
    period: { start: periodStart, end: periodEnd },
    overallHealth,
    memberStates,
    alerts,
    recommendations,
    trendAnalysis: {
      direction,
      riskMembers,
      healthyMembers,
    },
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create daily workload entry
 */
export function createDailyWorkload(
  date: Date,
  taskCount: number,
  minutesWorked: number,
  maxLoad: number
): DailyWorkload {
  const loadPercentage = maxLoad > 0 ? (taskCount / maxLoad) * 100 : 0

  return {
    date,
    taskCount,
    minutesWorked,
    loadPercentage: Math.round(loadPercentage),
    wasOverloaded: loadPercentage >= 80,
  }
}

/**
 * Check if member needs immediate intervention
 */
export function needsImmediateIntervention(state: MemberWorkloadState): boolean {
  return (
    state.healthStatus === "burnout_risk" ||
    state.healthStatus === "critical" ||
    state.stressIndicators.some(i => i.severity >= 9) ||
    state.consecutiveHighLoadDays >= 5
  )
}

/**
 * Calculate workload score (0-100, higher = more overloaded)
 */
export function calculateWorkloadScore(state: MemberWorkloadState): number {
  let score = state.loadPercentage

  // Add stress indicator impact
  const avgStressSeverity = state.stressIndicators.length > 0
    ? state.stressIndicators.reduce((sum, i) => sum + i.severity, 0) / state.stressIndicators.length
    : 0

  score += avgStressSeverity * 3

  // Add consecutive day impact
  score += state.consecutiveHighLoadDays * 5

  return Math.min(100, Math.round(score))
}

/**
 * Get health status color for UI
 */
export function getHealthStatusColor(status: WorkloadHealthStatus): string {
  switch (status) {
    case "healthy":
      return "#22c55e" // green
    case "elevated":
      return "#eab308" // yellow
    case "high":
      return "#f97316" // orange
    case "critical":
      return "#ef4444" // red
    case "burnout_risk":
      return "#dc2626" // dark red
    default:
      return "#6b7280" // gray
  }
}

/**
 * Get recommended daily task limit based on state
 */
export function getRecommendedDailyLimit(state: MemberWorkloadState): number {
  const normalLimit = Math.floor(state.maxLoad / 5) // Assuming 5-day work week

  switch (state.healthStatus) {
    case "healthy":
      return normalLimit
    case "elevated":
      return Math.floor(normalLimit * 0.8)
    case "high":
      return Math.floor(normalLimit * 0.6)
    case "critical":
      return Math.floor(normalLimit * 0.3)
    case "burnout_risk":
      return 0
    default:
      return normalLimit
  }
}
