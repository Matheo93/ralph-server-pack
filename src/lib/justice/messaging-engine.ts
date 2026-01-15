/**
 * Messaging Engine
 *
 * Non-culpabilizing message generation:
 * - Non-culpabilizing message templates
 * - Positive reinforcement
 * - Balance improvement suggestions
 * - Weekly summary generation
 */

import { z } from "zod"
import {
  type FairnessScore,
  type MemberLoad,
  type FairnessTrend,
  type CategoryFairness,
  CATEGORY_NAMES,
} from "./fairness-calculator"

// =============================================================================
// SCHEMAS
// =============================================================================

export const MessageTypeSchema = z.enum([
  "encouragement",
  "celebration",
  "suggestion",
  "observation",
  "reminder",
])

export const MessageContextSchema = z.object({
  type: MessageTypeSchema,
  targetUserId: z.string().nullable(),
  targetUserName: z.string().nullable(),
  score: z.number().optional(),
  category: z.string().optional(),
  trend: z.enum(["improving", "stable", "declining"]).optional(),
})

export const GeneratedMessageSchema = z.object({
  text: z.string(),
  type: MessageTypeSchema,
  emoji: z.string(),
  priority: z.number().min(1).max(5),
  targetUserId: z.string().nullable(),
})

export const WeeklySummarySchema = z.object({
  householdId: z.string(),
  weekNumber: z.number(),
  year: z.number(),
  headline: z.string(),
  subheadline: z.string(),
  scoreSection: z.object({
    score: z.number(),
    emoji: z.string(),
    message: z.string(),
  }),
  memberHighlights: z.array(
    z.object({
      userName: z.string(),
      highlight: z.string(),
      emoji: z.string(),
    })
  ),
  suggestions: z.array(z.string()),
  encouragements: z.array(z.string()),
  closingMessage: z.string(),
})

// =============================================================================
// TYPES
// =============================================================================

export type MessageType = z.infer<typeof MessageTypeSchema>
export type MessageContext = z.infer<typeof MessageContextSchema>
export type GeneratedMessage = z.infer<typeof GeneratedMessageSchema>
export type WeeklySummary = z.infer<typeof WeeklySummarySchema>

// =============================================================================
// MESSAGE TEMPLATES - NON-CULPABILIZING
// =============================================================================

const ENCOURAGEMENT_TEMPLATES = {
  highScore: [
    "Excellente semaine pour la famille ! Continuez ainsi. 👏",
    "Belle équipe ! La charge est bien répartie. ⭐",
    "L'équilibre est au rendez-vous cette semaine ! 🎯",
  ],
  goodScore: [
    "Bonne dynamique familiale ! Quelques ajustements possibles. 👍",
    "L'équipe est sur la bonne voie ! ✨",
    "De bons efforts de partage cette semaine. 🌟",
  ],
  improvement: [
    "Les efforts portent leurs fruits, la répartition s'améliore ! 📈",
    "Beau progrès dans le partage des tâches ! 🚀",
    "L'équilibre s'améliore, bravo à tous ! 💪",
  ],
  stable: [
    "La répartition reste équilibrée, continuez ! ➡️",
    "Stabilité maintenue, c'est important ! ⚖️",
    "Constance dans le partage, c'est bien ! 👌",
  ],
}

const CELEBRATION_TEMPLATES = {
  milestone: [
    "🎉 Objectif atteint ! {milestone}",
    "🏆 Félicitations ! {milestone}",
    "✨ Bravo ! {milestone}",
  ],
  personalBest: [
    "Record personnel pour {userName} ! Bravo ! 🌟",
    "{userName} bat son record ! Impressionnant ! 🏅",
    "Nouveau sommet pour {userName} ! 📈",
  ],
  teamEffort: [
    "Effort d'équipe remarquable cette semaine ! 👨‍👩‍👧‍👦",
    "La famille a brillé ensemble ! 💫",
    "Superbe collaboration familiale ! 🤝",
  ],
}

const SUGGESTION_TEMPLATES = {
  balanceCategory: [
    "Peut-être redistribuer quelques tâches \"{category}\" pour varier ?",
    "Pensez à partager les tâches \"{category}\" différemment.",
    "Les tâches \"{category}\" pourraient être réparties autrement.",
  ],
  supportMember: [
    "Un coup de main pour {userName} serait apprécié.",
    "{userName} pourrait bénéficier d'un peu de soutien.",
    "Pensez à soulager {userName} si possible.",
  ],
  general: [
    "Une discussion familiale sur la répartition pourrait aider.",
    "Revoir ensemble les responsabilités serait bénéfique.",
    "Un point famille sur le partage des tâches ?",
  ],
}

const OBSERVATION_TEMPLATES = {
  mostActive: [
    "{userName} a été très actif(ve) cette semaine ! 💪",
    "Beau travail de {userName} ! ⭐",
    "{userName} a assuré cette semaine ! 👏",
  ],
  categoryLeader: [
    "{userName} gère bien les tâches \"{category}\".",
    "Les tâches \"{category}\" sont bien prises en charge par {userName}.",
  ],
  improvement: [
    "La participation de {userName} augmente, super ! 📈",
    "Belle progression pour {userName} ! 🌱",
  ],
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get random template from array
 */
function getRandomTemplate(templates: readonly string[]): string {
  return templates[Math.floor(Math.random() * templates.length)]!
}

/**
 * Fill template placeholders
 */
function fillTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value)
  }
  return result
}

// =============================================================================
// MESSAGE GENERATION
// =============================================================================

/**
 * Generate encouragement message based on score
 */
export function generateEncouragementMessage(
  score: number,
  trend: "improving" | "stable" | "declining"
): GeneratedMessage {
  let templates: readonly string[]
  let emoji: string

  if (score >= 85) {
    templates = ENCOURAGEMENT_TEMPLATES.highScore
    emoji = "🌟"
  } else if (score >= 70) {
    templates = ENCOURAGEMENT_TEMPLATES.goodScore
    emoji = "👍"
  } else if (trend === "improving") {
    templates = ENCOURAGEMENT_TEMPLATES.improvement
    emoji = "📈"
  } else {
    templates = ENCOURAGEMENT_TEMPLATES.stable
    emoji = "💪"
  }

  return {
    text: getRandomTemplate(templates),
    type: "encouragement",
    emoji,
    priority: score >= 85 ? 2 : 3,
    targetUserId: null,
  }
}

/**
 * Generate celebration message
 */
export function generateCelebrationMessage(
  type: "milestone" | "personalBest" | "teamEffort",
  values: Record<string, string> = {}
): GeneratedMessage {
  const templates = CELEBRATION_TEMPLATES[type]
  const template = getRandomTemplate(templates)

  return {
    text: fillTemplate(template, values),
    type: "celebration",
    emoji: "🎉",
    priority: 1,
    targetUserId: values["userId"] ?? null,
  }
}

/**
 * Generate suggestion message
 */
export function generateSuggestionMessage(
  suggestionType: "balanceCategory" | "supportMember" | "general",
  values: Record<string, string> = {}
): GeneratedMessage {
  const templates = SUGGESTION_TEMPLATES[suggestionType]
  const template = getRandomTemplate(templates)

  return {
    text: fillTemplate(template, values),
    type: "suggestion",
    emoji: "💡",
    priority: 4,
    targetUserId: values["userId"] ?? null,
  }
}

/**
 * Generate observation message
 */
export function generateObservationMessage(
  observationType: "mostActive" | "categoryLeader" | "improvement",
  values: Record<string, string>
): GeneratedMessage {
  const templates = OBSERVATION_TEMPLATES[observationType]
  const template = getRandomTemplate(templates)

  return {
    text: fillTemplate(template, values),
    type: "observation",
    emoji: "👀",
    priority: 3,
    targetUserId: values["userId"] ?? null,
  }
}

// =============================================================================
// CONTEXTUAL MESSAGE GENERATION
// =============================================================================

/**
 * Generate messages based on fairness score
 */
export function generateScoreBasedMessages(
  score: FairnessScore,
  trend: FairnessTrend
): GeneratedMessage[] {
  const messages: GeneratedMessage[] = []

  // Main encouragement based on score
  messages.push(
    generateEncouragementMessage(score.overallScore, trend.trend)
  )

  // Celebration for excellent score
  if (score.status === "excellent") {
    messages.push(
      generateCelebrationMessage("teamEffort")
    )
  }

  // Suggestions for improvement
  if (score.status === "poor" || score.status === "critical") {
    messages.push(generateSuggestionMessage("general"))
  }

  // Category-based suggestions
  for (const [category, fairness] of Object.entries(score.categoryFairness)) {
    if (fairness < 50) {
      messages.push(
        generateSuggestionMessage("balanceCategory", {
          category: CATEGORY_NAMES[category] ?? category,
        })
      )
      break // Only one category suggestion
    }
  }

  return messages
}

/**
 * Generate messages for member performance
 */
export function generateMemberMessages(
  memberLoads: MemberLoad[]
): GeneratedMessage[] {
  const messages: GeneratedMessage[] = []

  if (memberLoads.length === 0) return messages

  // Highlight most active member (if significantly more)
  const sorted = [...memberLoads].sort(
    (a, b) => b.adjustedPercentage - a.adjustedPercentage
  )

  if (sorted.length >= 2) {
    const top = sorted[0]!
    const second = sorted[1]!

    if (top.adjustedPercentage > second.adjustedPercentage * 1.3) {
      messages.push(
        generateObservationMessage("mostActive", {
          userName: top.userName,
          userId: top.userId,
        })
      )

      // Non-culpabilizing suggestion to support
      if (top.adjustedPercentage > 60) {
        messages.push(
          generateSuggestionMessage("supportMember", {
            userName: top.userName,
            userId: top.userId,
          })
        )
      }
    }
  }

  return messages
}

// =============================================================================
// WEEKLY SUMMARY
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
 * Generate weekly summary
 */
export function generateWeeklySummary(
  householdId: string,
  score: FairnessScore,
  trend: FairnessTrend,
  categoryAnalyses: CategoryFairness[]
): WeeklySummary {
  const now = new Date()
  const weekNumber = getWeekNumber(now)
  const year = now.getFullYear()

  // Generate headline
  let headline: string
  let subheadline: string
  let scoreEmoji: string

  if (score.status === "excellent") {
    headline = "Une semaine exemplaire ! 🌟"
    subheadline = "L'équilibre familial est au top."
    scoreEmoji = "🌟"
  } else if (score.status === "good") {
    headline = "Bonne semaine pour la famille ! ✨"
    subheadline = "La charge est bien partagée."
    scoreEmoji = "✅"
  } else if (score.status === "fair") {
    headline = "Semaine correcte ! 👍"
    subheadline = "Quelques ajustements possibles."
    scoreEmoji = "⚖️"
  } else if (score.status === "poor") {
    headline = "Semaine à revoir 💪"
    subheadline = "Un rééquilibrage serait bénéfique."
    scoreEmoji = "⚠️"
  } else {
    headline = "Cette semaine demande attention 🤝"
    subheadline = "Parlons ensemble de la répartition."
    scoreEmoji = "💬"
  }

  // Generate member highlights (non-culpabilizing)
  const memberHighlights = score.memberLoads.slice(0, 3).map((load) => {
    let highlight: string
    let emoji: string

    if (load.adjustedPercentage >= 40) {
      highlight = "a beaucoup contribué"
      emoji = "💪"
    } else if (load.adjustedPercentage >= 25) {
      highlight = "a bien participé"
      emoji = "👍"
    } else if (load.exclusionDays > 0) {
      highlight = "était partiellement absent(e)"
      emoji = "📅"
    } else {
      highlight = "pourrait contribuer davantage"
      emoji = "🌱"
    }

    return {
      userName: load.userName,
      highlight,
      emoji,
    }
  })

  // Generate suggestions (max 2)
  const suggestions: string[] = []

  if (score.status === "poor" || score.status === "critical") {
    suggestions.push("Prenez un moment pour discuter de la répartition des tâches.")
  }

  // Check for category imbalance
  const imbalancedCategory = categoryAnalyses.find((c) => c.fairnessScore < 50)
  if (imbalancedCategory) {
    suggestions.push(
      `Les tâches "${CATEGORY_NAMES[imbalancedCategory.category] ?? imbalancedCategory.category}" pourraient être mieux réparties.`
    )
  }

  if (score.imbalanceDetails.gap > 30) {
    suggestions.push(
      "L'écart de charge entre les membres est notable. Pensez à rééquilibrer."
    )
  }

  // Generate encouragements (max 2)
  const encouragements: string[] = []

  if (trend.trend === "improving") {
    encouragements.push("📈 La tendance est positive ! Continuez vos efforts.")
  }

  if (score.memberLoads.every((l) => l.tasksCompleted > 0)) {
    encouragements.push("👨‍👩‍👧‍👦 Tout le monde a participé cette semaine !")
  }

  if (score.overallScore > (trend.averageScore ?? 0)) {
    encouragements.push("⭐ Score supérieur à votre moyenne habituelle !")
  }

  // Closing message
  let closingMessage: string
  if (score.status === "excellent" || score.status === "good") {
    closingMessage = "Continuez ainsi, belle équipe ! 🙌"
  } else if (trend.trend === "improving") {
    closingMessage = "Vous êtes sur la bonne voie ! 🚀"
  } else {
    closingMessage = "Ensemble, vous pouvez améliorer l'équilibre ! 💪"
  }

  return {
    householdId,
    weekNumber,
    year,
    headline,
    subheadline,
    scoreSection: {
      score: score.overallScore,
      emoji: scoreEmoji,
      message: `Score d'équité : ${score.overallScore}/100`,
    },
    memberHighlights,
    suggestions: suggestions.slice(0, 2),
    encouragements: encouragements.slice(0, 2),
    closingMessage,
  }
}

// =============================================================================
// NOTIFICATION GENERATION
// =============================================================================

/**
 * Generate push notification message
 */
export function generateNotificationMessage(
  score: FairnessScore
): { title: string; body: string } {
  let title: string
  let body: string

  if (score.status === "excellent") {
    title = "🌟 Semaine exceptionnelle !"
    body = `Score d'équité : ${score.overallScore}/100. Bravo à toute la famille !`
  } else if (score.status === "good") {
    title = "✅ Bonne semaine !"
    body = `Score d'équité : ${score.overallScore}/100. Continuez ainsi !`
  } else if (score.status === "fair") {
    title = "⚖️ Résumé de la semaine"
    body = `Score d'équité : ${score.overallScore}/100. Quelques ajustements possibles.`
  } else if (score.status === "poor") {
    title = "💬 Parlons répartition"
    body = `Score d'équité : ${score.overallScore}/100. Un rééquilibrage serait bénéfique.`
  } else {
    title = "🤝 Discussion familiale suggérée"
    body = `Score d'équité : ${score.overallScore}/100. Prenez un moment pour en parler.`
  }

  return { title, body }
}

/**
 * Generate email subject line
 */
export function generateEmailSubject(
  householdName: string,
  weekNumber: number,
  score: number
): string {
  if (score >= 85) {
    return `🌟 ${householdName} - Semaine ${weekNumber} : Excellente équité !`
  }
  if (score >= 70) {
    return `✅ ${householdName} - Semaine ${weekNumber} : Bonne répartition`
  }
  if (score >= 55) {
    return `📊 ${householdName} - Semaine ${weekNumber} : Résumé`
  }
  return `📋 ${householdName} - Semaine ${weekNumber} : À améliorer ensemble`
}
