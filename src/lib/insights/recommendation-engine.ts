/**
 * Recommendation Engine - Smart recommendations for families
 * Functional, immutable approach to family insights recommendations
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const RecommendationType = z.enum([
  "task_assignment", // Who should do a task
  "workload_balance", // Balance work across members
  "schedule", // When to do tasks
  "category_focus", // Which category needs attention
  "motivation", // Motivational recommendations
  "efficiency", // How to be more efficient
  "collaboration", // Teamwork recommendations
])
export type RecommendationType = z.infer<typeof RecommendationType>

export const RecommendationPriority = z.enum(["low", "medium", "high", "urgent"])
export type RecommendationPriority = z.infer<typeof RecommendationPriority>

export const RecommendationSchema = z.object({
  id: z.string(),
  type: RecommendationType,
  priority: RecommendationPriority,
  title: z.string(),
  description: z.string(),
  reasoning: z.string(),
  targetMemberId: z.string().nullable(),
  targetTaskId: z.string().nullable(),
  suggestedAction: z.string(),
  impact: z.string(),
  confidence: z.number().min(0).max(1),
  dismissed: z.boolean().default(false),
  createdAt: z.date(),
})
export type Recommendation = z.infer<typeof RecommendationSchema>

export const MemberProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  age: z.number().nullable(),
  preferredCategories: z.array(z.string()),
  availableHours: z.array(z.number()),
  strengths: z.array(z.string()),
  currentWorkload: z.number(),
  completionRate: z.number(),
  recentTrend: z.enum(["improving", "stable", "declining"]),
})
export type MemberProfile = z.infer<typeof MemberProfileSchema>

export const TaskContextSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  priority: z.string(),
  estimatedMinutes: z.number().nullable(),
  deadline: z.date().nullable(),
  skills: z.array(z.string()),
  preferredTime: z.enum(["morning", "afternoon", "evening", "any"]).nullable(),
})
export type TaskContext = z.infer<typeof TaskContextSchema>

export const FamilyContextSchema = z.object({
  householdId: z.string(),
  members: z.array(MemberProfileSchema),
  pendingTasks: z.array(TaskContextSchema),
  averageCompletionRate: z.number(),
  overdueTasks: z.number(),
  categoryDistribution: z.record(z.string(), z.number()),
  weeklyGoal: z.number().nullable(),
  currentProgress: z.number(),
})
export type FamilyContext = z.infer<typeof FamilyContextSchema>

// =============================================================================
// RECOMMENDATION GENERATION
// =============================================================================

/**
 * Generate recommendation ID
 */
function generateRecommendationId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create recommendation
 */
function createRecommendation(params: {
  type: RecommendationType
  priority: RecommendationPriority
  title: string
  description: string
  reasoning: string
  targetMemberId?: string
  targetTaskId?: string
  suggestedAction: string
  impact: string
  confidence: number
}): Recommendation {
  return {
    id: generateRecommendationId(),
    type: params.type,
    priority: params.priority,
    title: params.title,
    description: params.description,
    reasoning: params.reasoning,
    targetMemberId: params.targetMemberId ?? null,
    targetTaskId: params.targetTaskId ?? null,
    suggestedAction: params.suggestedAction,
    impact: params.impact,
    confidence: params.confidence,
    dismissed: false,
    createdAt: new Date(),
  }
}

// =============================================================================
// TASK ASSIGNMENT RECOMMENDATIONS
// =============================================================================

/**
 * Calculate member-task fit score
 */
export function calculateMemberTaskFit(
  member: MemberProfile,
  task: TaskContext
): number {
  let score = 0

  // Category preference match
  if (task.category && member.preferredCategories.includes(task.category)) {
    score += 30
  }

  // Skill match
  const matchedSkills = task.skills.filter((s) => member.strengths.includes(s))
  score += matchedSkills.length * 15

  // Workload consideration (lower workload = better fit)
  const workloadFactor = Math.max(0, 100 - member.currentWorkload) / 100
  score += workloadFactor * 20

  // Completion rate bonus
  score += member.completionRate * 0.2

  // Trend bonus
  if (member.recentTrend === "improving") score += 10
  if (member.recentTrend === "declining") score -= 10

  // Cap at 100
  return Math.min(100, Math.max(0, score))
}

/**
 * Recommend best assignee for a task
 */
export function recommendTaskAssignment(
  task: TaskContext,
  members: MemberProfile[]
): Recommendation | null {
  if (members.length === 0) return null

  const scores = members.map((member) => ({
    member,
    score: calculateMemberTaskFit(member, task),
  }))

  const sorted = scores.sort((a, b) => b.score - a.score)
  const best = sorted[0]!

  if (best.score < 30) {
    return null // No good fit
  }

  const reasons: string[] = []
  if (task.category && best.member.preferredCategories.includes(task.category)) {
    reasons.push(`préfère les tâches de type "${task.category}"`)
  }
  if (best.member.currentWorkload < 50) {
    reasons.push("a une charge de travail légère")
  }
  if (best.member.completionRate > 80) {
    reasons.push("a un excellent taux de complétion")
  }

  return createRecommendation({
    type: "task_assignment",
    priority: task.priority === "urgent" ? "high" : "medium",
    title: `Assigner "${task.title}" à ${best.member.name}`,
    description: `${best.member.name} est le meilleur candidat pour cette tâche.`,
    reasoning: reasons.length > 0
      ? `${best.member.name} ${reasons.join(", ")}.`
      : `${best.member.name} a le meilleur score de compatibilité.`,
    targetMemberId: best.member.id,
    targetTaskId: task.id,
    suggestedAction: "Assigner la tâche",
    impact: "Augmente les chances de complétion à temps",
    confidence: best.score / 100,
  })
}

// =============================================================================
// WORKLOAD BALANCE RECOMMENDATIONS
// =============================================================================

/**
 * Calculate workload imbalance
 */
export function calculateWorkloadImbalance(members: MemberProfile[]): {
  overloaded: MemberProfile[]
  underloaded: MemberProfile[]
  averageWorkload: number
} {
  if (members.length === 0) {
    return { overloaded: [], underloaded: [], averageWorkload: 0 }
  }

  const averageWorkload = members.reduce((sum, m) => sum + m.currentWorkload, 0) / members.length
  const threshold = 20 // % deviation

  const overloaded = members.filter(
    (m) => m.currentWorkload > averageWorkload + threshold
  )
  const underloaded = members.filter(
    (m) => m.currentWorkload < averageWorkload - threshold
  )

  return { overloaded, underloaded, averageWorkload }
}

/**
 * Generate workload balance recommendations
 */
export function generateWorkloadBalanceRecommendations(
  context: FamilyContext
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const { overloaded, underloaded, averageWorkload } = calculateWorkloadImbalance(context.members)

  for (const overMember of overloaded) {
    // Find potential helper
    const helper = underloaded.find(
      (u) => u.role === "parent" || (overMember.role === "parent" && u.role !== "child")
    ) ?? underloaded[0]

    if (helper) {
      recommendations.push(createRecommendation({
        type: "workload_balance",
        priority: overMember.currentWorkload > 80 ? "high" : "medium",
        title: `Rééquilibrer les tâches de ${overMember.name}`,
        description: `${overMember.name} a ${Math.round(overMember.currentWorkload - averageWorkload)}% de charge en plus que la moyenne.`,
        reasoning: `La charge de travail moyenne est de ${Math.round(averageWorkload)}%, mais ${overMember.name} est à ${Math.round(overMember.currentWorkload)}%.`,
        targetMemberId: overMember.id,
        suggestedAction: `Transférer quelques tâches vers ${helper.name}`,
        impact: "Meilleur équilibre et bien-être familial",
        confidence: 0.8,
      }))
    }
  }

  return recommendations
}

// =============================================================================
// SCHEDULE RECOMMENDATIONS
// =============================================================================

/**
 * Determine best time for task
 */
export function determineBestTime(
  task: TaskContext,
  member: MemberProfile
): { time: "morning" | "afternoon" | "evening"; confidence: number } {
  // If task has preferred time
  if (task.preferredTime && task.preferredTime !== "any") {
    const hourRange = member.availableHours
    const hasMorning = hourRange.some((h) => h >= 6 && h < 12)
    const hasAfternoon = hourRange.some((h) => h >= 12 && h < 18)
    const hasEvening = hourRange.some((h) => h >= 18 && h < 22)

    switch (task.preferredTime) {
      case "morning":
        if (hasMorning) return { time: "morning", confidence: 0.9 }
        break
      case "afternoon":
        if (hasAfternoon) return { time: "afternoon", confidence: 0.9 }
        break
      case "evening":
        if (hasEvening) return { time: "evening", confidence: 0.9 }
        break
    }
  }

  // Based on member's available hours
  const morning = member.availableHours.filter((h) => h >= 6 && h < 12).length
  const afternoon = member.availableHours.filter((h) => h >= 12 && h < 18).length
  const evening = member.availableHours.filter((h) => h >= 18 && h < 22).length

  if (morning >= afternoon && morning >= evening) {
    return { time: "morning", confidence: 0.7 }
  }
  if (afternoon >= evening) {
    return { time: "afternoon", confidence: 0.7 }
  }
  return { time: "evening", confidence: 0.7 }
}

/**
 * Generate schedule recommendation
 */
export function generateScheduleRecommendation(
  task: TaskContext,
  member: MemberProfile
): Recommendation | null {
  if (!task.deadline) return null

  const { time, confidence } = determineBestTime(task, member)
  const timeLabels = {
    morning: "le matin",
    afternoon: "l'après-midi",
    evening: "le soir",
  }

  const daysUntilDeadline = Math.ceil(
    (task.deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  )

  if (daysUntilDeadline <= 0) {
    return createRecommendation({
      type: "schedule",
      priority: "urgent",
      title: `Tâche urgente: "${task.title}"`,
      description: "Cette tâche est en retard ou arrive à échéance aujourd'hui.",
      reasoning: "La deadline est passée ou imminente.",
      targetMemberId: member.id,
      targetTaskId: task.id,
      suggestedAction: "Commencer immédiatement",
      impact: "Évite un retard supplémentaire",
      confidence: 0.95,
    })
  }

  return createRecommendation({
    type: "schedule",
    priority: daysUntilDeadline <= 2 ? "high" : "medium",
    title: `Planifier "${task.title}" ${timeLabels[time]}`,
    description: `${member.name} est plus disponible ${timeLabels[time]}.`,
    reasoning: `Basé sur les heures de disponibilité et ${daysUntilDeadline} jour(s) avant l'échéance.`,
    targetMemberId: member.id,
    targetTaskId: task.id,
    suggestedAction: `Programmer pour ${timeLabels[time]}`,
    impact: "Optimise les chances de complétion",
    confidence,
  })
}

// =============================================================================
// CATEGORY FOCUS RECOMMENDATIONS
// =============================================================================

/**
 * Analyze category performance
 */
export function analyzeCategoryPerformance(
  context: FamilyContext
): { neglected: string[]; overrepresented: string[] } {
  const entries = Object.entries(context.categoryDistribution)
  if (entries.length < 2) {
    return { neglected: [], overrepresented: [] }
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const average = total / entries.length

  const neglected = entries
    .filter(([, count]) => count < average * 0.5)
    .map(([category]) => category)

  const overrepresented = entries
    .filter(([, count]) => count > average * 1.5)
    .map(([category]) => category)

  return { neglected, overrepresented }
}

/**
 * Generate category focus recommendations
 */
export function generateCategoryFocusRecommendations(
  context: FamilyContext
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const { neglected, overrepresented } = analyzeCategoryPerformance(context)

  for (const category of neglected) {
    recommendations.push(createRecommendation({
      type: "category_focus",
      priority: "low",
      title: `Attention à la catégorie "${category}"`,
      description: `La catégorie "${category}" manque d'attention.`,
      reasoning: "Cette catégorie a moins de tâches que la moyenne.",
      suggestedAction: "Créer plus de tâches dans cette catégorie ou vérifier si c'est intentionnel",
      impact: "Meilleur équilibre des responsabilités",
      confidence: 0.6,
    }))
  }

  if (overrepresented.length > 0) {
    recommendations.push(createRecommendation({
      type: "category_focus",
      priority: "low",
      title: "Diversifier les tâches",
      description: `Les tâches sont concentrées sur: ${overrepresented.join(", ")}.`,
      reasoning: "Une ou plusieurs catégories dominent le planning.",
      suggestedAction: "Envisager de varier les types de tâches",
      impact: "Distribution plus équilibrée des activités",
      confidence: 0.5,
    }))
  }

  return recommendations
}

// =============================================================================
// MOTIVATION RECOMMENDATIONS
// =============================================================================

/**
 * Generate motivation recommendations
 */
export function generateMotivationRecommendations(
  context: FamilyContext
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // Check for declining members
  const declining = context.members.filter((m) => m.recentTrend === "declining")
  for (const member of declining) {
    recommendations.push(createRecommendation({
      type: "motivation",
      priority: "medium",
      title: `Encourager ${member.name}`,
      description: `${member.name} semble moins engagé(e) récemment.`,
      reasoning: "Tendance à la baisse du taux de complétion.",
      targetMemberId: member.id,
      suggestedAction: "Offrir du soutien ou ajuster les attentes",
      impact: "Amélioration du moral et de l'engagement",
      confidence: 0.7,
    }))
  }

  // Celebrate improving members
  const improving = context.members.filter((m) => m.recentTrend === "improving")
  for (const member of improving) {
    recommendations.push(createRecommendation({
      type: "motivation",
      priority: "low",
      title: `Féliciter ${member.name}`,
      description: `${member.name} s'améliore !`,
      reasoning: "Tendance positive du taux de complétion.",
      targetMemberId: member.id,
      suggestedAction: "Reconnaître publiquement les progrès",
      impact: "Renforce la motivation positive",
      confidence: 0.8,
    }))
  }

  // Weekly goal progress
  if (context.weeklyGoal !== null) {
    const progress = context.currentProgress / context.weeklyGoal
    if (progress >= 1) {
      recommendations.push(createRecommendation({
        type: "motivation",
        priority: "low",
        title: "Objectif hebdomadaire atteint !",
        description: "La famille a atteint son objectif de la semaine.",
        reasoning: `${context.currentProgress}/${context.weeklyGoal} tâches complétées.`,
        suggestedAction: "Célébrer ensemble cette réussite",
        impact: "Renforce l'esprit d'équipe",
        confidence: 0.95,
      }))
    } else if (progress < 0.5) {
      recommendations.push(createRecommendation({
        type: "motivation",
        priority: "medium",
        title: "En dessous de l'objectif",
        description: "La famille est en retard sur l'objectif hebdomadaire.",
        reasoning: `Seulement ${Math.round(progress * 100)}% de l'objectif atteint.`,
        suggestedAction: "Identifier les blocages et s'entraider",
        impact: "Augmente les chances d'atteindre l'objectif",
        confidence: 0.8,
      }))
    }
  }

  return recommendations
}

// =============================================================================
// EFFICIENCY RECOMMENDATIONS
// =============================================================================

/**
 * Generate efficiency recommendations
 */
export function generateEfficiencyRecommendations(
  context: FamilyContext
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // Check for overdue tasks
  if (context.overdueTasks > 0) {
    recommendations.push(createRecommendation({
      type: "efficiency",
      priority: context.overdueTasks > 5 ? "high" : "medium",
      title: `${context.overdueTasks} tâche(s) en retard`,
      description: "Des tâches ont dépassé leur deadline.",
      reasoning: "Les tâches en retard s'accumulent et créent du stress.",
      suggestedAction: "Prioriser les tâches en retard ou ajuster les deadlines",
      impact: "Réduit le stress et améliore la productivité",
      confidence: 0.9,
    }))
  }

  // Check for low overall completion rate
  if (context.averageCompletionRate < 60) {
    recommendations.push(createRecommendation({
      type: "efficiency",
      priority: "high",
      title: "Taux de complétion bas",
      description: `Le taux de complétion moyen est de ${context.averageCompletionRate}%.`,
      reasoning: "Un taux inférieur à 60% indique des difficultés systémiques.",
      suggestedAction: "Revoir la quantité et la complexité des tâches",
      impact: "Améliore l'efficacité globale de la famille",
      confidence: 0.85,
    }))
  }

  // Recommend batching similar tasks
  const categoryGroups = Object.entries(context.categoryDistribution)
    .filter(([, count]) => count >= 3)

  if (categoryGroups.length > 0) {
    const [topCategory] = categoryGroups.sort((a, b) => b[1] - a[1])[0]!
    recommendations.push(createRecommendation({
      type: "efficiency",
      priority: "low",
      title: "Regrouper les tâches similaires",
      description: `Plusieurs tâches "${topCategory}" peuvent être faites ensemble.`,
      reasoning: "Regrouper les tâches similaires économise du temps de transition.",
      suggestedAction: `Planifier les tâches "${topCategory}" en bloc`,
      impact: "Gain de temps estimé de 15-20%",
      confidence: 0.65,
    }))
  }

  return recommendations
}

// =============================================================================
// COLLABORATION RECOMMENDATIONS
// =============================================================================

/**
 * Generate collaboration recommendations
 */
export function generateCollaborationRecommendations(
  context: FamilyContext
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // Find tasks suitable for pairs
  const bigTasks = context.pendingTasks.filter(
    (t) => (t.estimatedMinutes ?? 0) > 60
  )

  if (bigTasks.length > 0 && context.members.length >= 2) {
    const task = bigTasks[0]!
    recommendations.push(createRecommendation({
      type: "collaboration",
      priority: "low",
      title: `Faire "${task.title}" à deux`,
      description: "Cette tâche longue pourrait être plus agréable à plusieurs.",
      reasoning: `Durée estimée: ${task.estimatedMinutes ?? 60} minutes.`,
      targetTaskId: task.id,
      suggestedAction: "Proposer à un autre membre de participer",
      impact: "Plus rapide et renforce les liens",
      confidence: 0.6,
    }))
  }

  // Suggest parent-child collaboration
  const parents = context.members.filter((m) => m.role === "parent")
  const children = context.members.filter(
    (m) => m.role === "child" && m.recentTrend !== "declining"
  )

  if (parents.length > 0 && children.length > 0) {
    const parent = parents[0]!
    const child = children[0]!

    recommendations.push(createRecommendation({
      type: "collaboration",
      priority: "low",
      title: "Moment de qualité",
      description: `${parent.name} et ${child.name} pourraient faire une tâche ensemble.`,
      reasoning: "Les activités partagées renforcent les relations familiales.",
      targetMemberId: parent.id,
      suggestedAction: "Choisir une tâche appropriée pour les deux",
      impact: "Améliore la communication et les liens familiaux",
      confidence: 0.5,
    }))
  }

  return recommendations
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate all recommendations for a family
 */
export function generateAllRecommendations(
  context: FamilyContext
): Recommendation[] {
  const allRecommendations: Recommendation[] = []

  // Task assignments
  for (const task of context.pendingTasks.slice(0, 5)) {
    const rec = recommendTaskAssignment(task, context.members)
    if (rec) allRecommendations.push(rec)
  }

  // Workload balance
  allRecommendations.push(...generateWorkloadBalanceRecommendations(context))

  // Schedule recommendations for urgent tasks
  const urgentTasks = context.pendingTasks.filter(
    (t) => t.priority === "urgent" || t.priority === "high"
  )
  for (const task of urgentTasks.slice(0, 3)) {
    const member = context.members.find(
      (m) => m.preferredCategories.includes(task.category ?? "")
    ) ?? context.members[0]
    if (member) {
      const rec = generateScheduleRecommendation(task, member)
      if (rec) allRecommendations.push(rec)
    }
  }

  // Category focus
  allRecommendations.push(...generateCategoryFocusRecommendations(context))

  // Motivation
  allRecommendations.push(...generateMotivationRecommendations(context))

  // Efficiency
  allRecommendations.push(...generateEfficiencyRecommendations(context))

  // Collaboration
  allRecommendations.push(...generateCollaborationRecommendations(context))

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  return allRecommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )
}

/**
 * Get top recommendations
 */
export function getTopRecommendations(
  recommendations: Recommendation[],
  count: number = 5
): Recommendation[] {
  return recommendations
    .filter((r) => !r.dismissed)
    .slice(0, count)
}

/**
 * Dismiss recommendation
 */
export function dismissRecommendation(
  recommendation: Recommendation
): Recommendation {
  return {
    ...recommendation,
    dismissed: true,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const recommendationEngine = {
  // Task assignment
  calculateMemberTaskFit,
  recommendTaskAssignment,

  // Workload balance
  calculateWorkloadImbalance,
  generateWorkloadBalanceRecommendations,

  // Schedule
  determineBestTime,
  generateScheduleRecommendation,

  // Category focus
  analyzeCategoryPerformance,
  generateCategoryFocusRecommendations,

  // Motivation
  generateMotivationRecommendations,

  // Efficiency
  generateEfficiencyRecommendations,

  // Collaboration
  generateCollaborationRecommendations,

  // Main
  generateAllRecommendations,
  getTopRecommendations,
  dismissRecommendation,
}
