/**
 * Task Assigner
 *
 * Automatically assigns tasks to parents based on current load distribution.
 */

import { ParentLoad, LoadDistribution, calculateDistribution, TaskLoad } from "./calculator"

// =============================================================================
// TYPES
// =============================================================================

export interface AssignmentResult {
  assignedTo: string
  reason: string
  parentLoad: ParentLoad
}

export interface AssignmentOptions {
  /** Prefer a specific parent if load is close */
  preferredParentId?: string
  /** Threshold for considering loads "equal" (percentage) */
  equalityThreshold?: number
  /** Parents to exclude from assignment */
  excludedParentIds?: string[]
  /** Category preference (some parents may prefer certain categories) */
  categoryPreferences?: Record<string, string[]>
}

export interface ParentAvailability {
  userId: string
  isAvailable: boolean
  reason?: string // e.g., "en vacances", "malade"
  availableFrom?: Date
}

// =============================================================================
// ASSIGNMENT LOGIC
// =============================================================================

/**
 * Get the least loaded parent for assignment
 */
export function getLeastLoadedParent(
  distribution: LoadDistribution,
  options: AssignmentOptions = {}
): AssignmentResult | null {
  const { preferredParentId, equalityThreshold = 5, excludedParentIds = [] } = options

  // Filter out excluded parents
  const availableParents = distribution.parents.filter(
    (p) => !excludedParentIds.includes(p.userId)
  )

  if (availableParents.length === 0) {
    return null
  }

  // Sort by total weight (ascending)
  const sorted = [...availableParents].sort((a, b) => a.totalWeight - b.totalWeight)

  const leastLoaded = sorted[0]!

  // Check if preferred parent is close enough in load
  if (preferredParentId) {
    const preferred = availableParents.find((p) => p.userId === preferredParentId)
    if (preferred) {
      const loadDiff = Math.abs(preferred.percentage - leastLoaded.percentage)
      if (loadDiff <= equalityThreshold) {
        return {
          assignedTo: preferred.userId,
          reason: `Assigné à ${preferred.userName} (préférence, charge similaire)`,
          parentLoad: preferred,
        }
      }
    }
  }

  return {
    assignedTo: leastLoaded.userId,
    reason: `Assigné à ${leastLoaded.userName} (charge la plus faible: ${leastLoaded.percentage}%)`,
    parentLoad: leastLoaded,
  }
}

/**
 * Get assignment considering rotation
 * Rotates between parents with similar load
 */
export function getRotatingAssignment(
  distribution: LoadDistribution,
  lastAssignedTo: string | null,
  options: AssignmentOptions = {}
): AssignmentResult | null {
  const { equalityThreshold = 10, excludedParentIds = [] } = options

  // Filter out excluded parents
  const availableParents = distribution.parents.filter(
    (p) => !excludedParentIds.includes(p.userId)
  )

  if (availableParents.length === 0) {
    return null
  }

  if (availableParents.length === 1) {
    const parent = availableParents[0]!
    return {
      assignedTo: parent.userId,
      reason: `Assigné à ${parent.userName} (seul parent disponible)`,
      parentLoad: parent,
    }
  }

  // Sort by load
  const sorted = [...availableParents].sort((a, b) => a.totalWeight - b.totalWeight)
  const minLoad = sorted[0]!.percentage

  // Find parents within equality threshold of minimum
  const eligibleParents = sorted.filter(
    (p) => p.percentage - minLoad <= equalityThreshold
  )

  // If last assigned is in eligible list, try to rotate
  if (lastAssignedTo && eligibleParents.length > 1) {
    const lastIndex = eligibleParents.findIndex((p) => p.userId === lastAssignedTo)
    if (lastIndex !== -1) {
      // Get next in rotation
      const nextIndex = (lastIndex + 1) % eligibleParents.length
      const next = eligibleParents[nextIndex]!
      return {
        assignedTo: next.userId,
        reason: `Rotation vers ${next.userName} (charge équilibrée)`,
        parentLoad: next,
      }
    }
  }

  // Default to least loaded
  const leastLoaded = sorted[0]!
  return {
    assignedTo: leastLoaded.userId,
    reason: `Assigné à ${leastLoaded.userName} (charge la plus faible)`,
    parentLoad: leastLoaded,
  }
}

/**
 * Get assignment based on category preference
 */
export function getCategoryBasedAssignment(
  distribution: LoadDistribution,
  taskCategory: string,
  categoryPreferences: Record<string, string[]>,
  options: AssignmentOptions = {}
): AssignmentResult | null {
  const { excludedParentIds = [], equalityThreshold = 15 } = options

  // Filter out excluded parents
  const availableParents = distribution.parents.filter(
    (p) => !excludedParentIds.includes(p.userId)
  )

  if (availableParents.length === 0) {
    return null
  }

  // Find parents who prefer this category
  const preferringParents = availableParents.filter(
    (p) => categoryPreferences[p.userId]?.includes(taskCategory)
  )

  if (preferringParents.length > 0) {
    // Among preferring parents, pick the least loaded
    const sorted = preferringParents.sort((a, b) => a.totalWeight - b.totalWeight)
    const selected = sorted[0]!

    // Only use preference if load isn't too high
    const minLoad = Math.min(...availableParents.map((p) => p.percentage))
    if (selected.percentage - minLoad <= equalityThreshold) {
      return {
        assignedTo: selected.userId,
        reason: `Assigné à ${selected.userName} (préférence pour ${taskCategory})`,
        parentLoad: selected,
      }
    }
  }

  // Fall back to least loaded
  return getLeastLoadedParent(distribution, options)
}

// =============================================================================
// AVAILABILITY MANAGEMENT
// =============================================================================

/**
 * Filter distribution by availability
 */
export function applyAvailability(
  distribution: LoadDistribution,
  availabilities: ParentAvailability[]
): LoadDistribution {
  const unavailableIds = availabilities
    .filter((a) => !a.isAvailable)
    .map((a) => a.userId)

  const filteredParents = distribution.parents.filter(
    (p) => !unavailableIds.includes(p.userId)
  )

  // Recalculate totals and percentages
  const totalWeight = filteredParents.reduce((sum, p) => sum + p.totalWeight, 0)
  const totalTasks = filteredParents.reduce((sum, p) => sum + p.taskCount, 0)

  // Update percentages
  for (const parent of filteredParents) {
    parent.percentage =
      totalWeight > 0
        ? Math.round((parent.totalWeight / totalWeight) * 100)
        : 0
  }

  const sorted = [...filteredParents].sort((a, b) => b.totalWeight - a.totalWeight)

  return {
    ...distribution,
    parents: filteredParents,
    totalWeight,
    totalTasks,
    mostLoaded: sorted[0] ?? null,
    leastLoaded: sorted[sorted.length - 1] ?? null,
  }
}

// =============================================================================
// BATCH ASSIGNMENT
// =============================================================================

export interface BatchAssignmentResult {
  taskId: string
  assignedTo: string
  reason: string
}

/**
 * Assign multiple tasks with load balancing
 */
export function batchAssign(
  tasks: Array<{ id: string; weight: number; category?: string }>,
  currentDistribution: LoadDistribution,
  options: AssignmentOptions = {}
): BatchAssignmentResult[] {
  const results: BatchAssignmentResult[] = []

  // Create a working copy of loads
  const workingLoads = new Map<string, number>()
  for (const parent of currentDistribution.parents) {
    workingLoads.set(parent.userId, parent.totalWeight)
  }

  // Sort tasks by weight (highest first for better distribution)
  const sortedTasks = [...tasks].sort((a, b) => b.weight - a.weight)

  for (const task of sortedTasks) {
    // Find parent with lowest current working load
    let minLoad = Infinity
    let selectedParent: string | null = null

    for (const parent of currentDistribution.parents) {
      if (options.excludedParentIds?.includes(parent.userId)) continue

      const currentLoad = workingLoads.get(parent.userId) ?? 0
      if (currentLoad < minLoad) {
        minLoad = currentLoad
        selectedParent = parent.userId
      }
    }

    if (selectedParent) {
      // Update working load
      const newLoad = (workingLoads.get(selectedParent) ?? 0) + task.weight
      workingLoads.set(selectedParent, newLoad)

      const parentName =
        currentDistribution.parents.find((p) => p.userId === selectedParent)?.userName ??
        "Inconnu"

      results.push({
        taskId: task.id,
        assignedTo: selectedParent,
        reason: `Assigné à ${parentName} pour équilibrer la charge`,
      })
    }
  }

  return results
}

// =============================================================================
// REBALANCE SUGGESTIONS
// =============================================================================

export interface RebalanceSuggestion {
  taskId: string
  taskTitle: string
  currentAssignee: string
  suggestedAssignee: string
  reason: string
  impact: number // How much it would improve balance
}

/**
 * Suggest task reassignments to improve balance
 */
export function suggestRebalance(
  tasks: TaskLoad[],
  distribution: LoadDistribution,
  maxSuggestions: number = 5
): RebalanceSuggestion[] {
  if (distribution.balanceScore >= 80) {
    return [] // Already balanced
  }

  if (!distribution.mostLoaded || !distribution.leastLoaded) {
    return []
  }

  const suggestions: RebalanceSuggestion[] = []

  // Get pending tasks from most loaded parent
  const mostLoadedTasks = tasks.filter(
    (t) =>
      t.assignedTo === distribution.mostLoaded?.userId &&
      !t.completedAt // Only pending tasks
  )

  // Sort by weight (move heaviest tasks first for max impact)
  const sortedTasks = mostLoadedTasks.sort((a, b) => b.weight - a.weight)

  for (const task of sortedTasks) {
    if (suggestions.length >= maxSuggestions) break

    const impact = calculateRebalanceImpact(
      distribution,
      task.weight,
      distribution.mostLoaded.userId,
      distribution.leastLoaded.userId
    )

    if (impact > 0) {
      suggestions.push({
        taskId: task.taskId,
        taskTitle: task.title,
        currentAssignee: distribution.mostLoaded.userName,
        suggestedAssignee: distribution.leastLoaded.userName,
        reason: `Réduirait le déséquilibre de ${impact}%`,
        impact,
      })
    }
  }

  return suggestions
}

/**
 * Calculate how much a transfer would improve balance
 */
function calculateRebalanceImpact(
  distribution: LoadDistribution,
  taskWeight: number,
  fromUserId: string,
  toUserId: string
): number {
  const fromParent = distribution.parents.find((p) => p.userId === fromUserId)
  const toParent = distribution.parents.find((p) => p.userId === toUserId)

  if (!fromParent || !toParent || distribution.totalWeight === 0) {
    return 0
  }

  const currentGap = fromParent.percentage - toParent.percentage

  const newFromWeight = fromParent.totalWeight - taskWeight
  const newToWeight = toParent.totalWeight + taskWeight

  const newFromPercentage = (newFromWeight / distribution.totalWeight) * 100
  const newToPercentage = (newToWeight / distribution.totalWeight) * 100

  const newGap = newFromPercentage - newToPercentage

  // Return improvement in gap (positive = better)
  return Math.round(currentGap - newGap)
}
