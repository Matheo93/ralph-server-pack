/**
 * Task Generator - Converts voice transcriptions into actionable tasks
 * Handles child matching, deadline inference, category detection, and assignee suggestion
 *
 * @module voice/task-generator
 */

import { z } from 'zod';
import type {
  ExtractionResult,
  TaskCategory,
  UrgencyLevel,
  HouseholdContext,
  SupportedLanguage
} from './semantic-extractor';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Task priority levels
 */
export const TaskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

/**
 * Task status
 */
export const TaskStatusSchema = z.enum([
  'draft',      // Created from voice, not yet confirmed
  'pending',    // Confirmed, waiting to be done
  'assigned',   // Assigned to someone
  'in_progress',
  'completed',
  'cancelled'
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Recurrence pattern
 */
export const RecurrencePatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  interval: z.number().min(1).default(1),          // Every N days/weeks/months
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),  // For weekly: 0=Sun, 6=Sat
  dayOfMonth: z.number().min(1).max(31).optional(), // For monthly
  endDate: z.date().optional(),
  occurrences: z.number().optional()               // Max number of occurrences
});
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;

/**
 * Charge weight for load distribution
 */
export const ChargeWeightSchema = z.object({
  mentalLoad: z.number().min(0).max(10),     // Mental/planning effort
  timeLoad: z.number().min(0).max(10),       // Time required
  emotionalLoad: z.number().min(0).max(10),  // Emotional effort
  physicalLoad: z.number().min(0).max(10),   // Physical effort
  totalWeight: z.number().min(0).max(40)
});
export type ChargeWeight = z.infer<typeof ChargeWeightSchema>;

/**
 * Generated task preview (before confirmation)
 */
export const TaskPreviewSchema = z.object({
  id: z.string(),
  extractionId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  priority: TaskPrioritySchema,
  dueDate: z.date().nullable(),
  isRecurring: z.boolean(),
  recurrence: RecurrencePatternSchema.optional(),
  childId: z.string().nullable(),
  childName: z.string().nullable(),
  suggestedAssigneeId: z.string().nullable(),
  suggestedAssigneeName: z.string().nullable(),
  chargeWeight: ChargeWeightSchema,
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  alternativeTitles: z.array(z.string()),
  generatedAt: z.date()
});
export type TaskPreview = z.infer<typeof TaskPreviewSchema>;

/**
 * Confirmed task ready for creation
 */
export const GeneratedTaskSchema = z.object({
  id: z.string(),
  previewId: z.string(),
  householdId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  dueDate: z.date().nullable(),
  isRecurring: z.boolean(),
  recurrence: RecurrencePatternSchema.optional(),
  childId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  createdById: z.string(),
  chargeWeight: ChargeWeightSchema,
  source: z.literal('voice'),
  voiceMetadata: z.object({
    extractionId: z.string(),
    originalText: z.string(),
    language: z.string(),
    confidence: z.number()
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type GeneratedTask = z.infer<typeof GeneratedTaskSchema>;

/**
 * Assignee candidate with score
 */
export const AssigneeCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  currentLoad: z.number(),
  recentCompletions: z.number(),
  categoryExpertise: z.number()
});
export type AssigneeCandidate = z.infer<typeof AssigneeCandidateSchema>;

/**
 * Generator configuration
 */
export const GeneratorConfigSchema = z.object({
  defaultPriority: TaskPrioritySchema.default('medium'),
  defaultDueDays: z.number().default(7),           // Default days until due if no date extracted
  minConfidenceForAutoTitle: z.number().default(0.7),
  enableAutoAssignment: z.boolean().default(false),
  enableChargeCalculation: z.boolean().default(true),
  language: z.string().default('fr')
});
export type GeneratorConfig = z.infer<typeof GeneratorConfigSchema>;

/**
 * Task generator store
 */
export const TaskGeneratorStoreSchema = z.object({
  previews: z.map(z.string(), TaskPreviewSchema),
  confirmedTasks: z.map(z.string(), GeneratedTaskSchema),
  pendingConfirmation: z.set(z.string()),
  stats: z.object({
    totalPreviews: z.number(),
    confirmedTasks: z.number(),
    cancelledTasks: z.number(),
    averageConfidence: z.number()
  })
});
export type TaskGeneratorStore = z.infer<typeof TaskGeneratorStoreSchema>;

// =============================================================================
// CHARGE WEIGHT DEFINITIONS
// =============================================================================

/**
 * Default charge weights by category
 */
const CATEGORY_CHARGE_WEIGHTS: Record<TaskCategory, Omit<ChargeWeight, 'totalWeight'>> = {
  health: { mentalLoad: 7, timeLoad: 5, emotionalLoad: 6, physicalLoad: 2 },
  education: { mentalLoad: 6, timeLoad: 4, emotionalLoad: 5, physicalLoad: 1 },
  activities: { mentalLoad: 4, timeLoad: 5, emotionalLoad: 3, physicalLoad: 4 },
  administrative: { mentalLoad: 8, timeLoad: 3, emotionalLoad: 4, physicalLoad: 1 },
  household: { mentalLoad: 3, timeLoad: 5, emotionalLoad: 2, physicalLoad: 6 },
  transport: { mentalLoad: 2, timeLoad: 6, emotionalLoad: 2, physicalLoad: 3 },
  social: { mentalLoad: 4, timeLoad: 4, emotionalLoad: 5, physicalLoad: 2 },
  finance: { mentalLoad: 7, timeLoad: 2, emotionalLoad: 4, physicalLoad: 1 },
  clothing: { mentalLoad: 3, timeLoad: 4, emotionalLoad: 2, physicalLoad: 3 },
  food: { mentalLoad: 3, timeLoad: 5, emotionalLoad: 2, physicalLoad: 4 },
  hygiene: { mentalLoad: 2, timeLoad: 3, emotionalLoad: 3, physicalLoad: 3 },
  sleep: { mentalLoad: 3, timeLoad: 4, emotionalLoad: 4, physicalLoad: 2 },
  other: { mentalLoad: 4, timeLoad: 4, emotionalLoad: 3, physicalLoad: 3 }
};

/**
 * Priority multipliers for charge weight
 */
const PRIORITY_MULTIPLIERS: Record<TaskPriority, number> = {
  critical: 1.5,
  high: 1.2,
  medium: 1.0,
  low: 0.8
};

/**
 * Urgency to priority mapping
 */
const URGENCY_TO_PRIORITY: Record<UrgencyLevel, TaskPriority> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  none: 'medium'
};

// =============================================================================
// TITLE GENERATION TEMPLATES
// =============================================================================

/**
 * Title templates by language and category
 */
const TITLE_TEMPLATES: Record<SupportedLanguage, Record<TaskCategory, readonly string[]>> = {
  fr: {
    health: [
      'RDV {action} pour {child}',
      '{action} - {child}',
      'Santé: {action}'
    ],
    education: [
      '{action} - école de {child}',
      'Scolarité: {action}',
      '{action} pour {child}'
    ],
    activities: [
      '{action} - {child}',
      'Activité: {action}',
      '{child}: {action}'
    ],
    administrative: [
      'Admin: {action}',
      '{action} - papiers',
      'Démarche: {action}'
    ],
    household: [
      'Maison: {action}',
      '{action}',
      'À faire: {action}'
    ],
    transport: [
      'Emmener {child} {action}',
      'Transport: {action}',
      '{action} {child}'
    ],
    social: [
      '{action} - {child}',
      'Social: {action}',
      'Événement: {action}'
    ],
    finance: [
      'Payer: {action}',
      'Finance: {action}',
      '{action}'
    ],
    clothing: [
      'Vêtements: {action} pour {child}',
      '{action} - {child}',
      'Acheter: {action}'
    ],
    food: [
      'Repas: {action}',
      '{action}',
      'Cuisine: {action}'
    ],
    hygiene: [
      'Hygiène: {action} pour {child}',
      '{action} - {child}',
      '{child}: {action}'
    ],
    sleep: [
      'Sommeil: {action}',
      '{action} - {child}',
      'Routine: {action}'
    ],
    other: [
      '{action}',
      'À faire: {action}',
      'Tâche: {action}'
    ]
  },
  en: {
    health: [
      'Appointment: {action} for {child}',
      '{action} - {child}',
      'Health: {action}'
    ],
    education: [
      '{action} - {child}\'s school',
      'Education: {action}',
      '{action} for {child}'
    ],
    activities: [
      '{action} - {child}',
      'Activity: {action}',
      '{child}: {action}'
    ],
    administrative: [
      'Admin: {action}',
      '{action} - paperwork',
      'Task: {action}'
    ],
    household: [
      'Home: {action}',
      '{action}',
      'To do: {action}'
    ],
    transport: [
      'Take {child} {action}',
      'Transport: {action}',
      '{action} {child}'
    ],
    social: [
      '{action} - {child}',
      'Social: {action}',
      'Event: {action}'
    ],
    finance: [
      'Pay: {action}',
      'Finance: {action}',
      '{action}'
    ],
    clothing: [
      'Clothes: {action} for {child}',
      '{action} - {child}',
      'Buy: {action}'
    ],
    food: [
      'Meal: {action}',
      '{action}',
      'Cooking: {action}'
    ],
    hygiene: [
      'Hygiene: {action} for {child}',
      '{action} - {child}',
      '{child}: {action}'
    ],
    sleep: [
      'Sleep: {action}',
      '{action} - {child}',
      'Routine: {action}'
    ],
    other: [
      '{action}',
      'To do: {action}',
      'Task: {action}'
    ]
  },
  es: {
    health: ['Cita: {action} para {child}', '{action} - {child}', 'Salud: {action}'],
    education: ['{action} - escuela de {child}', 'Educación: {action}', '{action} para {child}'],
    activities: ['{action} - {child}', 'Actividad: {action}', '{child}: {action}'],
    administrative: ['Admin: {action}', '{action} - papeles', 'Trámite: {action}'],
    household: ['Casa: {action}', '{action}', 'Por hacer: {action}'],
    transport: ['Llevar a {child} {action}', 'Transporte: {action}', '{action} {child}'],
    social: ['{action} - {child}', 'Social: {action}', 'Evento: {action}'],
    finance: ['Pagar: {action}', 'Finanzas: {action}', '{action}'],
    clothing: ['Ropa: {action} para {child}', '{action} - {child}', 'Comprar: {action}'],
    food: ['Comida: {action}', '{action}', 'Cocina: {action}'],
    hygiene: ['Higiene: {action} para {child}', '{action} - {child}', '{child}: {action}'],
    sleep: ['Sueño: {action}', '{action} - {child}', 'Rutina: {action}'],
    other: ['{action}', 'Por hacer: {action}', 'Tarea: {action}']
  },
  de: {
    health: ['Termin: {action} für {child}', '{action} - {child}', 'Gesundheit: {action}'],
    education: ['{action} - Schule von {child}', 'Bildung: {action}', '{action} für {child}'],
    activities: ['{action} - {child}', 'Aktivität: {action}', '{child}: {action}'],
    administrative: ['Admin: {action}', '{action} - Papiere', 'Aufgabe: {action}'],
    household: ['Haushalt: {action}', '{action}', 'Zu erledigen: {action}'],
    transport: ['{child} bringen {action}', 'Transport: {action}', '{action} {child}'],
    social: ['{action} - {child}', 'Sozial: {action}', 'Ereignis: {action}'],
    finance: ['Bezahlen: {action}', 'Finanzen: {action}', '{action}'],
    clothing: ['Kleidung: {action} für {child}', '{action} - {child}', 'Kaufen: {action}'],
    food: ['Essen: {action}', '{action}', 'Kochen: {action}'],
    hygiene: ['Hygiene: {action} für {child}', '{action} - {child}', '{child}: {action}'],
    sleep: ['Schlaf: {action}', '{action} - {child}', 'Routine: {action}'],
    other: ['{action}', 'Zu erledigen: {action}', 'Aufgabe: {action}']
  },
  it: {
    health: ['Appuntamento: {action} per {child}', '{action} - {child}', 'Salute: {action}'],
    education: ['{action} - scuola di {child}', 'Istruzione: {action}', '{action} per {child}'],
    activities: ['{action} - {child}', 'Attività: {action}', '{child}: {action}'],
    administrative: ['Admin: {action}', '{action} - documenti', 'Compito: {action}'],
    household: ['Casa: {action}', '{action}', 'Da fare: {action}'],
    transport: ['Portare {child} {action}', 'Trasporto: {action}', '{action} {child}'],
    social: ['{action} - {child}', 'Sociale: {action}', 'Evento: {action}'],
    finance: ['Pagare: {action}', 'Finanze: {action}', '{action}'],
    clothing: ['Vestiti: {action} per {child}', '{action} - {child}', 'Comprare: {action}'],
    food: ['Pasto: {action}', '{action}', 'Cucina: {action}'],
    hygiene: ['Igiene: {action} per {child}', '{action} - {child}', '{child}: {action}'],
    sleep: ['Sonno: {action}', '{action} - {child}', 'Routine: {action}'],
    other: ['{action}', 'Da fare: {action}', 'Compito: {action}']
  },
  pt: {
    health: ['Consulta: {action} para {child}', '{action} - {child}', 'Saúde: {action}'],
    education: ['{action} - escola de {child}', 'Educação: {action}', '{action} para {child}'],
    activities: ['{action} - {child}', 'Atividade: {action}', '{child}: {action}'],
    administrative: ['Admin: {action}', '{action} - papéis', 'Tarefa: {action}'],
    household: ['Casa: {action}', '{action}', 'A fazer: {action}'],
    transport: ['Levar {child} {action}', 'Transporte: {action}', '{action} {child}'],
    social: ['{action} - {child}', 'Social: {action}', 'Evento: {action}'],
    finance: ['Pagar: {action}', 'Finanças: {action}', '{action}'],
    clothing: ['Roupas: {action} para {child}', '{action} - {child}', 'Comprar: {action}'],
    food: ['Refeição: {action}', '{action}', 'Cozinha: {action}'],
    hygiene: ['Higiene: {action} para {child}', '{action} - {child}', '{child}: {action}'],
    sleep: ['Sono: {action}', '{action} - {child}', 'Rotina: {action}'],
    other: ['{action}', 'A fazer: {action}', 'Tarefa: {action}']
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calculate charge weight from category and priority
 */
export function calculateChargeWeight(
  category: TaskCategory,
  priority: TaskPriority
): ChargeWeight {
  const baseWeight = CATEGORY_CHARGE_WEIGHTS[category];
  const multiplier = PRIORITY_MULTIPLIERS[priority];

  const mentalLoad = Math.round(baseWeight.mentalLoad * multiplier * 10) / 10;
  const timeLoad = Math.round(baseWeight.timeLoad * multiplier * 10) / 10;
  const emotionalLoad = Math.round(baseWeight.emotionalLoad * multiplier * 10) / 10;
  const physicalLoad = Math.round(baseWeight.physicalLoad * multiplier * 10) / 10;

  return {
    mentalLoad: Math.min(10, mentalLoad),
    timeLoad: Math.min(10, timeLoad),
    emotionalLoad: Math.min(10, emotionalLoad),
    physicalLoad: Math.min(10, physicalLoad),
    totalWeight: Math.min(40, mentalLoad + timeLoad + emotionalLoad + physicalLoad)
  };
}

/**
 * Generate task title from extraction
 */
export function generateTitle(
  extraction: ExtractionResult,
  household: HouseholdContext
): { title: string; alternatives: string[] } {
  const language = extraction.language as SupportedLanguage;
  const category = extraction.category.primary as TaskCategory;
  const templates = TITLE_TEMPLATES[language]?.[category] || TITLE_TEMPLATES['fr'][category];

  // Get action text
  const actionText = extraction.action.normalized || extraction.action.raw;

  // Get child name if available
  const childName = extraction.child?.matchedName || '';

  // Generate titles from templates
  const titles: string[] = [];

  for (const template of templates) {
    let title = template
      .replace('{action}', actionText)
      .replace('{child}', childName);

    // Clean up if no child
    if (!childName) {
      title = title
        .replace(' pour ', ' ')
        .replace(' - ', ': ')
        .replace('  ', ' ')
        .replace(/^\s*-\s*/, '')
        .replace(/\s*-\s*$/, '');
    }

    // Capitalize and clean
    title = capitalizeFirst(title.trim());

    if (title && !titles.includes(title)) {
      titles.push(title);
    }
  }

  // Use first title as main, rest as alternatives
  const mainTitle = titles[0] || capitalizeFirst(actionText);
  const alternatives = titles.slice(1);

  return { title: mainTitle, alternatives };
}

/**
 * Infer deadline from extraction
 */
export function inferDeadline(
  extraction: ExtractionResult,
  config: GeneratorConfig
): Date | null {
  // If date was extracted, use it
  if (extraction.date.parsed) {
    return extraction.date.parsed;
  }

  // If critical urgency, set for today
  if (extraction.urgency.level === 'critical') {
    return new Date();
  }

  // If high urgency, set for 3 days
  if (extraction.urgency.level === 'high') {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date;
  }

  // If medium urgency, use default
  if (extraction.urgency.level === 'medium') {
    const date = new Date();
    date.setDate(date.getDate() + config.defaultDueDays);
    return date;
  }

  // No deadline for low urgency or none
  return null;
}

/**
 * Parse recurrence pattern from extraction
 */
export function parseRecurrence(
  extraction: ExtractionResult
): RecurrencePattern | undefined {
  if (extraction.date.type !== 'recurring' || !extraction.date.recurrence) {
    return undefined;
  }

  const recurrenceType = extraction.date.recurrence;

  switch (recurrenceType) {
    case 'daily':
      return { type: 'daily', interval: 1 };
    case 'weekly':
      return { type: 'weekly', interval: 1 };
    case 'monthly':
      return { type: 'monthly', interval: 1 };
    default:
      return { type: 'custom', interval: 1 };
  }
}

// =============================================================================
// ASSIGNEE SUGGESTION
// =============================================================================

/**
 * Workload data for assignee calculation
 */
export interface ParentWorkload {
  parentId: string;
  parentName: string;
  currentWeekLoad: number;
  categoryLoads: Record<string, number>;
  recentCompletions: number;
  isOnExclusion: boolean;
}

/**
 * Suggest best assignee for a task
 */
export function suggestAssignee(
  extraction: ExtractionResult,
  household: HouseholdContext,
  workloads: readonly ParentWorkload[]
): AssigneeCandidate | null {
  if (household.parents.length === 0) {
    return null;
  }

  const candidates: AssigneeCandidate[] = [];
  const category = extraction.category.primary;

  for (const parent of household.parents) {
    const workload = workloads.find(w => w.parentId === parent.id);
    const reasons: string[] = [];
    let score = 0.5; // Base score

    // Skip if on exclusion period
    if (workload?.isOnExclusion) {
      continue;
    }

    // Factor 1: Current load (lower is better)
    if (workload) {
      const loadFactor = Math.max(0, 1 - workload.currentWeekLoad / 100);
      score += loadFactor * 0.3;
      if (loadFactor > 0.5) {
        reasons.push('Has capacity this week');
      }
    }

    // Factor 2: Category expertise
    const categoryLoad = workload?.categoryLoads[category] || 0;
    const totalCategoryLoad = workloads.reduce((sum, w) => sum + (w.categoryLoads[category] || 0), 0);
    const categoryExpertise = totalCategoryLoad > 0 ? categoryLoad / totalCategoryLoad : 0.5;
    score += categoryExpertise * 0.2;
    if (categoryExpertise > 0.6) {
      reasons.push(`Usually handles ${category} tasks`);
    }

    // Factor 3: Recent completions (active parents get bonus)
    if (workload && workload.recentCompletions > 5) {
      score += 0.1;
      reasons.push('Active contributor');
    }

    // Factor 4: Balance (prefer less loaded parent)
    const otherParents = workloads.filter(w => w.parentId !== parent.id);
    const avgOtherLoad = otherParents.reduce((sum, w) => sum + w.currentWeekLoad, 0) / Math.max(1, otherParents.length);
    if (workload && workload.currentWeekLoad < avgOtherLoad) {
      score += 0.1;
      reasons.push('Lower current workload');
    }

    candidates.push({
      id: parent.id,
      name: parent.name,
      role: parent.role,
      score: Math.min(1, score),
      reasons,
      currentLoad: workload?.currentWeekLoad || 0,
      recentCompletions: workload?.recentCompletions || 0,
      categoryExpertise
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

// =============================================================================
// STORE CREATION
// =============================================================================

/**
 * Create a new task generator store
 */
export function createTaskGeneratorStore(): TaskGeneratorStore {
  return {
    previews: new Map(),
    confirmedTasks: new Map(),
    pendingConfirmation: new Set(),
    stats: {
      totalPreviews: 0,
      confirmedTasks: 0,
      cancelledTasks: 0,
      averageConfidence: 0
    }
  };
}

// =============================================================================
// TASK GENERATION
// =============================================================================

/**
 * Generate task preview from extraction
 */
export function generateTaskPreview(
  extraction: ExtractionResult,
  household: HouseholdContext,
  workloads: readonly ParentWorkload[] = [],
  config: GeneratorConfig = {
    defaultPriority: 'medium',
    defaultDueDays: 7,
    minConfidenceForAutoTitle: 0.7,
    enableAutoAssignment: false,
    enableChargeCalculation: true,
    language: 'fr'
  }
): TaskPreview {
  const id = generateId();
  const warnings: string[] = [];

  // Generate title
  const { title, alternatives } = generateTitle(extraction, household);

  // Determine priority from urgency
  const priority = URGENCY_TO_PRIORITY[extraction.urgency.level];

  // Infer deadline
  const dueDate = inferDeadline(extraction, config);

  // Check for recurrence
  const recurrence = parseRecurrence(extraction);
  const isRecurring = recurrence !== undefined;

  // Calculate charge weight
  const category = extraction.category.primary as TaskCategory;
  const chargeWeight = config.enableChargeCalculation
    ? calculateChargeWeight(category, priority)
    : { mentalLoad: 0, timeLoad: 0, emotionalLoad: 0, physicalLoad: 0, totalWeight: 0 };

  // Suggest assignee if enabled
  let suggestedAssigneeId: string | null = null;
  let suggestedAssigneeName: string | null = null;

  if (config.enableAutoAssignment && workloads.length > 0) {
    const suggested = suggestAssignee(extraction, household, workloads);
    if (suggested) {
      suggestedAssigneeId = suggested.id;
      suggestedAssigneeName = suggested.name;
    }
  }

  // Add warnings for low confidence extractions
  if (extraction.overallConfidence < 0.5) {
    warnings.push('Low overall confidence - please review all fields');
  }

  if (extraction.child && !extraction.child.matchedId) {
    warnings.push(`Child "${extraction.child.raw}" not found in household`);
  }

  if (!dueDate && extraction.urgency.level !== 'low' && extraction.urgency.level !== 'none') {
    warnings.push('No deadline could be inferred');
  }

  return {
    id,
    extractionId: extraction.id,
    title,
    description: extraction.originalText,
    category,
    priority,
    dueDate,
    isRecurring,
    recurrence,
    childId: extraction.child?.matchedId || null,
    childName: extraction.child?.matchedName || null,
    suggestedAssigneeId,
    suggestedAssigneeName,
    chargeWeight,
    confidence: extraction.overallConfidence,
    warnings,
    alternativeTitles: alternatives,
    generatedAt: new Date()
  };
}

/**
 * Add preview to store
 */
export function addPreview(
  store: TaskGeneratorStore,
  preview: TaskPreview
): TaskGeneratorStore {
  const newPreviews = new Map(store.previews);
  newPreviews.set(preview.id, preview);

  const newPending = new Set(store.pendingConfirmation);
  newPending.add(preview.id);

  // Update stats
  const totalPreviews = store.stats.totalPreviews + 1;
  const newAvgConfidence = (store.stats.averageConfidence * store.stats.totalPreviews + preview.confidence) / totalPreviews;

  return {
    ...store,
    previews: newPreviews,
    pendingConfirmation: newPending,
    stats: {
      ...store.stats,
      totalPreviews,
      averageConfidence: newAvgConfidence
    }
  };
}

/**
 * Confirm a task preview (convert to generated task)
 */
export function confirmTask(
  store: TaskGeneratorStore,
  previewId: string,
  householdId: string,
  createdById: string,
  overrides?: Partial<{
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: Date | null;
    childId: string | null;
    assigneeId: string | null;
  }>
): { store: TaskGeneratorStore; task: GeneratedTask | null } {
  const preview = store.previews.get(previewId);

  if (!preview) {
    return { store, task: null };
  }

  // Get extraction info from preview
  const voiceMetadata = {
    extractionId: preview.extractionId,
    originalText: preview.description || '',
    language: 'fr', // Default, should be from extraction
    confidence: preview.confidence
  };

  const task: GeneratedTask = {
    id: generateId(),
    previewId,
    householdId,
    title: overrides?.title || preview.title,
    description: overrides?.description || preview.description,
    category: preview.category,
    priority: overrides?.priority || preview.priority,
    status: overrides?.assigneeId ? 'assigned' : 'pending',
    dueDate: overrides?.dueDate !== undefined ? overrides.dueDate : preview.dueDate,
    isRecurring: preview.isRecurring,
    recurrence: preview.recurrence,
    childId: overrides?.childId !== undefined ? overrides.childId : preview.childId,
    assigneeId: overrides?.assigneeId !== undefined ? overrides.assigneeId : preview.suggestedAssigneeId,
    createdById,
    chargeWeight: preview.chargeWeight,
    source: 'voice',
    voiceMetadata,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const newConfirmedTasks = new Map(store.confirmedTasks);
  newConfirmedTasks.set(task.id, task);

  const newPending = new Set(store.pendingConfirmation);
  newPending.delete(previewId);

  return {
    store: {
      ...store,
      confirmedTasks: newConfirmedTasks,
      pendingConfirmation: newPending,
      stats: {
        ...store.stats,
        confirmedTasks: store.stats.confirmedTasks + 1
      }
    },
    task
  };
}

/**
 * Cancel a task preview
 */
export function cancelPreview(
  store: TaskGeneratorStore,
  previewId: string
): TaskGeneratorStore {
  const newPending = new Set(store.pendingConfirmation);
  newPending.delete(previewId);

  return {
    ...store,
    pendingConfirmation: newPending,
    stats: {
      ...store.stats,
      cancelledTasks: store.stats.cancelledTasks + 1
    }
  };
}

/**
 * Update a preview before confirmation
 */
export function updatePreview(
  store: TaskGeneratorStore,
  previewId: string,
  updates: Partial<{
    title: string;
    description: string;
    category: string;
    priority: TaskPriority;
    dueDate: Date | null;
    childId: string | null;
    childName: string | null;
    suggestedAssigneeId: string | null;
    suggestedAssigneeName: string | null;
  }>
): TaskGeneratorStore {
  const preview = store.previews.get(previewId);

  if (!preview) {
    return store;
  }

  const updatedPreview: TaskPreview = {
    ...preview,
    ...updates,
    // Recalculate charge if category or priority changed
    chargeWeight: (updates.category || updates.priority)
      ? calculateChargeWeight(
          (updates.category as TaskCategory) || (preview.category as TaskCategory),
          updates.priority || preview.priority
        )
      : preview.chargeWeight
  };

  const newPreviews = new Map(store.previews);
  newPreviews.set(previewId, updatedPreview);

  return {
    ...store,
    previews: newPreviews
  };
}

// =============================================================================
// STORE QUERIES
// =============================================================================

/**
 * Get preview by ID
 */
export function getPreview(
  store: TaskGeneratorStore,
  previewId: string
): TaskPreview | undefined {
  return store.previews.get(previewId);
}

/**
 * Get all pending previews
 */
export function getPendingPreviews(
  store: TaskGeneratorStore
): readonly TaskPreview[] {
  return Array.from(store.pendingConfirmation)
    .map(id => store.previews.get(id))
    .filter((p): p is TaskPreview => p !== undefined);
}

/**
 * Get confirmed task by ID
 */
export function getConfirmedTask(
  store: TaskGeneratorStore,
  taskId: string
): GeneratedTask | undefined {
  return store.confirmedTasks.get(taskId);
}

/**
 * Get all confirmed tasks
 */
export function getConfirmedTasks(
  store: TaskGeneratorStore,
  filters?: {
    householdId?: string;
    childId?: string;
    assigneeId?: string;
    category?: string;
    status?: TaskStatus;
  }
): readonly GeneratedTask[] {
  let tasks = Array.from(store.confirmedTasks.values());

  if (filters) {
    if (filters.householdId) {
      tasks = tasks.filter(t => t.householdId === filters.householdId);
    }
    if (filters.childId) {
      tasks = tasks.filter(t => t.childId === filters.childId);
    }
    if (filters.assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    }
    if (filters.category) {
      tasks = tasks.filter(t => t.category === filters.category);
    }
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
  }

  return tasks;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Generate previews for multiple extractions
 */
export function generateBatchPreviews(
  extractions: readonly ExtractionResult[],
  household: HouseholdContext,
  workloads: readonly ParentWorkload[] = [],
  config?: GeneratorConfig
): readonly TaskPreview[] {
  return extractions.map(extraction =>
    generateTaskPreview(extraction, household, workloads, config)
  );
}

/**
 * Confirm multiple previews at once
 */
export function confirmBatchTasks(
  store: TaskGeneratorStore,
  previewIds: readonly string[],
  householdId: string,
  createdById: string
): { store: TaskGeneratorStore; tasks: readonly GeneratedTask[] } {
  let currentStore = store;
  const confirmedTasks: GeneratedTask[] = [];

  for (const previewId of previewIds) {
    const { store: newStore, task } = confirmTask(
      currentStore,
      previewId,
      householdId,
      createdById
    );
    currentStore = newStore;
    if (task) {
      confirmedTasks.push(task);
    }
  }

  return { store: currentStore, tasks: confirmedTasks };
}

// =============================================================================
// MOCK HELPERS FOR TESTING
// =============================================================================

/**
 * Create mock task preview for testing
 */
export function createMockPreview(
  extractionId: string = 'ext_mock',
  overrides?: Partial<TaskPreview>
): TaskPreview {
  const base: TaskPreview = {
    id: generateId(),
    extractionId,
    title: 'Mock Task',
    description: 'This is a mock task for testing',
    category: 'other',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRecurring: false,
    childId: null,
    childName: null,
    suggestedAssigneeId: null,
    suggestedAssigneeName: null,
    chargeWeight: { mentalLoad: 4, timeLoad: 4, emotionalLoad: 3, physicalLoad: 3, totalWeight: 14 },
    confidence: 0.75,
    warnings: [],
    alternativeTitles: ['Alternative Title 1', 'Alternative Title 2'],
    generatedAt: new Date()
  };

  return { ...base, ...overrides };
}

/**
 * Create mock generated task for testing
 */
export function createMockGeneratedTask(
  previewId: string = 'preview_mock',
  overrides?: Partial<GeneratedTask>
): GeneratedTask {
  const base: GeneratedTask = {
    id: generateId(),
    previewId,
    householdId: 'household_mock',
    title: 'Mock Generated Task',
    description: 'This is a mock generated task',
    category: 'other',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRecurring: false,
    childId: null,
    assigneeId: null,
    createdById: 'user_mock',
    chargeWeight: { mentalLoad: 4, timeLoad: 4, emotionalLoad: 3, physicalLoad: 3, totalWeight: 14 },
    source: 'voice',
    voiceMetadata: {
      extractionId: 'ext_mock',
      originalText: 'Mock voice command',
      language: 'fr',
      confidence: 0.75
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return { ...base, ...overrides };
}

/**
 * Create mock household context for testing
 */
export function createMockHouseholdContext(
  overrides?: Partial<HouseholdContext>
): HouseholdContext {
  return {
    householdId: 'household_mock',
    children: [
      { id: 'child_1', name: 'Lucas', nicknames: ['Lulu', 'Lou'], age: 8 },
      { id: 'child_2', name: 'Emma', nicknames: ['Mimi'], age: 5 }
    ],
    parents: [
      { id: 'parent_1', name: 'Sophie', role: 'mother' },
      { id: 'parent_2', name: 'Thomas', role: 'father' }
    ],
    ...overrides
  };
}

/**
 * Create mock parent workloads for testing
 */
export function createMockWorkloads(): ParentWorkload[] {
  return [
    {
      parentId: 'parent_1',
      parentName: 'Sophie',
      currentWeekLoad: 45,
      categoryLoads: { health: 8, education: 12, activities: 10, household: 15 },
      recentCompletions: 12,
      isOnExclusion: false
    },
    {
      parentId: 'parent_2',
      parentName: 'Thomas',
      currentWeekLoad: 35,
      categoryLoads: { health: 5, education: 8, activities: 12, transport: 10 },
      recentCompletions: 8,
      isOnExclusion: false
    }
  ];
}
