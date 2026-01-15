/**
 * Task Prioritization Service
 *
 * Advanced task scoring and prioritization:
 * - Urgency vs Importance matrix (Eisenhower)
 * - Deadline-based scoring
 * - Implicit deadline detection
 * - Priority recommendations
 * - Batch prioritization
 */

import { z } from "zod"

// ============================================================
// TYPES
// ============================================================

export interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "done"
  priority: "low" | "normal" | "high" | "urgent"
  deadline?: string | Date | null
  createdAt: string | Date
  childId?: string
  category?: string
  loadWeight?: number
  isCritical?: boolean
  recurrenceRule?: string
  assignedTo?: string
  completedAt?: string | Date | null
}

export interface PriorityScore {
  taskId: string
  score: number // 0-100
  urgency: number // 0-100
  importance: number // 0-100
  quadrant: EisenhowerQuadrant
  factors: PriorityFactor[]
  recommendation: string
}

export type EisenhowerQuadrant =
  | "do_first" // Urgent & Important
  | "schedule" // Important, Not Urgent
  | "delegate" // Urgent, Not Important
  | "eliminate" // Not Urgent, Not Important

export interface PriorityFactor {
  name: string
  impact: number // positive or negative
  description: string
}

export interface ImplicitDeadline {
  taskId: string
  suggestedDeadline: Date
  confidence: number // 0-1
  reason: string
}

export interface PrioritizedList {
  tasks: PriorityScore[]
  summary: {
    doFirst: number
    schedule: number
    delegate: number
    eliminate: number
  }
  topPriority: PriorityScore[]
  warnings: string[]
}

// ============================================================
// SCHEMAS
// ============================================================

export const TaskForPrioritizationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "done"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  deadline: z.string().nullable().optional(),
  createdAt: z.string(),
  childId: z.string().optional(),
  category: z.string().optional(),
  loadWeight: z.number().optional(),
  isCritical: z.boolean().optional(),
})

// ============================================================
// CONSTANTS
// ============================================================

// Category importance weights
const CATEGORY_IMPORTANCE: Record<string, number> = {
  sante: 90,
  administratif: 75,
  ecole: 70,
  logistique: 60,
  quotidien: 50,
  activites: 40,
  social: 30,
}

// Keywords that suggest urgency
const URGENCY_KEYWORDS = [
  { pattern: /urgent|asap|immédiat|tout de suite/i, weight: 30 },
  { pattern: /aujourd'hui|ce soir|ce matin/i, weight: 25 },
  { pattern: /demain|le lendemain/i, weight: 20 },
  { pattern: /cette semaine/i, weight: 15 },
  { pattern: /bientôt|prochainement/i, weight: 10 },
]

// Keywords that suggest importance
const IMPORTANCE_KEYWORDS = [
  { pattern: /important|crucial|essentiel|vital/i, weight: 25 },
  { pattern: /rendez-vous|rdv|appointment/i, weight: 20 },
  { pattern: /inscription|deadline|échéance/i, weight: 20 },
  { pattern: /médecin|docteur|pédiatre|dentiste/i, weight: 25 },
  { pattern: /école|scolar|reunion/i, weight: 15 },
  { pattern: /paiement|facture|impôt/i, weight: 20 },
]

// Default weights for priority levels
const PRIORITY_URGENCY_WEIGHTS: Record<Task["priority"], number> = {
  urgent: 90,
  high: 70,
  normal: 40,
  low: 20,
}

const PRIORITY_IMPORTANCE_WEIGHTS: Record<Task["priority"], number> = {
  urgent: 80,
  high: 70,
  normal: 50,
  low: 30,
}

// Thresholds for quadrant classification
const URGENCY_THRESHOLD = 50
const IMPORTANCE_THRESHOLD = 50

// ============================================================
// URGENCY CALCULATION
// ============================================================

/**
 * Calculate urgency score for a task
 */
export function calculateUrgency(task: Task): { score: number; factors: PriorityFactor[] } {
  const factors: PriorityFactor[] = []
  let score = PRIORITY_URGENCY_WEIGHTS[task.priority]

  factors.push({
    name: "Priorité définie",
    impact: PRIORITY_URGENCY_WEIGHTS[task.priority],
    description: `Priorité: ${task.priority}`,
  })

  // Deadline factor
  if (task.deadline) {
    const deadline = new Date(task.deadline)
    const now = new Date()
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilDeadline < 0) {
      // Overdue
      score += 40
      factors.push({
        name: "En retard",
        impact: 40,
        description: "La deadline est passée",
      })
    } else if (hoursUntilDeadline < 24) {
      score += 35
      factors.push({
        name: "Deadline aujourd'hui",
        impact: 35,
        description: "Moins de 24h restantes",
      })
    } else if (hoursUntilDeadline < 48) {
      score += 25
      factors.push({
        name: "Deadline demain",
        impact: 25,
        description: "Moins de 48h restantes",
      })
    } else if (hoursUntilDeadline < 168) {
      score += 15
      factors.push({
        name: "Deadline cette semaine",
        impact: 15,
        description: `${Math.ceil(hoursUntilDeadline / 24)} jours restants`,
      })
    }
  }

  // Text analysis for urgency keywords
  const text = `${task.title} ${task.description || ""}`.toLowerCase()
  for (const { pattern, weight } of URGENCY_KEYWORDS) {
    if (pattern.test(text)) {
      score += weight
      factors.push({
        name: "Mot-clé urgent",
        impact: weight,
        description: `Contient un terme urgent`,
      })
      break // Only count one keyword match
    }
  }

  // In progress tasks are more urgent
  if (task.status === "in_progress") {
    score += 10
    factors.push({
      name: "En cours",
      impact: 10,
      description: "Tâche déjà commencée",
    })
  }

  // Age factor (older tasks slightly more urgent)
  const created = new Date(task.createdAt)
  const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceCreation > 7) {
    const ageBonus = Math.min(Math.floor(daysSinceCreation / 7) * 5, 15)
    score += ageBonus
    factors.push({
      name: "Ancienneté",
      impact: ageBonus,
      description: `Créée il y a ${Math.floor(daysSinceCreation)} jours`,
    })
  }

  return { score: Math.min(100, Math.max(0, score)), factors }
}

// ============================================================
// IMPORTANCE CALCULATION
// ============================================================

/**
 * Calculate importance score for a task
 */
export function calculateImportance(task: Task): { score: number; factors: PriorityFactor[] } {
  const factors: PriorityFactor[] = []
  let score = PRIORITY_IMPORTANCE_WEIGHTS[task.priority]

  factors.push({
    name: "Priorité définie",
    impact: PRIORITY_IMPORTANCE_WEIGHTS[task.priority],
    description: `Priorité: ${task.priority}`,
  })

  // Category importance
  if (task.category) {
    const categoryWeight = CATEGORY_IMPORTANCE[task.category] || 50
    const categoryImpact = (categoryWeight - 50) / 2
    score += categoryImpact
    factors.push({
      name: "Catégorie",
      impact: categoryImpact,
      description: `Catégorie: ${task.category}`,
    })
  }

  // Critical flag
  if (task.isCritical) {
    score += 25
    factors.push({
      name: "Marquée critique",
      impact: 25,
      description: "Tâche marquée comme critique",
    })
  }

  // Load weight factor
  if (task.loadWeight && task.loadWeight > 3) {
    const loadImpact = Math.min((task.loadWeight - 3) * 5, 20)
    score += loadImpact
    factors.push({
      name: "Charge mentale",
      impact: loadImpact,
      description: `Poids: ${task.loadWeight}/5`,
    })
  }

  // Text analysis for importance keywords
  const text = `${task.title} ${task.description || ""}`.toLowerCase()
  for (const { pattern, weight } of IMPORTANCE_KEYWORDS) {
    if (pattern.test(text)) {
      score += weight
      factors.push({
        name: "Mot-clé important",
        impact: weight,
        description: "Contient un terme important",
      })
      break // Only count one keyword match
    }
  }

  // Child association (tasks for children are often important)
  if (task.childId) {
    score += 10
    factors.push({
      name: "Liée à un enfant",
      impact: 10,
      description: "Concerne un enfant",
    })
  }

  // Recurring tasks tend to be important (established routines)
  if (task.recurrenceRule) {
    score += 10
    factors.push({
      name: "Récurrente",
      impact: 10,
      description: "Tâche récurrente établie",
    })
  }

  return { score: Math.min(100, Math.max(0, score)), factors }
}

// ============================================================
// QUADRANT CLASSIFICATION
// ============================================================

/**
 * Determine Eisenhower quadrant based on urgency and importance
 */
export function determineQuadrant(urgency: number, importance: number): EisenhowerQuadrant {
  const isUrgent = urgency >= URGENCY_THRESHOLD
  const isImportant = importance >= IMPORTANCE_THRESHOLD

  if (isUrgent && isImportant) return "do_first"
  if (!isUrgent && isImportant) return "schedule"
  if (isUrgent && !isImportant) return "delegate"
  return "eliminate"
}

/**
 * Get quadrant description and action
 */
export function getQuadrantInfo(quadrant: EisenhowerQuadrant): { name: string; action: string; color: string } {
  const info: Record<EisenhowerQuadrant, { name: string; action: string; color: string }> = {
    do_first: {
      name: "Faire en premier",
      action: "À traiter immédiatement",
      color: "red",
    },
    schedule: {
      name: "Planifier",
      action: "À programmer pour plus tard",
      color: "blue",
    },
    delegate: {
      name: "Déléguer",
      action: "À confier à quelqu'un d'autre",
      color: "yellow",
    },
    eliminate: {
      name: "Éliminer",
      action: "À reconsidérer ou supprimer",
      color: "gray",
    },
  }

  return info[quadrant]
}

// ============================================================
// PRIORITY SCORE CALCULATION
// ============================================================

/**
 * Calculate comprehensive priority score for a task
 */
export function calculatePriorityScore(task: Task): PriorityScore {
  const { score: urgencyScore, factors: urgencyFactors } = calculateUrgency(task)
  const { score: importanceScore, factors: importanceFactors } = calculateImportance(task)

  // Combined score (weighted average favoring urgency slightly)
  const combinedScore = Math.round(urgencyScore * 0.55 + importanceScore * 0.45)

  const quadrant = determineQuadrant(urgencyScore, importanceScore)
  const quadrantInfo = getQuadrantInfo(quadrant)

  // Generate recommendation
  let recommendation = ""
  if (quadrant === "do_first") {
    recommendation = "Priorité maximale - à traiter aujourd'hui"
  } else if (quadrant === "schedule") {
    recommendation = "Important mais pas urgent - planifiez un créneau cette semaine"
  } else if (quadrant === "delegate") {
    recommendation = "Urgent mais peu important - pouvez-vous déléguer ?"
  } else {
    recommendation = "Ni urgent ni important - à reconsidérer"
  }

  // Add specific recommendations based on factors
  if (urgencyFactors.some(f => f.name === "En retard")) {
    recommendation = "⚠️ EN RETARD - " + recommendation
  }

  return {
    taskId: task.id,
    score: combinedScore,
    urgency: urgencyScore,
    importance: importanceScore,
    quadrant,
    factors: [...urgencyFactors, ...importanceFactors],
    recommendation,
  }
}

// ============================================================
// IMPLICIT DEADLINE DETECTION
// ============================================================

/**
 * Detect implicit deadlines from task text
 */
export function detectImplicitDeadline(task: Task): ImplicitDeadline | null {
  if (task.deadline) return null // Already has explicit deadline

  const text = `${task.title} ${task.description || ""}`.toLowerCase()
  const now = new Date()

  // Date patterns
  const patterns = [
    {
      regex: /aujourd'hui|ce soir|ce matin/i,
      days: 0,
      confidence: 0.9,
      reason: "Mentionné comme étant pour aujourd'hui",
    },
    {
      regex: /demain/i,
      days: 1,
      confidence: 0.9,
      reason: "Mentionné pour demain",
    },
    {
      regex: /après-demain/i,
      days: 2,
      confidence: 0.9,
      reason: "Mentionné pour après-demain",
    },
    {
      regex: /cette semaine|fin de semaine/i,
      days: 7,
      confidence: 0.7,
      reason: "Mentionné pour cette semaine",
    },
    {
      regex: /semaine prochaine/i,
      days: 14,
      confidence: 0.7,
      reason: "Mentionné pour la semaine prochaine",
    },
    {
      regex: /ce mois|fin du mois/i,
      days: 30,
      confidence: 0.6,
      reason: "Mentionné pour ce mois",
    },
    {
      regex: /lundi/i,
      days: getDaysUntilWeekday(1),
      confidence: 0.8,
      reason: "Lundi mentionné",
    },
    {
      regex: /mardi/i,
      days: getDaysUntilWeekday(2),
      confidence: 0.8,
      reason: "Mardi mentionné",
    },
    {
      regex: /mercredi/i,
      days: getDaysUntilWeekday(3),
      confidence: 0.8,
      reason: "Mercredi mentionné",
    },
    {
      regex: /jeudi/i,
      days: getDaysUntilWeekday(4),
      confidence: 0.8,
      reason: "Jeudi mentionné",
    },
    {
      regex: /vendredi/i,
      days: getDaysUntilWeekday(5),
      confidence: 0.8,
      reason: "Vendredi mentionné",
    },
    {
      regex: /samedi/i,
      days: getDaysUntilWeekday(6),
      confidence: 0.8,
      reason: "Samedi mentionné",
    },
    {
      regex: /dimanche/i,
      days: getDaysUntilWeekday(0),
      confidence: 0.8,
      reason: "Dimanche mentionné",
    },
  ]

  for (const { regex, days, confidence, reason } of patterns) {
    if (regex.test(text)) {
      const deadline = new Date(now)
      deadline.setDate(deadline.getDate() + days)
      deadline.setHours(18, 0, 0, 0) // Default to 6 PM

      return {
        taskId: task.id,
        suggestedDeadline: deadline,
        confidence,
        reason,
      }
    }
  }

  // Category-based implicit deadlines
  if (task.category === "administratif") {
    // Administrative tasks often have monthly cycles
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      taskId: task.id,
      suggestedDeadline: endOfMonth,
      confidence: 0.4,
      reason: "Tâche administrative - fin de mois suggérée",
    }
  }

  // Health appointments often need scheduling soon
  if (task.category === "sante" || /médecin|docteur|rdv/i.test(text)) {
    const twoWeeks = new Date(now)
    twoWeeks.setDate(twoWeeks.getDate() + 14)
    return {
      taskId: task.id,
      suggestedDeadline: twoWeeks,
      confidence: 0.5,
      reason: "Tâche santé - 2 semaines suggérées",
    }
  }

  return null
}

/**
 * Get days until next occurrence of weekday
 */
function getDaysUntilWeekday(targetDay: number): number {
  const today = new Date().getDay()
  let diff = targetDay - today
  if (diff <= 0) diff += 7 // Next week if already passed
  return diff
}

// ============================================================
// BATCH PRIORITIZATION
// ============================================================

/**
 * Prioritize multiple tasks at once
 */
export function prioritizeTasks(tasks: Task[]): PrioritizedList {
  // Filter out completed tasks
  const pendingTasks = tasks.filter(t => t.status !== "done")

  // Calculate scores for all tasks
  const scores = pendingTasks.map(task => calculatePriorityScore(task))

  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score)

  // Count quadrants
  const summary = {
    doFirst: scores.filter(s => s.quadrant === "do_first").length,
    schedule: scores.filter(s => s.quadrant === "schedule").length,
    delegate: scores.filter(s => s.quadrant === "delegate").length,
    eliminate: scores.filter(s => s.quadrant === "eliminate").length,
  }

  // Get top priorities (max 5)
  const topPriority = scores.slice(0, 5)

  // Generate warnings
  const warnings: string[] = []

  if (summary.doFirst > 5) {
    warnings.push(`⚠️ ${summary.doFirst} tâches urgentes et importantes - risque de surcharge`)
  }

  const overdue = scores.filter(s => s.factors.some(f => f.name === "En retard"))
  if (overdue.length > 0) {
    warnings.push(`⏰ ${overdue.length} tâche(s) en retard`)
  }

  if (summary.eliminate > summary.doFirst + summary.schedule) {
    warnings.push("💡 Beaucoup de tâches de faible priorité - nettoyage recommandé")
  }

  return {
    tasks: scores,
    summary,
    topPriority,
    warnings,
  }
}

/**
 * Get top N priority tasks
 */
export function getTopPriorityTasks(tasks: Task[], count: number = 3): Task[] {
  const prioritized = prioritizeTasks(tasks)
  const topIds = prioritized.tasks.slice(0, count).map(s => s.taskId)
  return tasks.filter(t => topIds.includes(t.id))
}

// ============================================================
// PRIORITY RECOMMENDATIONS
// ============================================================

/**
 * Generate priority recommendations for a task
 */
export function generateRecommendations(task: Task, score: PriorityScore): string[] {
  const recommendations: string[] = []

  // Based on quadrant
  if (score.quadrant === "do_first") {
    recommendations.push("À traiter en priorité aujourd'hui")
    if (!task.deadline) {
      recommendations.push("Ajoutez une deadline pour mieux suivre")
    }
  } else if (score.quadrant === "schedule") {
    recommendations.push("Planifiez cette tâche dans votre agenda")
    recommendations.push("Réservez un créneau dédié cette semaine")
  } else if (score.quadrant === "delegate") {
    recommendations.push("Cette tâche pourrait être déléguée")
    if (!task.assignedTo) {
      recommendations.push("Assignez-la à un autre membre du foyer")
    }
  } else {
    recommendations.push("Reconsidérez la nécessité de cette tâche")
    recommendations.push("Peut-être à supprimer ou reporter")
  }

  // Based on factors
  if (score.factors.some(f => f.name === "En retard")) {
    recommendations.unshift("⚠️ Tâche en retard - action immédiate requise")
  }

  if (score.urgency > 80 && score.importance < 50) {
    recommendations.push("Urgente mais pas critique - peut-être une fausse urgence ?")
  }

  if (task.loadWeight && task.loadWeight >= 4) {
    recommendations.push("Tâche lourde mentalement - divisez-la si possible")
  }

  return recommendations.slice(0, 4)
}

// ============================================================
// TASK PRIORITIZER CLASS
// ============================================================

export class TaskPrioritizer {
  private tasks: Task[]

  constructor(tasks: Task[] = []) {
    this.tasks = tasks
  }

  /**
   * Update tasks
   */
  setTasks(tasks: Task[]): void {
    this.tasks = tasks
  }

  /**
   * Add a task
   */
  addTask(task: Task): void {
    this.tasks.push(task)
  }

  /**
   * Get prioritized list
   */
  getPrioritizedList(): PrioritizedList {
    return prioritizeTasks(this.tasks)
  }

  /**
   * Get score for a specific task
   */
  getTaskScore(taskId: string): PriorityScore | null {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return null
    return calculatePriorityScore(task)
  }

  /**
   * Get top priority tasks
   */
  getTopPriority(count: number = 3): Task[] {
    return getTopPriorityTasks(this.tasks, count)
  }

  /**
   * Get tasks by quadrant
   */
  getByQuadrant(quadrant: EisenhowerQuadrant): Task[] {
    const scores = this.tasks
      .filter(t => t.status !== "done")
      .map(t => ({ task: t, score: calculatePriorityScore(t) }))
      .filter(({ score }) => score.quadrant === quadrant)
      .sort((a, b) => b.score.score - a.score.score)

    return scores.map(s => s.task)
  }

  /**
   * Detect implicit deadlines for all tasks
   */
  detectImplicitDeadlines(): ImplicitDeadline[] {
    return this.tasks
      .filter(t => t.status !== "done" && !t.deadline)
      .map(t => detectImplicitDeadline(t))
      .filter((d): d is ImplicitDeadline => d !== null)
  }

  /**
   * Get recommendations for a task
   */
  getRecommendations(taskId: string): string[] {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return []

    const score = calculatePriorityScore(task)
    return generateRecommendations(task, score)
  }

  /**
   * Get daily focus (tasks to focus on today)
   */
  getDailyFocus(): { mustDo: Task[]; shouldDo: Task[]; couldDo: Task[] } {
    const prioritized = prioritizeTasks(this.tasks)

    const mustDo = prioritized.tasks
      .filter(s => s.quadrant === "do_first" || s.factors.some(f => f.name === "En retard"))
      .slice(0, 3)
      .map(s => this.tasks.find(t => t.id === s.taskId)!)
      .filter(Boolean)

    const shouldDo = prioritized.tasks
      .filter(s => s.quadrant === "schedule" && s.score >= 60)
      .slice(0, 2)
      .map(s => this.tasks.find(t => t.id === s.taskId)!)
      .filter(Boolean)

    const couldDo = prioritized.tasks
      .filter(s => s.quadrant === "delegate" || s.quadrant === "eliminate")
      .slice(0, 2)
      .map(s => this.tasks.find(t => t.id === s.taskId)!)
      .filter(Boolean)

    return { mustDo, shouldDo, couldDo }
  }
}

/**
 * Create a task prioritizer instance
 */
export function createTaskPrioritizer(tasks: Task[] = []): TaskPrioritizer {
  return new TaskPrioritizer(tasks)
}
