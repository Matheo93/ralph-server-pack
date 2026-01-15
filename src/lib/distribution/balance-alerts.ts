/**
 * Balance Alerts
 *
 * Imbalance detection and alerting system:
 * - Imbalance detection (>60/40 split)
 * - Weekly overload alerts
 * - Inactivity detection
 * - Trend analysis
 * - Non-culpabilizing messaging
 */

import { z } from "zod"
import {
  type UserLoadSummary,
  type LoadAlert,
  type LoadRecommendation,
  calculateLoadTrend,
  type HistoricalLoadEntry,
} from "./load-calculator-v2"

// =============================================================================
// SCHEMAS
// =============================================================================

export const AlertConfigSchema = z.object({
  imbalanceThreshold: z.number().min(0).max(100).default(60), // Alert if >60%
  overloadThreshold: z.number().min(0).max(100).default(80), // Alert if >80% capacity
  inactivityDays: z.number().min(1).default(7), // Alert if no tasks for X days
  trendWindowDays: z.number().min(1).default(14), // Window for trend analysis
  enableWeeklyDigest: z.boolean().default(true),
  enableRealTimeAlerts: z.boolean().default(true),
  suppressPositiveAlerts: z.boolean().default(false),
})

export const BalanceStatusSchema = z.object({
  householdId: z.string(),
  status: z.enum(["balanced", "warning", "critical"]),
  balanceScore: z.number().min(0).max(100),
  imbalancePercentage: z.number(),
  mostLoaded: z
    .object({
      userId: z.string(),
      userName: z.string(),
      percentage: z.number(),
    })
    .optional(),
  leastLoaded: z
    .object({
      userId: z.string(),
      userName: z.string(),
      percentage: z.number(),
    })
    .optional(),
  alerts: z.array(
    z.object({
      type: z.enum(["imbalance", "overload", "underload", "fatigue", "trend", "inactivity"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      userId: z.string().optional(),
      userName: z.string().optional(),
      message: z.string(),
      metric: z.number(),
    })
  ),
  recommendations: z.array(
    z.object({
      type: z.enum(["reassign", "delay", "share", "rest", "balance"]),
      priority: z.number(),
      description: z.string(),
      affectedTasks: z.array(z.string()).optional(),
      fromUser: z.string().optional(),
      toUser: z.string().optional(),
      expectedImprovement: z.number(),
    })
  ),
  messages: z.array(z.string()),
  generatedAt: z.date(),
})

export const WeeklyDigestSchema = z.object({
  householdId: z.string(),
  weekNumber: z.number(),
  year: z.number(),
  periodStart: z.date(),
  periodEnd: z.date(),
  summary: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    completionRate: z.number(),
    balanceScore: z.number(),
    trend: z.enum(["improving", "stable", "declining"]),
  }),
  memberStats: z.array(
    z.object({
      userId: z.string(),
      userName: z.string(),
      tasksAssigned: z.number(),
      tasksCompleted: z.number(),
      loadPercentage: z.number(),
      trend: z.enum(["decreasing", "stable", "increasing"]),
      highlights: z.array(z.string()),
    })
  ),
  alerts: z.array(z.string()),
  positiveNotes: z.array(z.string()),
  suggestions: z.array(z.string()),
  generatedAt: z.date(),
})

export const TrendAnalysisSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date(),
    days: z.number(),
  }),
  direction: z.enum(["decreasing", "stable", "increasing"]),
  magnitude: z.number(), // Percentage change
  weeklyAverage: z.number(),
  previousWeeklyAverage: z.number(),
  projectedLoad: z.number(), // If trend continues
  riskLevel: z.enum(["low", "moderate", "high", "critical"]),
  narrative: z.string(),
})

// =============================================================================
// TYPES
// =============================================================================

export type AlertConfig = z.infer<typeof AlertConfigSchema>
export type BalanceStatus = z.infer<typeof BalanceStatusSchema>
export type WeeklyDigest = z.infer<typeof WeeklyDigestSchema>
export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>

// =============================================================================
// NON-CULPABILIZING MESSAGE TEMPLATES
// =============================================================================

const POSITIVE_MESSAGES = {
  balanced: [
    "La charge mentale est bien répartie cette semaine !",
    "Bravo pour cet équilibre familial !",
    "Votre foyer fonctionne en harmonie.",
    "La répartition des tâches est exemplaire.",
  ],
  improving: [
    "La répartition s'améliore, continuez ainsi !",
    "Belle progression vers plus d'équilibre.",
    "Les ajustements portent leurs fruits.",
  ],
  stable: [
    "La situation reste stable.",
    "Pas de changement majeur à signaler.",
  ],
} as const

const ALERT_MESSAGES = {
  imbalance: {
    low: [
      "Un léger ajustement pourrait améliorer l'équilibre.",
      "Pensez à répartir quelques tâches différemment.",
    ],
    medium: [
      "La répartition mérite attention pour éviter la fatigue.",
      "Quelques ajustements pourraient aider à mieux partager.",
    ],
    high: [
      "La charge semble concentrée - un rééquilibrage serait bénéfique.",
      "Il serait bon de redistribuer certaines responsabilités.",
    ],
    critical: [
      "Attention : la charge est très déséquilibrée.",
      "Un rééquilibrage urgent est recommandé pour le bien-être de tous.",
    ],
  },
  overload: {
    low: [
      "{userName} a une charge élevée mais gérable.",
    ],
    medium: [
      "{userName} commence à être surchargé(e).",
      "Pensez à alléger la charge de {userName}.",
    ],
    high: [
      "{userName} porte une charge importante - du soutien serait bienvenu.",
    ],
    critical: [
      "{userName} est en surcharge - une pause ou du soutien est nécessaire.",
    ],
  },
  fatigue: {
    low: [
      "{userName} montre de légers signes de fatigue.",
    ],
    medium: [
      "{userName} semble fatigué(e) - un moment de repos ferait du bien.",
    ],
    high: [
      "{userName} accumule la fatigue - pensez à prendre soin de vous.",
    ],
    critical: [
      "{userName} a besoin de repos - votre bien-être est prioritaire.",
    ],
  },
  inactivity: {
    low: [
      "{userName} a été moins actif(ve) dernièrement.",
    ],
    medium: [
      "{userName} pourrait contribuer davantage si disponible.",
    ],
    high: [
      "{userName} n'a pas participé depuis un moment.",
    ],
    critical: [
      "{userName} semble absent(e) - tout va bien ?",
    ],
  },
  trend: {
    low: [
      "La tendance est légèrement à surveiller.",
    ],
    medium: [
      "La tendance mérite attention.",
    ],
    high: [
      "La tendance est préoccupante.",
    ],
    critical: [
      "La tendance nécessite une action.",
    ],
    increasing: [
      "La charge de {userName} augmente - surveillons ensemble.",
    ],
    decreasing: [
      "{userName} allège sa charge - c'est bien de prendre soin de soi.",
    ],
  },
  underload: {
    low: [
      "{userName} a une charge légère.",
    ],
    medium: [
      "{userName} pourrait prendre plus de tâches si disponible.",
    ],
    high: [
      "{userName} a très peu de tâches assignées.",
    ],
    critical: [
      "{userName} n'a presque aucune tâche.",
    ],
  },
} as const

const RECOMMENDATION_MESSAGES = {
  reassign: [
    "Réassigner quelques tâches de {fromUser} vers {toUser} améliorerait l'équilibre.",
    "Certaines tâches pourraient être partagées avec {toUser}.",
  ],
  rest: [
    "Une période de repos pour {fromUser} serait bénéfique.",
    "Pensez à prévoir du temps de récupération pour {fromUser}.",
  ],
  balance: [
    "Revoir la répartition des tâches récurrentes ensemble pourrait aider.",
    "Une discussion familiale sur le partage des responsabilités serait utile.",
  ],
  share: [
    "Certaines tâches pourraient être faites en duo.",
    "Partager certaines responsabilités réduirait la charge individuelle.",
  ],
  delay: [
    "Reporter quelques tâches non urgentes permettrait de souffler.",
  ],
} as const

// =============================================================================
// MESSAGE GENERATION
// =============================================================================

/**
 * Get random message from template array
 */
function getRandomMessage(messages: readonly string[]): string {
  const index = Math.floor(Math.random() * messages.length)
  return messages[index] ?? messages[0] ?? ""
}

/**
 * Replace placeholders in message
 */
function formatMessage(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value)
  }
  return result
}

/**
 * Generate alert message
 */
export function generateAlertMessage(
  type: keyof typeof ALERT_MESSAGES,
  severity: "low" | "medium" | "high" | "critical",
  userName?: string,
  additionalContext?: Record<string, string>
): string {
  const typeMessages = ALERT_MESSAGES[type]
  const severityMessages = typeMessages[severity as keyof typeof typeMessages]

  if (!severityMessages) {
    return `Alerte ${type}: ${severity}`
  }

  const template = getRandomMessage(severityMessages as readonly string[])
  return formatMessage(template, { userName: userName ?? "", ...additionalContext })
}

/**
 * Generate positive message
 */
export function generatePositiveMessage(
  status: keyof typeof POSITIVE_MESSAGES
): string {
  const messages = POSITIVE_MESSAGES[status]
  return getRandomMessage(messages)
}

/**
 * Generate recommendation message
 */
export function generateRecommendationMessage(
  type: keyof typeof RECOMMENDATION_MESSAGES,
  fromUser?: string,
  toUser?: string
): string {
  const messages = RECOMMENDATION_MESSAGES[type]
  const template = getRandomMessage(messages)
  return formatMessage(template, {
    fromUser: fromUser ?? "un membre",
    toUser: toUser ?? "un autre membre",
  })
}

// =============================================================================
// BALANCE ANALYSIS
// =============================================================================

/**
 * Analyze balance status for household
 */
export function analyzeBalanceStatus(
  householdId: string,
  users: UserLoadSummary[],
  config: AlertConfig = AlertConfigSchema.parse({})
): BalanceStatus {
  const alerts: LoadAlert[] = []
  const recommendations: LoadRecommendation[] = []
  const messages: string[] = []

  if (users.length === 0) {
    return {
      householdId,
      status: "balanced",
      balanceScore: 100,
      imbalancePercentage: 0,
      alerts: [],
      recommendations: [],
      messages: ["Aucun membre actif dans le foyer."],
      generatedAt: new Date(),
    }
  }

  // Calculate balance metrics
  const sortedByLoad = [...users].sort(
    (a, b) => b.balancePercentage - a.balancePercentage
  )
  const mostLoaded = sortedByLoad[0]
  const leastLoaded = sortedByLoad[sortedByLoad.length - 1]

  const imbalancePercentage =
    mostLoaded && leastLoaded
      ? mostLoaded.balancePercentage - leastLoaded.balancePercentage
      : 0

  // Calculate balance score (100 = perfect, 0 = terrible)
  const idealPercentage = 100 / users.length
  const deviations = users.map((u) =>
    Math.abs(u.balancePercentage - idealPercentage)
  )
  const avgDeviation =
    deviations.reduce((a, b) => a + b, 0) / deviations.length
  const balanceScore = Math.max(0, Math.round(100 - avgDeviation * 2))

  // Determine overall status
  let status: "balanced" | "warning" | "critical"
  if (balanceScore >= 70) {
    status = "balanced"
    if (!config.suppressPositiveAlerts) {
      messages.push(generatePositiveMessage("balanced"))
    }
  } else if (balanceScore >= 40) {
    status = "warning"
  } else {
    status = "critical"
  }

  // Generate imbalance alerts
  if (users.length > 1) {
    if (mostLoaded && mostLoaded.balancePercentage > config.imbalanceThreshold) {
      const severity = getSeverity(mostLoaded.balancePercentage, [60, 70, 80])
      alerts.push({
        type: "imbalance",
        severity,
        userId: mostLoaded.userId,
        userName: mostLoaded.userName,
        message: generateAlertMessage("imbalance", severity, mostLoaded.userName),
        metric: mostLoaded.balancePercentage,
      })
    }
  }

  // Generate individual user alerts
  for (const user of users) {
    // Overload alerts
    const loadRatio = (user.currentLoad / 20) * 100 // Assuming 20 as max weekly load
    if (loadRatio >= config.overloadThreshold) {
      const severity = getSeverity(loadRatio, [80, 90, 100])
      alerts.push({
        type: "overload",
        severity,
        userId: user.userId,
        userName: user.userName,
        message: generateAlertMessage("overload", severity, user.userName),
        metric: loadRatio,
      })
    }

    // Fatigue alerts
    if (user.fatigueLevel >= 60) {
      const severity = getSeverity(user.fatigueLevel, [60, 70, 85])
      alerts.push({
        type: "fatigue",
        severity,
        userId: user.userId,
        userName: user.userName,
        message: generateAlertMessage("fatigue", severity, user.userName),
        metric: user.fatigueLevel,
      })
    }

    // Trend alerts
    if (user.loadTrend === "increasing" && user.fatigueLevel > 40) {
      alerts.push({
        type: "trend",
        severity: "medium",
        userId: user.userId,
        userName: user.userName,
        message: formatMessage(
          getRandomMessage(ALERT_MESSAGES.trend.increasing),
          { userName: user.userName }
        ),
        metric: user.fatigueLevel,
      })
    }

    // Underload/inactivity
    if (users.length > 1 && user.balancePercentage < 20 && user.completedTasks === 0) {
      alerts.push({
        type: "inactivity",
        severity: "low",
        userId: user.userId,
        userName: user.userName,
        message: generateAlertMessage("inactivity", "low", user.userName),
        metric: user.balancePercentage,
      })
    }
  }

  // Generate recommendations
  if (status !== "balanced" && mostLoaded && leastLoaded) {
    if (imbalancePercentage > 20) {
      recommendations.push({
        type: "reassign",
        priority: 8,
        description: generateRecommendationMessage(
          "reassign",
          mostLoaded.userName,
          leastLoaded.userName
        ),
        fromUser: mostLoaded.userId,
        toUser: leastLoaded.userId,
        expectedImprovement: Math.round(imbalancePercentage / 3),
      })
    }
  }

  // Fatigue-based recommendations
  const fatigued = users.filter((u) => u.fatigueLevel >= 60)
  for (const user of fatigued) {
    recommendations.push({
      type: "rest",
      priority: user.fatigueLevel >= 80 ? 10 : 7,
      description: generateRecommendationMessage("rest", user.userName),
      fromUser: user.userId,
      expectedImprovement: 20,
    })
  }

  // Sort alerts and recommendations
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
  alerts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
  recommendations.sort((a, b) => b.priority - a.priority)

  // Generate summary messages
  if (alerts.length > 0 && status !== "balanced") {
    const criticalCount = alerts.filter((a) => a.severity === "critical").length
    if (criticalCount > 0) {
      messages.push(`${criticalCount} point(s) nécessitant une attention immédiate.`)
    }
  }

  return {
    householdId,
    status,
    balanceScore,
    imbalancePercentage,
    mostLoaded: mostLoaded
      ? {
          userId: mostLoaded.userId,
          userName: mostLoaded.userName,
          percentage: mostLoaded.balancePercentage,
        }
      : undefined,
    leastLoaded: leastLoaded
      ? {
          userId: leastLoaded.userId,
          userName: leastLoaded.userName,
          percentage: leastLoaded.balancePercentage,
        }
      : undefined,
    alerts,
    recommendations,
    messages,
    generatedAt: new Date(),
  }
}

// =============================================================================
// WEEKLY DIGEST
// =============================================================================

/**
 * Generate weekly digest for household
 */
export function generateWeeklyDigest(
  householdId: string,
  users: UserLoadSummary[],
  historicalEntries: HistoricalLoadEntry[],
  weekStart: Date,
  weekEnd: Date
): WeeklyDigest {
  const now = new Date()
  const { year, week } = getISOWeek(weekStart)

  // Calculate week's statistics
  const weekEntries = historicalEntries.filter(
    (e) => e.date >= weekStart && e.date <= weekEnd
  )

  const totalTasks = weekEntries.length
  const completedTasks = weekEntries.filter((e) => e.wasCompleted).length
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate balance
  const userWeekLoads = users.map((u) => {
    const userEntries = weekEntries.filter((e) => e.userId === u.userId)
    return userEntries.reduce((sum, e) => sum + e.weight, 0)
  })

  const totalLoad = userWeekLoads.reduce((a, b) => a + b, 0)
  const idealPercentage = users.length > 0 ? 100 / users.length : 0

  const percentages = userWeekLoads.map((l) =>
    totalLoad > 0 ? (l / totalLoad) * 100 : 0
  )
  const deviations = percentages.map((p) => Math.abs(p - idealPercentage))
  const balanceScore = Math.max(
    0,
    Math.round(
      100 -
        (deviations.reduce((a, b) => a + b, 0) / Math.max(deviations.length, 1)) * 2
    )
  )

  // Determine overall trend
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const previousWeekEntries = historicalEntries.filter(
    (e) => e.date >= previousWeekStart && e.date < weekStart
  )
  const previousWeekBalance = calculateWeekBalance(previousWeekEntries, users)

  let trend: "improving" | "stable" | "declining"
  if (balanceScore > previousWeekBalance + 5) {
    trend = "improving"
  } else if (balanceScore < previousWeekBalance - 5) {
    trend = "declining"
  } else {
    trend = "stable"
  }

  // Member statistics
  const memberStats = users.map((u) => {
    const userEntries = weekEntries.filter((e) => e.userId === u.userId)
    const tasksAssigned = userEntries.length
    const tasksCompleted = userEntries.filter((e) => e.wasCompleted).length
    const loadPercentage =
      totalLoad > 0
        ? Math.round(
            (userEntries.reduce((sum, e) => sum + e.weight, 0) / totalLoad) * 100
          )
        : 0

    const userTrend = calculateLoadTrend(historicalEntries, u.userId)

    // Generate highlights
    const highlights: string[] = []
    if (tasksCompleted > 5) {
      highlights.push(`${tasksCompleted} tâches accomplies`)
    }
    if (loadPercentage > idealPercentage + 10) {
      highlights.push("Charge élevée cette semaine")
    } else if (loadPercentage < idealPercentage - 10 && tasksAssigned > 0) {
      highlights.push("Semaine plus légère")
    }

    return {
      userId: u.userId,
      userName: u.userName,
      tasksAssigned,
      tasksCompleted,
      loadPercentage,
      trend: userTrend,
      highlights,
    }
  })

  // Generate alerts
  const alerts: string[] = []
  if (balanceScore < 50) {
    alerts.push("La répartition était déséquilibrée cette semaine.")
  }
  if (completionRate < 70) {
    alerts.push(`Taux de complétion bas (${completionRate}%) - peut-être trop de tâches ?`)
  }

  const overloaded = memberStats.filter((m) => m.loadPercentage > 60)
  for (const m of overloaded) {
    alerts.push(`${m.userName} a porté une charge importante (${m.loadPercentage}%).`)
  }

  // Positive notes
  const positiveNotes: string[] = []
  if (balanceScore >= 70) {
    positiveNotes.push(generatePositiveMessage("balanced"))
  }
  if (trend === "improving") {
    positiveNotes.push(generatePositiveMessage("improving"))
  }
  if (completionRate >= 90) {
    positiveNotes.push("Excellent taux de complétion cette semaine !")
  }

  const topContributors = memberStats
    .filter((m) => m.tasksCompleted >= 3)
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
  if (topContributors.length > 0) {
    const top = topContributors[0]
    if (top) {
      positiveNotes.push(
        `Bravo à ${top.userName} pour ses ${top.tasksCompleted} tâches accomplies.`
      )
    }
  }

  // Suggestions
  const suggestions: string[] = []
  if (trend === "declining") {
    suggestions.push("Prenez le temps de discuter de la répartition en famille.")
  }
  if (balanceScore < 60) {
    suggestions.push(generateRecommendationMessage("balance"))
  }

  return {
    householdId,
    weekNumber: week,
    year,
    periodStart: weekStart,
    periodEnd: weekEnd,
    summary: {
      totalTasks,
      completedTasks,
      completionRate,
      balanceScore,
      trend,
    },
    memberStats,
    alerts,
    positiveNotes,
    suggestions,
    generatedAt: now,
  }
}

// =============================================================================
// TREND ANALYSIS
// =============================================================================

/**
 * Analyze load trend for a user
 */
export function analyzeTrend(
  userId: string,
  userName: string,
  historicalEntries: HistoricalLoadEntry[],
  windowDays: number = 14
): TrendAnalysis {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const previousWindowStart = new Date(
    windowStart.getTime() - windowDays * 24 * 60 * 60 * 1000
  )

  const userEntries = historicalEntries.filter((e) => e.userId === userId)

  // Current window
  const currentEntries = userEntries.filter((e) => e.date >= windowStart)
  const currentTotal = currentEntries.reduce((sum, e) => sum + e.weight, 0)
  const weeklyAverage = (currentTotal / windowDays) * 7

  // Previous window
  const previousEntries = userEntries.filter(
    (e) => e.date >= previousWindowStart && e.date < windowStart
  )
  const previousTotal = previousEntries.reduce((sum, e) => sum + e.weight, 0)
  const previousWeeklyAverage = (previousTotal / windowDays) * 7

  // Calculate direction and magnitude
  let direction: "decreasing" | "stable" | "increasing"
  let magnitude = 0

  if (previousWeeklyAverage > 0) {
    magnitude = Math.round(
      ((weeklyAverage - previousWeeklyAverage) / previousWeeklyAverage) * 100
    )
    if (magnitude > 15) direction = "increasing"
    else if (magnitude < -15) direction = "decreasing"
    else direction = "stable"
  } else {
    direction = weeklyAverage > 0 ? "increasing" : "stable"
  }

  // Project future load if trend continues
  const projectedLoad = Math.max(0, weeklyAverage * (1 + magnitude / 100))

  // Determine risk level
  let riskLevel: "low" | "moderate" | "high" | "critical"
  if (direction === "increasing" && weeklyAverage > 15) {
    riskLevel = projectedLoad > 25 ? "critical" : "high"
  } else if (direction === "increasing") {
    riskLevel = "moderate"
  } else {
    riskLevel = "low"
  }

  // Generate narrative
  let narrative: string
  if (direction === "increasing") {
    narrative = `La charge de ${userName} est en hausse (+${Math.abs(magnitude)}%). `
    if (riskLevel === "critical" || riskLevel === "high") {
      narrative += "Une attention particulière est recommandée."
    } else {
      narrative += "À surveiller dans les prochains jours."
    }
  } else if (direction === "decreasing") {
    narrative = `${userName} allège sa charge (-${Math.abs(magnitude)}%). `
    narrative += "C'est important de prendre soin de soi."
  } else {
    narrative = `La charge de ${userName} reste stable. `
    if (weeklyAverage > 15) {
      narrative += "Pensez à maintenir un rythme soutenable."
    }
  }

  return {
    userId,
    userName,
    period: {
      start: windowStart,
      end: now,
      days: windowDays,
    },
    direction,
    magnitude: Math.abs(magnitude),
    weeklyAverage: Math.round(weeklyAverage * 10) / 10,
    previousWeeklyAverage: Math.round(previousWeeklyAverage * 10) / 10,
    projectedLoad: Math.round(projectedLoad * 10) / 10,
    riskLevel,
    narrative,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get severity level from value and thresholds
 */
function getSeverity(
  value: number,
  thresholds: [number, number, number]
): "low" | "medium" | "high" | "critical" {
  if (value >= thresholds[2]) return "critical"
  if (value >= thresholds[1]) return "high"
  if (value >= thresholds[0]) return "medium"
  return "low"
}

/**
 * Calculate week balance score from entries
 */
function calculateWeekBalance(
  entries: HistoricalLoadEntry[],
  users: UserLoadSummary[]
): number {
  if (users.length <= 1) return 100

  const userLoads = new Map<string, number>()
  for (const user of users) {
    userLoads.set(user.userId, 0)
  }

  for (const entry of entries) {
    userLoads.set(
      entry.userId,
      (userLoads.get(entry.userId) ?? 0) + entry.weight
    )
  }

  const loads = Array.from(userLoads.values())
  const total = loads.reduce((a, b) => a + b, 0)

  if (total === 0) return 100

  const ideal = 100 / loads.length
  const percentages = loads.map((l) => (l / total) * 100)
  const deviations = percentages.map((p) => Math.abs(p - ideal))
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length

  return Math.max(0, Math.round(100 - avgDeviation * 2))
}

/**
 * Get ISO week number
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getFullYear(), week: weekNumber }
}

// =============================================================================
// NOTIFICATION HELPERS
// =============================================================================

export interface NotificationPayload {
  type: "alert" | "digest" | "recommendation"
  title: string
  body: string
  severity?: "low" | "medium" | "high" | "critical"
  actionUrl?: string
  data?: Record<string, unknown>
}

/**
 * Create notification from alert
 */
export function createAlertNotification(
  alert: LoadAlert,
  householdId: string
): NotificationPayload {
  return {
    type: "alert",
    title: getAlertTitle(alert.type),
    body: alert.message,
    severity: alert.severity,
    actionUrl: `/household/${householdId}/distribution`,
    data: {
      alertType: alert.type,
      userId: alert.userId,
      metric: alert.metric,
    },
  }
}

/**
 * Create notification from weekly digest
 */
export function createDigestNotification(
  digest: WeeklyDigest
): NotificationPayload {
  const statusEmoji = digest.summary.balanceScore >= 70 ? "" : ""

  return {
    type: "digest",
    title: `Bilan semaine ${digest.weekNumber}`,
    body: `${statusEmoji} Score d'équilibre: ${digest.summary.balanceScore}/100. ${digest.summary.completedTasks} tâches accomplies.`,
    actionUrl: `/household/${digest.householdId}/reports`,
    data: {
      weekNumber: digest.weekNumber,
      year: digest.year,
      balanceScore: digest.summary.balanceScore,
      completionRate: digest.summary.completionRate,
    },
  }
}

/**
 * Get alert title by type
 */
function getAlertTitle(type: LoadAlert["type"]): string {
  switch (type) {
    case "imbalance":
      return "Répartition déséquilibrée"
    case "overload":
      return "Surcharge détectée"
    case "underload":
      return "Contribution faible"
    case "fatigue":
      return "Fatigue détectée"
    case "trend":
      return "Évolution de la charge"
    case "inactivity":
      return "Période d'inactivité"
    default:
      return "Alerte famille"
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const DEFAULT_ALERT_CONFIG: AlertConfig = AlertConfigSchema.parse({})
