import { query, queryOne } from "@/lib/aws/database"
import { getLoadBalancePercentage, getWeeklyLoadByParent } from "./charge"
import { sendPushToHousehold, sendPushToUser } from "./notifications"
import { BALANCE_THRESHOLDS } from "@/lib/constants/task-weights"
import type {
  Alert,
  AlertType,
  AlertSeverity,
  AlertSummary,
  ImbalanceAlertData,
  OverloadAlertData,
  InactivityAlertData,
} from "@/types/alert"

// Threshold for weekly overload (in load points)
const OVERLOAD_THRESHOLD = 30

// Days without activity to trigger inactivity alert
const INACTIVITY_DAYS_WARNING = 7
const INACTIVITY_DAYS_CRITICAL = 14

/**
 * Check for load imbalance alert in a household
 */
export async function checkImbalanceAlert(
  householdId: string
): Promise<Alert | null> {
  const balance = await getLoadBalancePercentage(householdId)

  if (balance.isBalanced) {
    return null
  }

  const severity: AlertSeverity = balance.alertLevel === "critical" ? "critical" : "warning"

  const data: ImbalanceAlertData = {
    type: "imbalance",
    ratio: balance.imbalanceRatio,
    percentages: balance.percentages.map((p) => ({
      userId: p.userId,
      userName: p.email.split("@")[0] ?? "Parent",
      percentage: p.percentage,
    })),
    threshold: severity === "critical" ? BALANCE_THRESHOLDS.CRITICAL : BALANCE_THRESHOLDS.WARNING,
  }

  const messages = getAlertMessages("imbalance", data)

  return {
    id: `imbalance-${householdId}`,
    type: "imbalance",
    severity,
    householdId,
    title: messages.title,
    message: messages.message,
    suggestion: messages.suggestion,
    data,
    createdAt: new Date(),
  }
}

/**
 * Check for overload alert for a specific member
 */
export async function checkOverloadAlert(
  memberId: string,
  householdId: string
): Promise<Alert | null> {
  // Get member's weekly load
  const parentLoads = await getWeeklyLoadByParent(householdId)
  const memberLoad = parentLoads.find((p) => p.userId === memberId)

  if (!memberLoad) {
    return null
  }

  // Calculate household average
  const totalLoad = parentLoads.reduce((sum, p) => sum + p.totalLoad, 0)
  const averageLoad = parentLoads.length > 0 ? Math.round(totalLoad / parentLoads.length) : 0

  // Check if overloaded
  if (memberLoad.totalLoad <= OVERLOAD_THRESHOLD) {
    return null
  }

  const severity: AlertSeverity =
    memberLoad.totalLoad > OVERLOAD_THRESHOLD * 1.5 ? "critical" : "warning"

  const data: OverloadAlertData = {
    type: "overload",
    userId: memberLoad.userId,
    userName: memberLoad.email.split("@")[0] ?? "Parent",
    weeklyLoad: memberLoad.totalLoad,
    tasksCount: memberLoad.tasksCount,
    averageLoad,
  }

  const messages = getAlertMessages("overload", data)

  return {
    id: `overload-${memberId}`,
    type: "overload",
    severity,
    householdId,
    memberId,
    title: messages.title,
    message: messages.message,
    suggestion: messages.suggestion,
    data,
    createdAt: new Date(),
  }
}

/**
 * Check for inactivity alert for a specific member
 */
export async function checkInactivityAlert(
  memberId: string,
  householdId: string
): Promise<Alert | null> {
  // Get member info
  const member = await queryOne<{ email: string }>(`
    SELECT u.email
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.user_id = $1 AND hm.household_id = $2 AND hm.is_active = true
  `, [memberId, householdId])

  if (!member) {
    return null
  }

  // Get last activity date
  const lastActivity = await queryOne<{ last_date: string }>(`
    SELECT MAX(completed_at)::text as last_date
    FROM tasks
    WHERE household_id = $1
      AND assigned_to = $2
      AND status = 'done'
      AND completed_at IS NOT NULL
  `, [householdId, memberId])

  const lastDate = lastActivity?.last_date ? new Date(lastActivity.last_date) : null
  const now = new Date()
  const daysSinceActivity = lastDate
    ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity

  // Check if inactive
  if (daysSinceActivity < INACTIVITY_DAYS_WARNING) {
    return null
  }

  const severity: AlertSeverity =
    daysSinceActivity >= INACTIVITY_DAYS_CRITICAL ? "critical" : "warning"

  const data: InactivityAlertData = {
    type: "inactivity",
    userId: memberId,
    userName: member.email.split("@")[0] ?? "Parent",
    lastActivityDate: lastDate,
    daysSinceActivity: lastDate ? daysSinceActivity : 0,
  }

  const messages = getAlertMessages("inactivity", data)

  return {
    id: `inactivity-${memberId}`,
    type: "inactivity",
    severity,
    householdId,
    memberId,
    title: messages.title,
    message: messages.message,
    suggestion: messages.suggestion,
    data,
    createdAt: new Date(),
  }
}

/**
 * Get all active alerts for a household
 */
export async function getHouseholdAlerts(
  householdId: string
): Promise<Alert[]> {
  const alerts: Alert[] = []

  // Check imbalance alert
  const imbalanceAlert = await checkImbalanceAlert(householdId)
  if (imbalanceAlert) {
    alerts.push(imbalanceAlert)
  }

  // Get all household members
  const members = await query<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  // Check per-member alerts
  for (const member of members) {
    const overloadAlert = await checkOverloadAlert(member.user_id, householdId)
    if (overloadAlert) {
      alerts.push(overloadAlert)
    }

    const inactivityAlert = await checkInactivityAlert(member.user_id, householdId)
    if (inactivityAlert) {
      alerts.push(inactivityAlert)
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}

/**
 * Get alert summary for dashboard display
 */
export async function getAlertSummary(
  householdId: string
): Promise<AlertSummary> {
  const alerts = await getHouseholdAlerts(householdId)

  const byType: Record<AlertType, number> = {
    imbalance: 0,
    overload: 0,
    inactivity: 0,
  }

  const bySeverity: Record<AlertSeverity, number> = {
    info: 0,
    warning: 0,
    critical: 0,
  }

  for (const alert of alerts) {
    byType[alert.type]++
    bySeverity[alert.severity]++
  }

  return {
    total: alerts.length,
    byType,
    bySeverity,
    mostCritical: alerts[0], // Already sorted by severity
  }
}

/**
 * Generate alert messages using templates
 */
function getAlertMessages(
  type: AlertType,
  data: ImbalanceAlertData | OverloadAlertData | InactivityAlertData
): { title: string; message: string; suggestion: string } {
  // Non-judgmental message templates (French)
  const templates: Record<AlertType, {
    title: string
    getMessage: (d: ImbalanceAlertData | OverloadAlertData | InactivityAlertData) => string
    getSuggestion: (d: ImbalanceAlertData | OverloadAlertData | InactivityAlertData) => string
  }> = {
    imbalance: {
      title: "Répartition déséquilibrée",
      getMessage: (d) => {
        const data = d as ImbalanceAlertData
        return `La répartition actuelle est de ${data.ratio}. Un rééquilibrage pourrait être bénéfique pour le foyer.`
      },
      getSuggestion: (d) => {
        const data = d as ImbalanceAlertData
        const leastLoaded = data.percentages[data.percentages.length - 1]
        return `${leastLoaded?.userName ?? "Un parent"} pourrait prendre en charge quelques tâches supplémentaires si son emploi du temps le permet.`
      },
    },
    overload: {
      title: "Charge importante cette semaine",
      getMessage: (d) => {
        const data = d as OverloadAlertData
        return `${data.userName} a une charge de ${data.weeklyLoad} points cette semaine (${data.tasksCount} tâches), au-dessus de la moyenne du foyer (${data.averageLoad} points).`
      },
      getSuggestion: () => {
        return "Peut-être qu'une partie de ces tâches pourrait être redistribuée ou reportée si nécessaire."
      },
    },
    inactivity: {
      title: "Pas d'activité récente",
      getMessage: (d) => {
        const data = d as InactivityAlertData
        if (data.daysSinceActivity === 0) {
          return `${data.userName} n'a pas encore complété de tâche.`
        }
        return `${data.userName} n'a pas complété de tâche depuis ${data.daysSinceActivity} jours.`
      },
      getSuggestion: () => {
        return "Vérifiez si tout va bien ou si certaines tâches pourraient être attribuées."
      },
    },
  }

  const template = templates[type]
  return {
    title: template.title,
    message: template.getMessage(data),
    suggestion: template.getSuggestion(data),
  }
}

/**
 * Check if an alert should be displayed (not dismissed recently)
 */
export function shouldShowAlert(
  alert: Alert,
  dismissedAlerts: string[]
): boolean {
  // Check if explicitly dismissed
  if (dismissedAlerts.includes(alert.id)) {
    return false
  }

  // Check if expired
  if (alert.expiresAt && alert.expiresAt < new Date()) {
    return false
  }

  return true
}

// ============================================================
// PUSH NOTIFICATION ALERTS
// ============================================================

/**
 * Send push notification for load imbalance alert (60/40 threshold)
 */
export async function sendImbalancePushNotification(
  householdId: string
): Promise<{ sent: boolean; ratio?: string }> {
  const alert = await checkImbalanceAlert(householdId)

  if (!alert) {
    return { sent: false }
  }

  // Only send push for critical imbalance (≥60%)
  if (alert.severity !== "critical") {
    return { sent: false }
  }

  const data = alert.data as ImbalanceAlertData

  // Check if household has balance alert enabled
  const hasAlertsEnabled = await checkBalanceAlertEnabled(householdId)
  if (!hasAlertsEnabled) {
    return { sent: false }
  }

  // Check if we already sent this alert today
  const alreadySentToday = await wasAlertSentToday(householdId, "imbalance")
  if (alreadySentToday) {
    return { sent: false }
  }

  // Send push notification to all household members
  const result = await sendPushToHousehold(
    householdId,
    "Charge déséquilibrée",
    `Répartition actuelle: ${data.ratio}. ${alert.suggestion}`,
    {
      type: "balance_alert",
      alertType: "imbalance",
      ratio: data.ratio,
      link: "/charge",
    }
  )

  // Record that we sent this alert
  if (result.sent > 0) {
    await recordAlertSent(householdId, "imbalance")
  }

  return { sent: result.sent > 0, ratio: data.ratio }
}

/**
 * Send push notification for overload alert
 */
export async function sendOverloadPushNotification(
  memberId: string,
  householdId: string
): Promise<{ sent: boolean; weeklyLoad?: number }> {
  const alert = await checkOverloadAlert(memberId, householdId)

  if (!alert) {
    return { sent: false }
  }

  const data = alert.data as OverloadAlertData

  // Check if user has balance alert enabled
  const hasAlertsEnabled = await checkUserBalanceAlertEnabled(memberId)
  if (!hasAlertsEnabled) {
    return { sent: false }
  }

  // Check if we already sent this alert today
  const alreadySentToday = await wasAlertSentToday(householdId, `overload-${memberId}`)
  if (alreadySentToday) {
    return { sent: false }
  }

  // Send push notification to the overloaded user
  const result = await sendPushToUser(
    memberId,
    "Charge importante",
    `Vous avez ${data.weeklyLoad} points cette semaine (${data.tasksCount} tâches). ${alert.suggestion}`,
    {
      type: "balance_alert",
      alertType: "overload",
      weeklyLoad: String(data.weeklyLoad),
      link: "/charge",
    }
  )

  // Record that we sent this alert
  if (result.sent > 0) {
    await recordAlertSent(householdId, `overload-${memberId}`)
  }

  return { sent: result.sent > 0, weeklyLoad: data.weeklyLoad }
}

/**
 * Check and send all balance-related alerts for a household
 * Called by scheduler to check all households
 */
export async function checkAndSendBalanceAlerts(
  householdId: string
): Promise<{
  imbalanceSent: boolean
  overloadsSent: number
  ratio?: string
}> {
  // Send imbalance alert
  const imbalanceResult = await sendImbalancePushNotification(householdId)

  // Get all members and check overload
  const members = await query<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  let overloadsSent = 0
  for (const member of members) {
    const overloadResult = await sendOverloadPushNotification(member.user_id, householdId)
    if (overloadResult.sent) {
      overloadsSent++
    }
  }

  return {
    imbalanceSent: imbalanceResult.sent,
    overloadsSent,
    ratio: imbalanceResult.ratio,
  }
}

/**
 * Get all households that should receive balance alerts
 */
export async function getHouseholdsForBalanceAlerts(): Promise<string[]> {
  const households = await query<{ household_id: string }>(`
    SELECT DISTINCT hm.household_id
    FROM household_members hm
    JOIN user_preferences up ON up.user_id = hm.user_id
    WHERE hm.is_active = true
      AND up.balance_alert_enabled = true
  `)

  return households.map((h) => h.household_id)
}

// ============================================================
// HELPER FUNCTIONS FOR ALERT TRACKING
// ============================================================

/**
 * Check if household has at least one member with balance alerts enabled
 */
async function checkBalanceAlertEnabled(householdId: string): Promise<boolean> {
  const result = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM household_members hm
    JOIN user_preferences up ON up.user_id = hm.user_id
    WHERE hm.household_id = $1
      AND hm.is_active = true
      AND up.balance_alert_enabled = true
  `, [householdId])

  return (result?.count ?? 0) > 0
}

/**
 * Check if a specific user has balance alerts enabled
 */
async function checkUserBalanceAlertEnabled(userId: string): Promise<boolean> {
  const result = await queryOne<{ balance_alert_enabled: boolean }>(`
    SELECT COALESCE(balance_alert_enabled, true) as balance_alert_enabled
    FROM user_preferences
    WHERE user_id = $1
  `, [userId])

  return result?.balance_alert_enabled ?? true
}

/**
 * Check if an alert was already sent today to avoid spam
 */
async function wasAlertSentToday(
  householdId: string,
  alertKey: string
): Promise<boolean> {
  const result = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM alert_history
    WHERE household_id = $1
      AND alert_key = $2
      AND sent_at::date = CURRENT_DATE
  `, [householdId, alertKey])

  return (result?.count ?? 0) > 0
}

/**
 * Record that an alert was sent
 */
async function recordAlertSent(
  householdId: string,
  alertKey: string
): Promise<void> {
  await query(`
    INSERT INTO alert_history (household_id, alert_key, sent_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (household_id, alert_key, sent_at::date)
    DO NOTHING
  `, [householdId, alertKey])
}
