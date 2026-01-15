/**
 * Push Notification Templates
 *
 * Pre-built notification templates for common app scenarios.
 * Supports multiple languages and includes all necessary data.
 */

import type { NotificationPayload, DataPayload } from "@/lib/firebase/messaging"

// =============================================================================
// TYPES
// =============================================================================

export interface PushTemplate {
  notification: NotificationPayload
  data: DataPayload
}

export type NotificationTemplateType =
  | "daily_reminder"
  | "deadline_approaching"
  | "streak_at_risk"
  | "balance_alert"
  | "weekly_summary"
  | "task_completed"
  | "task_assigned"
  | "welcome"

// =============================================================================
// DAILY REMINDER
// =============================================================================

export interface DailyReminderParams {
  userName: string
  todayTasksCount: number
  criticalTasksCount: number
  overdueTasksCount: number
}

export function generateDailyReminderPush(params: DailyReminderParams): PushTemplate {
  const { userName, todayTasksCount, criticalTasksCount, overdueTasksCount } = params
  const firstName = userName.split(" ")[0] ?? "Bonjour"

  let title: string
  let body: string

  if (overdueTasksCount > 0) {
    title = `${firstName}, ${overdueTasksCount} tâche${overdueTasksCount > 1 ? "s" : ""} en retard`
    body = `Vous avez ${overdueTasksCount} tâche${overdueTasksCount > 1 ? "s" : ""} en retard et ${todayTasksCount} aujourd'hui.`
  } else if (criticalTasksCount > 0) {
    title = `${criticalTasksCount} tâche${criticalTasksCount > 1 ? "s" : ""} critique${criticalTasksCount > 1 ? "s" : ""} aujourd'hui`
    body = `${firstName}, n'oubliez pas vos ${todayTasksCount} tâches du jour.`
  } else if (todayTasksCount > 0) {
    title = `Bonjour ${firstName}!`
    body = `Vous avez ${todayTasksCount} tâche${todayTasksCount > 1 ? "s" : ""} prévue${todayTasksCount > 1 ? "s" : ""} aujourd'hui.`
  } else {
    title = `Bonne journée ${firstName}!`
    body = "Aucune tâche prévue aujourd'hui. Profitez-en!"
  }

  return {
    notification: {
      title,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "daily_reminder",
      link: "/dashboard",
      todayTasksCount: String(todayTasksCount),
      criticalTasksCount: String(criticalTasksCount),
      overdueTasksCount: String(overdueTasksCount),
    },
  }
}

// =============================================================================
// DEADLINE APPROACHING
// =============================================================================

export interface DeadlineApproachingParams {
  taskTitle: string
  taskId: string
  hoursLeft: number
  childName?: string | null
  isCritical: boolean
}

export function generateDeadlineApproachingPush(
  params: DeadlineApproachingParams
): PushTemplate {
  const { taskTitle, taskId, hoursLeft, childName, isCritical } = params

  let title: string
  let body: string

  if (hoursLeft <= 1) {
    title = isCritical ? "Dernière heure!" : "Moins d'une heure restante"
    body = `"${taskTitle}" arrive à échéance.`
  } else if (hoursLeft <= 3) {
    title = `Plus que ${hoursLeft}h`
    body = `"${taskTitle}" expire bientôt.`
  } else if (hoursLeft <= 24) {
    title = `Échéance dans ${hoursLeft}h`
    body = childName
      ? `"${taskTitle}" pour ${childName} arrive à échéance.`
      : `"${taskTitle}" arrive à échéance.`
  } else {
    const days = Math.floor(hoursLeft / 24)
    title = `Échéance dans ${days} jour${days > 1 ? "s" : ""}`
    body = `N'oubliez pas: "${taskTitle}"`
  }

  return {
    notification: {
      title,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "deadline_approaching",
      taskId,
      link: `/tasks/${taskId}`,
      hoursLeft: String(hoursLeft),
      isCritical: String(isCritical),
    },
  }
}

// =============================================================================
// STREAK AT RISK
// =============================================================================

export interface StreakAtRiskParams {
  currentStreak: number
  bestStreak: number
  uncompletedTaskTitle: string
  taskId: string
  hoursUntilMidnight: number
}

export function generateStreakAtRiskPush(params: StreakAtRiskParams): PushTemplate {
  const { currentStreak, bestStreak, uncompletedTaskTitle, taskId, hoursUntilMidnight } = params

  let title: string
  let body: string

  if (currentStreak === bestStreak && currentStreak >= 7) {
    title = `Votre record de ${currentStreak} jours est en danger!`
    body = `Complétez "${uncompletedTaskTitle}" avant minuit.`
  } else if (currentStreak >= 7) {
    title = `Série de ${currentStreak} jours en danger`
    body = `Plus que ${hoursUntilMidnight}h pour maintenir votre série!`
  } else {
    title = `Série de ${currentStreak} jour${currentStreak > 1 ? "s" : ""}`
    body = `Complétez vos tâches critiques avant minuit.`
  }

  return {
    notification: {
      title,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "streak_at_risk",
      taskId,
      link: `/tasks/${taskId}`,
      currentStreak: String(currentStreak),
      bestStreak: String(bestStreak),
      hoursUntilMidnight: String(hoursUntilMidnight),
    },
  }
}

// =============================================================================
// BALANCE ALERT
// =============================================================================

export interface BalanceAlertParams {
  ratio: string
  alertLevel: "warning" | "critical"
  overloadedMemberName?: string
  suggestedAction?: string
}

export function generateBalanceAlertPush(params: BalanceAlertParams): PushTemplate {
  const { ratio, alertLevel, overloadedMemberName, suggestedAction } = params

  let title: string
  let body: string

  if (alertLevel === "critical") {
    title = "Déséquilibre critique"
    body = overloadedMemberName
      ? `${overloadedMemberName} porte ${ratio.split("/")[0]}% de la charge.`
      : `Répartition de ${ratio}. Pensez à rééquilibrer.`
  } else {
    title = "Répartition déséquilibrée"
    body = suggestedAction ?? `La répartition est de ${ratio}.`
  }

  return {
    notification: {
      title,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "balance_alert",
      link: "/charge",
      ratio,
      alertLevel,
    },
  }
}

// =============================================================================
// WEEKLY SUMMARY
// =============================================================================

export interface WeeklySummaryParams {
  userName: string
  completedTasksCount: number
  totalTasksCount: number
  streakDays: number
  balanceRatio: string
  topCategory?: string
}

export function generateWeeklySummaryPush(params: WeeklySummaryParams): PushTemplate {
  const {
    userName,
    completedTasksCount,
    totalTasksCount,
    streakDays,
    balanceRatio,
    topCategory,
  } = params
  const firstName = userName.split(" ")[0] ?? "Cher utilisateur"
  const completionRate = totalTasksCount > 0
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : 100

  let title: string
  let body: string

  if (completionRate >= 90) {
    title = `Bravo ${firstName}!`
    body = `${completedTasksCount} tâches complétées cette semaine (${completionRate}%).`
  } else if (completionRate >= 70) {
    title = `Bilan de la semaine`
    body = `${completedTasksCount}/${totalTasksCount} tâches complétées.`
  } else {
    title = `Récapitulatif hebdomadaire`
    body = `${completedTasksCount} tâches complétées. ${totalTasksCount - completedTasksCount} en attente.`
  }

  if (streakDays > 7) {
    body += ` Série: ${streakDays} jours!`
  }

  return {
    notification: {
      title,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "weekly_summary",
      link: "/dashboard",
      completedTasksCount: String(completedTasksCount),
      totalTasksCount: String(totalTasksCount),
      completionRate: String(completionRate),
      streakDays: String(streakDays),
      balanceRatio,
      topCategory: topCategory ?? "",
    },
  }
}

// =============================================================================
// TASK COMPLETED (by partner)
// =============================================================================

export interface TaskCompletedParams {
  completedByName: string
  taskTitle: string
  taskId: string
  childName?: string | null
  categoryName?: string | null
}

export function generateTaskCompletedPush(params: TaskCompletedParams): PushTemplate {
  const { completedByName, taskTitle, taskId, childName, categoryName } = params
  const firstName = completedByName.split(" ")[0] ?? completedByName

  let body: string
  if (childName && categoryName) {
    body = `"${taskTitle}" (${categoryName}) pour ${childName}`
  } else if (childName) {
    body = `"${taskTitle}" pour ${childName}`
  } else if (categoryName) {
    body = `"${taskTitle}" (${categoryName})`
  } else {
    body = `"${taskTitle}"`
  }

  return {
    notification: {
      title: `${firstName} a terminé une tâche`,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "task_completed",
      taskId,
      link: `/tasks/${taskId}`,
      completedBy: completedByName,
    },
  }
}

// =============================================================================
// TASK ASSIGNED
// =============================================================================

export interface TaskAssignedParams {
  assignedByName: string
  taskTitle: string
  taskId: string
  deadline?: string | null
  childName?: string | null
  priority: string
}

export function generateTaskAssignedPush(params: TaskAssignedParams): PushTemplate {
  const { assignedByName, taskTitle, taskId, deadline, childName, priority } = params
  const firstName = assignedByName.split(" ")[0] ?? assignedByName

  let body: string
  if (deadline) {
    const deadlineDate = new Date(deadline).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })
    body = childName
      ? `"${taskTitle}" pour ${childName} - Échéance: ${deadlineDate}`
      : `"${taskTitle}" - Échéance: ${deadlineDate}`
  } else {
    body = childName
      ? `"${taskTitle}" pour ${childName}`
      : `"${taskTitle}"`
  }

  return {
    notification: {
      title: `${firstName} vous a assigné une tâche`,
      body,
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "task_assigned",
      taskId,
      link: `/tasks/${taskId}`,
      assignedBy: assignedByName,
      priority,
    },
  }
}

// =============================================================================
// WELCOME
// =============================================================================

export interface WelcomeParams {
  userName: string
  householdName?: string
}

export function generateWelcomePush(params: WelcomeParams): PushTemplate {
  const { userName, householdName } = params
  const firstName = userName.split(" ")[0] ?? "Bienvenue"

  return {
    notification: {
      title: `Bienvenue ${firstName}!`,
      body: householdName
        ? `Votre foyer "${householdName}" est prêt. Commencez à organiser vos tâches!`
        : "Commencez à organiser vos tâches familiales dès maintenant!",
      icon: "/icons/icon-192x192.png",
    },
    data: {
      type: "welcome",
      link: "/onboarding",
    },
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export type PushTemplateParams =
  | { type: "daily_reminder"; params: DailyReminderParams }
  | { type: "deadline_approaching"; params: DeadlineApproachingParams }
  | { type: "streak_at_risk"; params: StreakAtRiskParams }
  | { type: "balance_alert"; params: BalanceAlertParams }
  | { type: "weekly_summary"; params: WeeklySummaryParams }
  | { type: "task_completed"; params: TaskCompletedParams }
  | { type: "task_assigned"; params: TaskAssignedParams }
  | { type: "welcome"; params: WelcomeParams }

export function generatePushTemplate(input: PushTemplateParams): PushTemplate {
  switch (input.type) {
    case "daily_reminder":
      return generateDailyReminderPush(input.params)
    case "deadline_approaching":
      return generateDeadlineApproachingPush(input.params)
    case "streak_at_risk":
      return generateStreakAtRiskPush(input.params)
    case "balance_alert":
      return generateBalanceAlertPush(input.params)
    case "weekly_summary":
      return generateWeeklySummaryPush(input.params)
    case "task_completed":
      return generateTaskCompletedPush(input.params)
    case "task_assigned":
      return generateTaskAssignedPush(input.params)
    case "welcome":
      return generateWelcomePush(input.params)
  }
}
