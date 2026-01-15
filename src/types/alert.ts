// Alert types for load imbalance and notifications

export type AlertType =
  | "imbalance"     // Load distribution is uneven (> 60/40)
  | "overload"      // A parent is overloaded this week
  | "inactivity"    // A parent hasn't completed tasks recently

export type AlertSeverity = "info" | "warning" | "critical"

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  householdId: string
  memberId?: string   // Optional - specific member alert
  title: string
  message: string
  suggestion: string  // Non-judgmental suggestion
  data?: AlertData
  createdAt: Date
  dismissedAt?: Date
  dismissedBy?: string
  expiresAt?: Date    // Auto-expire for temporary conditions
}

// Type-specific alert data
export type AlertData =
  | ImbalanceAlertData
  | OverloadAlertData
  | InactivityAlertData

export interface ImbalanceAlertData {
  type: "imbalance"
  ratio: string           // e.g., "70/30"
  percentages: {
    userId: string
    userName: string
    percentage: number
  }[]
  threshold: number       // Current threshold (60)
}

export interface OverloadAlertData {
  type: "overload"
  userId: string
  userName: string
  weeklyLoad: number
  tasksCount: number
  averageLoad: number     // Household average
}

export interface InactivityAlertData {
  type: "inactivity"
  userId: string
  userName: string
  lastActivityDate: Date | null
  daysSinceActivity: number
}

// Alert creation input
export interface AlertInput {
  type: AlertType
  severity: AlertSeverity
  householdId: string
  memberId?: string
  data?: AlertData
}

// Alert list with filters
export interface AlertFilters {
  householdId: string
  types?: AlertType[]
  severities?: AlertSeverity[]
  includeDismissed?: boolean
  memberId?: string
}

// Alert summary for dashboard
export interface AlertSummary {
  total: number
  byType: Record<AlertType, number>
  bySeverity: Record<AlertSeverity, number>
  mostCritical?: Alert
}

// Non-judgmental message templates (French)
export const ALERT_MESSAGES: Record<AlertType, {
  title: string
  getMessage: (data: AlertData) => string
  getSuggestion: (data: AlertData) => string
}> = {
  imbalance: {
    title: "Répartition déséquilibrée",
    getMessage: (data) => {
      const d = data as ImbalanceAlertData
      return `La répartition actuelle est de ${d.ratio}. Un rééquilibrage pourrait être bénéfique pour le foyer.`
    },
    getSuggestion: (data) => {
      const d = data as ImbalanceAlertData
      const leastLoaded = d.percentages[d.percentages.length - 1]
      return `${leastLoaded?.userName ?? "Un parent"} pourrait prendre en charge quelques tâches supplémentaires si son emploi du temps le permet.`
    },
  },
  overload: {
    title: "Charge importante cette semaine",
    getMessage: (data) => {
      const d = data as OverloadAlertData
      return `${d.userName} a une charge de ${d.weeklyLoad} points cette semaine (${d.tasksCount} tâches), au-dessus de la moyenne du foyer (${d.averageLoad} points).`
    },
    getSuggestion: () => {
      return "Peut-être qu'une partie de ces tâches pourrait être redistribuée ou reportée si nécessaire."
    },
  },
  inactivity: {
    title: "Pas d'activité récente",
    getMessage: (data) => {
      const d = data as InactivityAlertData
      if (d.daysSinceActivity === 0) {
        return `${d.userName} n'a pas encore complété de tâche.`
      }
      return `${d.userName} n'a pas complété de tâche depuis ${d.daysSinceActivity} jours.`
    },
    getSuggestion: () => {
      return "Vérifiez si tout va bien ou si certaines tâches pourraient être attribuées."
    },
  },
}

// Severity colors for UI
export const SEVERITY_COLORS: Record<AlertSeverity, {
  bg: string
  text: string
  border: string
  icon: string
}> = {
  info: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: "text-blue-500",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: "text-amber-500",
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: "text-red-500",
  },
}
