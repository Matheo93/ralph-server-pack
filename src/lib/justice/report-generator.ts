/**
 * Report Generator
 *
 * Family justice report generation:
 * - Weekly family reports
 * - Monthly summaries
 * - Data formatting for PDF/email
 * - Historical trend analysis
 */

import { z } from "zod"
import {
  type FairnessScore,
  type MemberLoad,
  type FairnessTrend,
  type CategoryFairness,
  calculateFairnessScore,
  CATEGORY_NAMES,
} from "./fairness-calculator"
import {
  type WeeklySummary,
  generateWeeklySummary,
  generateNotificationMessage,
  generateEmailSubject,
} from "./messaging-engine"

// =============================================================================
// SCHEMAS
// =============================================================================

export const ReportPeriodSchema = z.enum(["week", "month", "quarter", "year"])

export const ReportFormatSchema = z.enum(["json", "html", "markdown"])

export const WeeklyReportSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  householdName: z.string(),
  period: z.object({
    type: z.literal("week"),
    weekNumber: z.number(),
    year: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  fairness: z.object({
    score: z.number(),
    status: z.string(),
    trend: z.enum(["improving", "stable", "declining"]),
    giniCoefficient: z.number(),
  }),
  members: z.array(
    z.object({
      userId: z.string(),
      userName: z.string(),
      tasksCompleted: z.number(),
      totalWeight: z.number(),
      percentage: z.number(),
      adjustedPercentage: z.number(),
      exclusionDays: z.number(),
      categoryBreakdown: z.record(z.string(), z.number()),
    })
  ),
  categories: z.array(
    z.object({
      category: z.string(),
      categoryName: z.string(),
      fairnessScore: z.number(),
      dominantUser: z.string().nullable(),
      taskCount: z.number(),
    })
  ),
  highlights: z.array(z.string()),
  suggestions: z.array(z.string()),
  summary: WeeklySummarySchema,
  generatedAt: z.string(),
})

export const MonthlyReportSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  householdName: z.string(),
  period: z.object({
    type: z.literal("month"),
    month: z.number(),
    year: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  weeklyScores: z.array(
    z.object({
      weekNumber: z.number(),
      score: z.number(),
      status: z.string(),
    })
  ),
  averageScore: z.number(),
  bestWeek: z.number(),
  worstWeek: z.number(),
  trend: z.enum(["improving", "stable", "declining"]),
  memberSummaries: z.array(
    z.object({
      userId: z.string(),
      userName: z.string(),
      totalTasks: z.number(),
      averagePercentage: z.number(),
      contribution: z.string(),
    })
  ),
  categoryTrends: z.array(
    z.object({
      category: z.string(),
      categoryName: z.string(),
      averageFairness: z.number(),
      trend: z.enum(["improving", "stable", "declining"]),
    })
  ),
  achievements: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  generatedAt: z.string(),
})

export const ReportDeliverySchema = z.object({
  reportId: z.string(),
  householdId: z.string(),
  deliveryMethod: z.enum(["email", "push", "in-app"]),
  recipients: z.array(
    z.object({
      userId: z.string(),
      email: z.string().optional(),
      pushToken: z.string().optional(),
    })
  ),
  status: z.enum(["pending", "sent", "failed"]),
  sentAt: z.string().nullable(),
  error: z.string().nullable(),
})

// Import WeeklySummarySchema for the report
import { WeeklySummarySchema } from "./messaging-engine"

// =============================================================================
// TYPES
// =============================================================================

export type ReportPeriod = z.infer<typeof ReportPeriodSchema>
export type ReportFormat = z.infer<typeof ReportFormatSchema>
export type WeeklyReport = z.infer<typeof WeeklyReportSchema>
export type MonthlyReport = z.infer<typeof MonthlyReportSchema>
export type ReportDelivery = z.infer<typeof ReportDeliverySchema>

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Get week start and end dates
 */
function getWeekDates(weekNumber: number, year: number): { start: Date; end: Date } {
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const dayOfWeek = jan1.getUTCDay() || 7

  // First week of year
  const firstWeekStart = new Date(jan1)
  firstWeekStart.setUTCDate(jan1.getUTCDate() - dayOfWeek + 1)

  // Target week
  const start = new Date(firstWeekStart)
  start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7)

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)

  return { start, end }
}

/**
 * Get month start and end dates
 */
function getMonthDates(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0)) // Last day of month
  return { start, end }
}

/**
 * Format date as ISO string (date only)
 */
function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]!
}

/**
 * Generate unique report ID
 */
function generateReportId(
  householdId: string,
  periodType: string,
  periodValue: number,
  year: number
): string {
  return `report-${householdId}-${periodType}-${year}-${periodValue}`
}

/**
 * Calculate trend from scores
 */
function calculateTrendFromScores(
  scores: number[]
): "improving" | "stable" | "declining" {
  if (scores.length < 2) return "stable"

  const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
  const secondHalf = scores.slice(Math.floor(scores.length / 2))

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const diff = secondAvg - firstAvg

  if (diff > 5) return "improving"
  if (diff < -5) return "declining"
  return "stable"
}

/**
 * Describe member contribution
 */
function describeContribution(percentage: number): string {
  if (percentage >= 35) return "Contributeur majeur"
  if (percentage >= 25) return "Participation équilibrée"
  if (percentage >= 15) return "Participation modérée"
  return "Participation légère"
}

// =============================================================================
// WEEKLY REPORT GENERATION
// =============================================================================

/**
 * Generate weekly family report
 */
export function generateWeeklyReport(
  householdId: string,
  householdName: string,
  fairnessScore: FairnessScore,
  trend: FairnessTrend,
  categoryAnalyses: CategoryFairness[],
  weekNumber?: number,
  year?: number
): WeeklyReport {
  const now = new Date()
  const reportWeek = weekNumber ?? getWeekNumber(now)
  const reportYear = year ?? now.getFullYear()
  const { start, end } = getWeekDates(reportWeek, reportYear)

  // Generate summary
  const summary = generateWeeklySummary(
    householdId,
    fairnessScore,
    trend,
    categoryAnalyses
  )

  // Build highlights
  const highlights: string[] = []

  if (fairnessScore.status === "excellent") {
    highlights.push("🌟 Score d'équité exceptionnel cette semaine !")
  }

  if (trend.trend === "improving") {
    highlights.push("📈 La tendance s'améliore par rapport aux semaines précédentes.")
  }

  const allParticipated = fairnessScore.memberLoads.every((m) => m.tasksCompleted > 0)
  if (allParticipated) {
    highlights.push("👨‍👩‍👧‍👦 Tous les membres ont participé !")
  }

  // Top contributor
  const topContributor = [...fairnessScore.memberLoads].sort(
    (a, b) => b.tasksCompleted - a.tasksCompleted
  )[0]
  if (topContributor && topContributor.tasksCompleted >= 5) {
    highlights.push(
      `💪 ${topContributor.userName} a complété ${topContributor.tasksCompleted} tâches.`
    )
  }

  // Build suggestions
  const suggestions: string[] = []

  if (fairnessScore.imbalanceDetails.gap > 40) {
    suggestions.push(
      "L'écart de charge est important. Envisagez une discussion familiale."
    )
  }

  const weakCategory = categoryAnalyses.find((c) => c.fairnessScore < 40)
  if (weakCategory) {
    suggestions.push(
      `Les tâches "${CATEGORY_NAMES[weakCategory.category] ?? weakCategory.category}" sont très concentrées. Pensez à les répartir.`
    )
  }

  const overloadedMember = fairnessScore.memberLoads.find(
    (m) => m.adjustedPercentage > 50
  )
  if (overloadedMember) {
    suggestions.push(
      `${overloadedMember.userName} porte une charge importante. Un coup de main serait bienvenu.`
    )
  }

  // Build member details with category breakdown
  const members = fairnessScore.memberLoads.map((load) => {
    const categoryBreakdown: Record<string, number> = {}

    for (const cat of categoryAnalyses) {
      const memberContrib = cat.memberContributions.find(
        (c) => c.userId === load.userId
      )
      if (memberContrib) {
        categoryBreakdown[cat.category] = memberContrib.taskCount
      }
    }

    return {
      userId: load.userId,
      userName: load.userName,
      tasksCompleted: load.tasksCompleted,
      totalWeight: load.totalWeight,
      percentage: load.percentage,
      adjustedPercentage: load.adjustedPercentage,
      exclusionDays: load.exclusionDays,
      categoryBreakdown,
    }
  })

  // Build category details
  const categories = categoryAnalyses.map((cat) => {
    const dominant = cat.memberContributions.reduce(
      (max, c) => (c.percentage > (max?.percentage ?? 0) ? c : max),
      null as (typeof cat.memberContributions)[0] | null
    )

    return {
      category: cat.category,
      categoryName: CATEGORY_NAMES[cat.category] ?? cat.category,
      fairnessScore: cat.fairnessScore,
      dominantUser:
        dominant && dominant.percentage > 50 ? dominant.userName : null,
      taskCount: cat.totalTasks,
    }
  })

  return {
    id: generateReportId(householdId, "week", reportWeek, reportYear),
    householdId,
    householdName,
    period: {
      type: "week",
      weekNumber: reportWeek,
      year: reportYear,
      startDate: formatDateISO(start),
      endDate: formatDateISO(end),
    },
    fairness: {
      score: fairnessScore.overallScore,
      status: fairnessScore.status,
      trend: trend.trend,
      giniCoefficient: fairnessScore.giniCoefficient,
    },
    members,
    categories,
    highlights: highlights.slice(0, 4),
    suggestions: suggestions.slice(0, 3),
    summary,
    generatedAt: now.toISOString(),
  }
}

// =============================================================================
// MONTHLY REPORT GENERATION
// =============================================================================

export interface WeeklyScoreData {
  weekNumber: number
  score: number
  status: string
  memberLoads: MemberLoad[]
  categoryFairness: CategoryFairness[]
}

/**
 * Generate monthly family report
 */
export function generateMonthlyReport(
  householdId: string,
  householdName: string,
  weeklyScores: WeeklyScoreData[],
  month?: number,
  year?: number
): MonthlyReport {
  const now = new Date()
  const reportMonth = month ?? now.getMonth() + 1
  const reportYear = year ?? now.getFullYear()
  const { start, end } = getMonthDates(reportMonth, reportYear)

  // Calculate averages and trends
  const scores = weeklyScores.map((w) => w.score)
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  const bestWeek = weeklyScores.reduce(
    (best, w) => (w.score > (best?.score ?? 0) ? w : best),
    null as WeeklyScoreData | null
  )?.weekNumber ?? 0

  const worstWeek = weeklyScores.reduce(
    (worst, w) => (w.score < (worst?.score ?? 100) ? w : worst),
    null as WeeklyScoreData | null
  )?.weekNumber ?? 0

  const trend = calculateTrendFromScores(scores)

  // Aggregate member summaries
  const memberTotals = new Map<
    string,
    {
      userId: string
      userName: string
      totalTasks: number
      percentages: number[]
    }
  >()

  for (const week of weeklyScores) {
    for (const load of week.memberLoads) {
      const existing = memberTotals.get(load.userId)
      if (existing) {
        existing.totalTasks += load.tasksCompleted
        existing.percentages.push(load.adjustedPercentage)
      } else {
        memberTotals.set(load.userId, {
          userId: load.userId,
          userName: load.userName,
          totalTasks: load.tasksCompleted,
          percentages: [load.adjustedPercentage],
        })
      }
    }
  }

  const memberSummaries = Array.from(memberTotals.values()).map((m) => ({
    userId: m.userId,
    userName: m.userName,
    totalTasks: m.totalTasks,
    averagePercentage: Math.round(
      m.percentages.reduce((a, b) => a + b, 0) / m.percentages.length
    ),
    contribution: describeContribution(
      m.percentages.reduce((a, b) => a + b, 0) / m.percentages.length
    ),
  }))

  // Aggregate category trends
  const categoryTotals = new Map<
    string,
    {
      category: string
      fairnessScores: number[]
    }
  >()

  for (const week of weeklyScores) {
    for (const cat of week.categoryFairness) {
      const existing = categoryTotals.get(cat.category)
      if (existing) {
        existing.fairnessScores.push(cat.fairnessScore)
      } else {
        categoryTotals.set(cat.category, {
          category: cat.category,
          fairnessScores: [cat.fairnessScore],
        })
      }
    }
  }

  const categoryTrends = Array.from(categoryTotals.values()).map((c) => ({
    category: c.category,
    categoryName: CATEGORY_NAMES[c.category] ?? c.category,
    averageFairness: Math.round(
      c.fairnessScores.reduce((a, b) => a + b, 0) / c.fairnessScores.length
    ),
    trend: calculateTrendFromScores(c.fairnessScores),
  }))

  // Generate achievements
  const achievements: string[] = []

  if (averageScore >= 80) {
    achievements.push("🏆 Score moyen excellent ce mois-ci !")
  }

  if (trend === "improving") {
    achievements.push("📈 Tendance à l'amélioration tout au long du mois.")
  }

  const consistentMembers = memberSummaries.filter(
    (m) => m.averagePercentage >= 20 && m.averagePercentage <= 40
  )
  if (consistentMembers.length >= 2) {
    achievements.push("⚖️ Bonne répartition équilibrée entre les membres.")
  }

  if (scores.every((s) => s >= 60)) {
    achievements.push("✅ Toutes les semaines au-dessus de 60 points !")
  }

  // Areas for improvement
  const areasForImprovement: string[] = []

  if (averageScore < 60) {
    areasForImprovement.push(
      "Le score moyen est en dessous de 60. Une discussion familiale serait bénéfique."
    )
  }

  const decliningCategories = categoryTrends.filter((c) => c.trend === "declining")
  if (decliningCategories.length > 0) {
    areasForImprovement.push(
      `Catégories en déclin : ${decliningCategories.map((c) => c.categoryName).join(", ")}.`
    )
  }

  const overloadedMembers = memberSummaries.filter((m) => m.averagePercentage > 45)
  if (overloadedMembers.length > 0) {
    areasForImprovement.push(
      `${overloadedMembers.map((m) => m.userName).join(", ")} ${
        overloadedMembers.length > 1 ? "portent" : "porte"
      } une charge importante.`
    )
  }

  return {
    id: generateReportId(householdId, "month", reportMonth, reportYear),
    householdId,
    householdName,
    period: {
      type: "month",
      month: reportMonth,
      year: reportYear,
      startDate: formatDateISO(start),
      endDate: formatDateISO(end),
    },
    weeklyScores: weeklyScores.map((w) => ({
      weekNumber: w.weekNumber,
      score: w.score,
      status: w.status,
    })),
    averageScore,
    bestWeek,
    worstWeek,
    trend,
    memberSummaries,
    categoryTrends,
    achievements: achievements.slice(0, 4),
    areasForImprovement: areasForImprovement.slice(0, 3),
    generatedAt: now.toISOString(),
  }
}

// =============================================================================
// REPORT FORMATTING
// =============================================================================

/**
 * Format weekly report as HTML for email
 */
export function formatWeeklyReportHTML(report: WeeklyReport): string {
  const statusColors: Record<string, string> = {
    excellent: "#22c55e",
    good: "#84cc16",
    fair: "#eab308",
    poor: "#f97316",
    critical: "#ef4444",
  }

  const statusColor = statusColors[report.fairness.status] ?? "#6b7280"

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Hebdomadaire - ${report.householdName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; }
    .score { font-size: 48px; font-weight: bold; color: ${statusColor}; }
    .status { font-size: 18px; color: #6b7280; margin-top: 8px; }
    .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px; }
    .member { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .member:last-child { border-bottom: none; }
    .highlight { background: #fef3c7; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }
    .suggestion { background: #dbeafe; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card header">
    <h1>${report.summary.headline}</h1>
    <p>${report.summary.subheadline}</p>
    <div class="score">${report.fairness.score}</div>
    <div class="status">Score d'équité sur 100</div>
  </div>

  <div class="card">
    <div class="section-title">👥 Participation des membres</div>
    ${report.members
      .map(
        (m) => `
      <div class="member">
        <span>${m.userName}</span>
        <span>${m.tasksCompleted} tâches (${m.adjustedPercentage.toFixed(0)}%)</span>
      </div>
    `
      )
      .join("")}
  </div>

  ${
    report.highlights.length > 0
      ? `
  <div class="card">
    <div class="section-title">✨ Points positifs</div>
    ${report.highlights.map((h) => `<div class="highlight">${h}</div>`).join("")}
  </div>
  `
      : ""
  }

  ${
    report.suggestions.length > 0
      ? `
  <div class="card">
    <div class="section-title">💡 Suggestions</div>
    ${report.suggestions.map((s) => `<div class="suggestion">${s}</div>`).join("")}
  </div>
  `
      : ""
  }

  <div class="card">
    <div class="section-title">📊 Par catégorie</div>
    ${report.categories
      .map(
        (c) => `
      <div class="member">
        <span>${c.categoryName}</span>
        <span>${c.fairnessScore}/100</span>
      </div>
    `
      )
      .join("")}
  </div>

  <div class="card header">
    <p>${report.summary.closingMessage}</p>
  </div>

  <div class="footer">
    <p>Rapport généré le ${new Date(report.generatedAt).toLocaleDateString("fr-FR")}</p>
    <p>FamilyLoad - Équité familiale</p>
  </div>
</body>
</html>
`.trim()
}

/**
 * Format weekly report as Markdown
 */
export function formatWeeklyReportMarkdown(report: WeeklyReport): string {
  let md = `# ${report.summary.headline}\n\n`
  md += `*${report.summary.subheadline}*\n\n`
  md += `## Score d'équité: ${report.fairness.score}/100\n\n`
  md += `- Tendance: ${report.fairness.trend === "improving" ? "📈 En amélioration" : report.fairness.trend === "declining" ? "📉 En déclin" : "➡️ Stable"}\n`
  md += `- Coefficient de Gini: ${report.fairness.giniCoefficient.toFixed(2)}\n\n`

  md += `## 👥 Participation\n\n`
  md += `| Membre | Tâches | Charge |\n`
  md += `|--------|--------|--------|\n`
  for (const m of report.members) {
    md += `| ${m.userName} | ${m.tasksCompleted} | ${m.adjustedPercentage.toFixed(0)}% |\n`
  }
  md += `\n`

  if (report.highlights.length > 0) {
    md += `## ✨ Points positifs\n\n`
    for (const h of report.highlights) {
      md += `- ${h}\n`
    }
    md += `\n`
  }

  if (report.suggestions.length > 0) {
    md += `## 💡 Suggestions\n\n`
    for (const s of report.suggestions) {
      md += `- ${s}\n`
    }
    md += `\n`
  }

  md += `## 📊 Par catégorie\n\n`
  md += `| Catégorie | Score |\n`
  md += `|-----------|-------|\n`
  for (const c of report.categories) {
    md += `| ${c.categoryName} | ${c.fairnessScore}/100 |\n`
  }
  md += `\n`

  md += `---\n\n`
  md += `*${report.summary.closingMessage}*\n`

  return md
}

// =============================================================================
// REPORT DELIVERY
// =============================================================================

/**
 * Create report delivery record
 */
export function createReportDelivery(
  reportId: string,
  householdId: string,
  method: "email" | "push" | "in-app",
  recipients: Array<{ userId: string; email?: string; pushToken?: string }>
): ReportDelivery {
  return {
    reportId,
    householdId,
    deliveryMethod: method,
    recipients,
    status: "pending",
    sentAt: null,
    error: null,
  }
}

/**
 * Mark delivery as sent
 */
export function markDeliverySent(delivery: ReportDelivery): ReportDelivery {
  return {
    ...delivery,
    status: "sent",
    sentAt: new Date().toISOString(),
  }
}

/**
 * Mark delivery as failed
 */
export function markDeliveryFailed(
  delivery: ReportDelivery,
  error: string
): ReportDelivery {
  return {
    ...delivery,
    status: "failed",
    error,
  }
}

/**
 * Generate email content for weekly report
 */
export function generateWeeklyReportEmail(
  report: WeeklyReport
): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: generateEmailSubject(
      report.householdName,
      report.period.weekNumber,
      report.fairness.score
    ),
    html: formatWeeklyReportHTML(report),
    text: formatWeeklyReportMarkdown(report),
  }
}

/**
 * Generate push notification for weekly report
 */
export function generateWeeklyReportPush(
  report: WeeklyReport
): { title: string; body: string } {
  const notification = generateNotificationMessage({
    overallScore: report.fairness.score,
    status: report.fairness.status as "excellent" | "good" | "fair" | "poor" | "critical",
    giniCoefficient: report.fairness.giniCoefficient,
    memberLoads: report.members,
    categoryFairness: {},
    imbalanceDetails: {
      hasImbalance: false,
      gap: 0,
      overloadedMembers: [],
      underloadedMembers: [],
    },
  })

  return notification
}
