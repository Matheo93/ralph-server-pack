/**
 * Balance Alerts Service
 *
 * Provides automatic balance monitoring, alerts, and rebalance suggestions
 */

import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { BALANCE_THRESHOLDS } from "@/lib/constants/task-weights"
import { getHouseholdBalance, getWeeklyLoadByParent } from "./charge"
import type { HouseholdBalance } from "@/types/task"

// =============================================================================
// TYPES
// =============================================================================

export interface BalanceAlertStatus {
  hasAlert: boolean
  alertLevel: "none" | "warning" | "critical"
  message: string
  percentageGap: number
  lastChecked: string
}

export interface RebalanceSuggestion {
  taskId: string
  taskTitle: string
  currentAssignee: string
  currentAssigneeName: string
  suggestedAssignee: string
  suggestedAssigneeName: string
  loadWeight: number
  reason: string
}

export interface WeeklyReportData {
  weekStart: string
  weekEnd: string
  totalTasks: number
  completedTasks: number
  totalLoadPoints: number
  members: {
    userId: string
    userName: string
    tasksCompleted: number
    loadPoints: number
    percentage: number
  }[]
  isBalanced: boolean
  alertLevel: "none" | "warning" | "critical"
  comparisonToLastWeek: {
    loadPointsDiff: number
    balanceImproved: boolean
  }
  topCategories: {
    category: string
    loadPoints: number
  }[]
}

export interface AlertPreferences {
  emailAlerts: boolean
  pushAlerts: boolean
  inAppAlerts: boolean
  alertThresholdWarning: number
  alertThresholdCritical: number
}

// =============================================================================
// BALANCE ALERT FUNCTIONS
// =============================================================================

/**
 * Check if balance alert should be triggered
 * Returns the current alert status for the household
 */
export async function checkBalanceAlert(): Promise<BalanceAlertStatus | null> {
  const balance = await getHouseholdBalance()
  if (!balance) return null

  const { members, isBalanced, alertLevel } = balance

  if (members.length < 2) {
    return {
      hasAlert: false,
      alertLevel: "none",
      message: "Un seul parent dans le foyer",
      percentageGap: 0,
      lastChecked: new Date().toISOString(),
    }
  }

  // Calculate percentage gap
  const sortedByPercentage = [...members].sort((a, b) => b.percentage - a.percentage)
  const highest = sortedByPercentage[0]?.percentage ?? 0
  const lowest = sortedByPercentage[sortedByPercentage.length - 1]?.percentage ?? 0
  const percentageGap = highest - lowest

  let message = ""
  if (alertLevel === "critical") {
    const overloadedMember = sortedByPercentage[0]
    message = `${overloadedMember?.userName ?? "Un parent"} gère ${Math.round(highest)}% de la charge mentale. Redistribution recommandée.`
  } else if (alertLevel === "warning") {
    message = `La répartition commence à être déséquilibrée (${Math.round(highest)}/${Math.round(lowest)}).`
  } else {
    message = `La charge est bien équilibrée (${Math.round(highest)}/${Math.round(lowest)}).`
  }

  return {
    hasAlert: !isBalanced,
    alertLevel,
    message,
    percentageGap,
    lastChecked: new Date().toISOString(),
  }
}

/**
 * Get tasks that could be reassigned to improve balance
 * Returns suggestions for rebalancing the workload
 */
export async function getRebalanceSuggestions(
  limit: number = 5
): Promise<RebalanceSuggestion[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) return []

  const householdId = membership.household_id

  // Get household members with their load
  const parentLoads = await getWeeklyLoadByParent(householdId)

  if (parentLoads.length < 2) return []

  // Sort by load descending
  parentLoads.sort((a, b) => b.totalLoad - a.totalLoad)

  const overloadedParent = parentLoads[0]
  const underloadedParent = parentLoads[parentLoads.length - 1]

  if (!overloadedParent || !underloadedParent) return []

  // Check if there's enough imbalance to suggest rebalancing
  const totalLoad = parentLoads.reduce((sum, p) => sum + p.totalLoad, 0)
  const overloadedPercentage = totalLoad > 0
    ? (overloadedParent.totalLoad / totalLoad) * 100
    : 0

  if (overloadedPercentage <= BALANCE_THRESHOLDS.WARNING) {
    return [] // Already balanced
  }

  // Get pending tasks from the overloaded parent that could be reassigned
  const reassignableTasks = await query<{
    id: string
    title: string
    load_weight: number
    deadline: string
  }>(`
    SELECT t.id, t.title, t.load_weight, t.deadline::text
    FROM tasks t
    WHERE t.household_id = $1
      AND t.assigned_to = $2
      AND t.status = 'pending'
      AND t.deadline >= CURRENT_DATE
    ORDER BY t.load_weight DESC, t.deadline ASC
    LIMIT $3
  `, [householdId, overloadedParent.userId, limit])

  return reassignableTasks.map((task) => ({
    taskId: task.id,
    taskTitle: task.title,
    currentAssignee: overloadedParent.userId,
    currentAssigneeName: overloadedParent.email?.split("@")[0] ?? "Parent 1",
    suggestedAssignee: underloadedParent.userId,
    suggestedAssigneeName: underloadedParent.email?.split("@")[0] ?? "Parent 2",
    loadWeight: task.load_weight,
    reason: `Rééquilibrer la charge (actuellement ${Math.round(overloadedPercentage)}%)`,
  }))
}

/**
 * Apply a rebalance suggestion by reassigning the task
 */
export async function applyRebalanceSuggestion(
  taskId: string,
  newAssigneeId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return { success: false, error: "Non authentifié" }
  }

  await setCurrentUser(currentUserId)

  // Verify the user belongs to the same household as the task
  const task = await queryOne<{ household_id: string; assigned_to: string }>(`
    SELECT t.household_id, t.assigned_to
    FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = $1 AND hm.user_id = $2 AND hm.is_active = true
  `, [taskId, currentUserId])

  if (!task) {
    return { success: false, error: "Tâche non trouvée" }
  }

  // Verify new assignee is in the household
  const newAssignee = await queryOne<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE household_id = $1 AND user_id = $2 AND is_active = true
  `, [task.household_id, newAssigneeId])

  if (!newAssignee) {
    return { success: false, error: "Membre non trouvé" }
  }

  // Update the task assignment
  await query(`
    UPDATE tasks
    SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2
  `, [newAssigneeId, taskId])

  return { success: true }
}

// =============================================================================
// WEEKLY REPORT FUNCTIONS
// =============================================================================

/**
 * Generate weekly report data for the household
 */
export async function generateWeeklyReport(): Promise<WeeklyReportData | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) return null

  const householdId = membership.household_id

  // Calculate week boundaries
  const today = new Date()
  const startOfWeek = new Date(today)
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startOfWeek.setDate(today.getDate() + diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const weekStartStr = startOfWeek.toISOString().split("T")[0] as string
  const weekEndStr = endOfWeek.toISOString().split("T")[0] as string

  // Get this week's stats
  const weekStats = await queryOne<{
    total_tasks: string
    completed_tasks: string
    total_load: string
  }>(`
    SELECT
      COUNT(*)::text as total_tasks,
      COUNT(*) FILTER (WHERE status = 'done')::text as completed_tasks,
      COALESCE(SUM(load_weight), 0)::text as total_load
    FROM tasks
    WHERE household_id = $1
      AND (
        (completed_at >= $2::date AND completed_at <= $3::date + INTERVAL '1 day')
        OR (status = 'pending' AND deadline >= $2::date AND deadline <= $3::date)
      )
  `, [householdId, weekStartStr, weekEndStr])

  // Get member breakdown
  const memberStats = await query<{
    user_id: string
    email: string
    tasks_completed: string
    load_points: string
  }>(`
    SELECT
      hm.user_id,
      u.email,
      COUNT(*) FILTER (WHERE t.status = 'done')::text as tasks_completed,
      COALESCE(SUM(t.load_weight) FILTER (WHERE t.status IN ('done', 'pending')), 0)::text as load_points
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.household_id = hm.household_id
      AND (
        (t.completed_at >= $2::date AND t.completed_at <= $3::date + INTERVAL '1 day')
        OR (t.status = 'pending' AND t.deadline >= $2::date AND t.deadline <= $3::date)
      )
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY hm.user_id, u.email
  `, [householdId, weekStartStr, weekEndStr])

  const totalLoadPoints = parseInt(weekStats?.total_load ?? "0", 10)

  const members = memberStats.map((m) => {
    const loadPoints = parseInt(m.load_points, 10)
    return {
      userId: m.user_id,
      userName: m.email?.split("@")[0] ?? "Parent",
      tasksCompleted: parseInt(m.tasks_completed, 10),
      loadPoints,
      percentage: totalLoadPoints > 0 ? Math.round((loadPoints / totalLoadPoints) * 100) : 0,
    }
  })

  // Calculate balance status
  const maxPercentage = Math.max(...members.map((m) => m.percentage), 0)
  const isBalanced = maxPercentage <= BALANCE_THRESHOLDS.WARNING
  const alertLevel: "none" | "warning" | "critical" =
    maxPercentage > BALANCE_THRESHOLDS.CRITICAL
      ? "critical"
      : maxPercentage > BALANCE_THRESHOLDS.WARNING
        ? "warning"
        : "none"

  // Get last week's data for comparison
  const lastWeekStart = new Date(startOfWeek)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(endOfWeek)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7)

  const lastWeekStartStr = lastWeekStart.toISOString().split("T")[0] as string
  const lastWeekEndStr = lastWeekEnd.toISOString().split("T")[0] as string

  const lastWeekStats = await queryOne<{ total_load: string }>(`
    SELECT COALESCE(SUM(load_weight), 0)::text as total_load
    FROM tasks
    WHERE household_id = $1
      AND status IN ('done', 'pending')
      AND (
        (completed_at >= $2::date AND completed_at <= $3::date + INTERVAL '1 day')
        OR (status = 'pending' AND deadline >= $2::date AND deadline <= $3::date)
      )
  `, [householdId, lastWeekStartStr, lastWeekEndStr])

  const lastWeekLoad = parseInt(lastWeekStats?.total_load ?? "0", 10)

  // Get last week's balance
  const lastWeekMembers = await query<{ user_id: string; load_points: string }>(`
    SELECT
      hm.user_id,
      COALESCE(SUM(t.load_weight), 0)::text as load_points
    FROM household_members hm
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.household_id = hm.household_id
      AND t.status IN ('done', 'pending')
      AND (
        (t.completed_at >= $2::date AND t.completed_at <= $3::date + INTERVAL '1 day')
        OR (t.status = 'pending' AND t.deadline >= $2::date AND t.deadline <= $3::date)
      )
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY hm.user_id
  `, [householdId, lastWeekStartStr, lastWeekEndStr])

  const lastWeekMaxPercentage = lastWeekLoad > 0
    ? Math.max(...lastWeekMembers.map((m) => (parseInt(m.load_points, 10) / lastWeekLoad) * 100), 0)
    : 0

  // Get top categories
  const topCategories = await query<{ category: string; load_points: string }>(`
    SELECT
      c.code as category,
      COALESCE(SUM(t.load_weight), 0)::text as load_points
    FROM tasks t
    JOIN categories c ON c.id = t.category_id
    WHERE t.household_id = $1
      AND t.status IN ('done', 'pending')
      AND (
        (t.completed_at >= $2::date AND t.completed_at <= $3::date + INTERVAL '1 day')
        OR (t.status = 'pending' AND t.deadline >= $2::date AND t.deadline <= $3::date)
      )
    GROUP BY c.code
    ORDER BY load_points DESC
    LIMIT 3
  `, [householdId, weekStartStr, weekEndStr])

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalTasks: parseInt(weekStats?.total_tasks ?? "0", 10),
    completedTasks: parseInt(weekStats?.completed_tasks ?? "0", 10),
    totalLoadPoints,
    members,
    isBalanced,
    alertLevel,
    comparisonToLastWeek: {
      loadPointsDiff: totalLoadPoints - lastWeekLoad,
      balanceImproved: maxPercentage < lastWeekMaxPercentage,
    },
    topCategories: topCategories.map((c) => ({
      category: c.category,
      loadPoints: parseInt(c.load_points, 10),
    })),
  }
}

// =============================================================================
// ALERT PREFERENCES
// =============================================================================

/**
 * Get alert preferences for the current user
 */
export async function getAlertPreferences(): Promise<AlertPreferences | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  const prefs = await queryOne<{
    notification_email: boolean
    notification_push: boolean
  }>(`
    SELECT notification_email, notification_push
    FROM users
    WHERE id = $1
  `, [currentUserId])

  // Default preferences
  return {
    emailAlerts: prefs?.notification_email ?? true,
    pushAlerts: prefs?.notification_push ?? true,
    inAppAlerts: true,
    alertThresholdWarning: BALANCE_THRESHOLDS.WARNING,
    alertThresholdCritical: BALANCE_THRESHOLDS.CRITICAL,
  }
}

/**
 * Update alert preferences for the current user
 */
export async function updateAlertPreferences(
  prefs: Partial<AlertPreferences>
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return { success: false, error: "Non authentifié" }
  }

  await setCurrentUser(currentUserId)

  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 2

  if (prefs.emailAlerts !== undefined) {
    updates.push(`notification_email = $${paramIndex}`)
    values.push(prefs.emailAlerts)
    paramIndex++
  }

  if (prefs.pushAlerts !== undefined) {
    updates.push(`notification_push = $${paramIndex}`)
    values.push(prefs.pushAlerts)
    paramIndex++
  }

  if (updates.length === 0) {
    return { success: true }
  }

  await query(`
    UPDATE users
    SET ${updates.join(", ")}, updated_at = NOW()
    WHERE id = $1
  `, [currentUserId, ...values])

  return { success: true }
}

// =============================================================================
// SCHEDULED ALERT CHECK
// =============================================================================

/**
 * Check if a balance alert notification should be sent
 * This function can be called by a cron job or scheduled task
 */
export async function shouldSendBalanceNotification(
  householdId: string
): Promise<{
  shouldSend: boolean
  alertLevel: "warning" | "critical" | "none"
  message: string
}> {
  // Get household balance
  const balance = await queryOne<{
    id: string
    last_balance_alert_at: string | null
  }>(`
    SELECT id, last_balance_alert_at::text
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!balance) {
    return { shouldSend: false, alertLevel: "none", message: "" }
  }

  // Check if we've already sent an alert in the last 24 hours
  if (balance.last_balance_alert_at) {
    const lastAlert = new Date(balance.last_balance_alert_at)
    const hoursSinceLastAlert = (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastAlert < 24) {
      return { shouldSend: false, alertLevel: "none", message: "Alert sent recently" }
    }
  }

  // Get current balance
  const members = await query<{ user_id: string; total_load: string }>(`
    SELECT
      assigned_to as user_id,
      SUM(load_weight)::text as total_load
    FROM tasks
    WHERE household_id = $1
      AND assigned_to IS NOT NULL
      AND status IN ('done', 'pending')
      AND (completed_at >= NOW() - INTERVAL '7 days'
           OR (status = 'pending' AND deadline >= CURRENT_DATE))
    GROUP BY assigned_to
  `, [householdId])

  const totalLoad = members.reduce((sum, m) => sum + parseInt(m.total_load, 10), 0)

  if (totalLoad === 0 || members.length < 2) {
    return { shouldSend: false, alertLevel: "none", message: "Not enough data" }
  }

  const maxPercentage = Math.max(
    ...members.map((m) => (parseInt(m.total_load, 10) / totalLoad) * 100),
    0
  )

  if (maxPercentage > BALANCE_THRESHOLDS.CRITICAL) {
    return {
      shouldSend: true,
      alertLevel: "critical",
      message: `La charge mentale est très déséquilibrée (${Math.round(maxPercentage)}%). Pensez à redistribuer les tâches.`,
    }
  }

  if (maxPercentage > BALANCE_THRESHOLDS.WARNING) {
    return {
      shouldSend: true,
      alertLevel: "warning",
      message: `La charge mentale commence à être déséquilibrée (${Math.round(maxPercentage)}%).`,
    }
  }

  return { shouldSend: false, alertLevel: "none", message: "Balance is healthy" }
}

/**
 * Mark that a balance alert was sent to prevent spam
 */
export async function markBalanceAlertSent(householdId: string): Promise<void> {
  await query(`
    UPDATE households
    SET last_balance_alert_at = NOW()
    WHERE id = $1
  `, [householdId])
}
