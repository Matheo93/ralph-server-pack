/**
 * Automatic Task Generator - Sprint 21 Phase 2
 *
 * Automatically generates tasks from catalog based on:
 * - Child age monitoring (triggers age-based milestones)
 * - Period-based triggering (seasonal tasks)
 * - Duplicate prevention
 * - Notification on new auto-tasks
 *
 * Functional, immutable pattern with Zod validation.
 */

import { z } from "zod";
import {
  type TaskTemplate,
  type TemplateStore,
  type CountryCode,
  type ChargeWeightTemplate,
  type AgeRange,
  calculateAgeInMonths,
  getLocalizedTitle,
  getLocalizedDescription,
  calculateTotalWeight,
  DEFAULT_CHARGE_WEIGHTS
} from "./task-templates";
import {
  type AgeMilestone,
  type AgeRuleStore,
  getMilestonesForAge,
  getUpcomingMilestones,
  getMissedMilestones,
  daysUntilMilestone,
  isMilestoneDueSoon,
  milestoneToTemplate
} from "./age-rules";
import {
  type PeriodRule,
  type PeriodRuleStore,
  getCurrentMonthRules,
  getUpcomingRules,
  getRulesForChildAge,
  shouldTriggerRule,
  calculateDueDate,
  periodRuleToTemplate
} from "./period-rules";

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Child context for task generation
 */
export const ChildContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthDate: z.date(),
  householdId: z.string(),
  country: z.enum(['FR', 'BE', 'CH', 'CA', 'GENERIC'])
});
export type ChildContext = z.infer<typeof ChildContextSchema>;

/**
 * Generated auto-task status
 */
export const AutoTaskStatusSchema = z.enum([
  'pending',        // Created, awaiting action
  'confirmed',      // User confirmed, task created
  'dismissed',      // User dismissed
  'completed',      // Task was completed
  'expired'         // Past due date, not acted on
]);
export type AutoTaskStatus = z.infer<typeof AutoTaskStatusSchema>;

/**
 * Auto-generated task
 */
export const AutoTaskSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['age_milestone', 'period_rule', 'template']),
  sourceId: z.string(),              // ID of milestone, rule, or template
  childId: z.string(),
  childName: z.string(),
  householdId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  dueDate: z.date().nullable(),
  chargeWeight: z.object({
    mental: z.number(),
    time: z.number(),
    emotional: z.number(),
    physical: z.number(),
    total: z.number()
  }),
  status: AutoTaskStatusSchema,
  mandatory: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  confirmedAt: z.date().nullable(),
  dismissedAt: z.date().nullable(),
  taskId: z.string().nullable()       // ID of created task if confirmed
});
export type AutoTask = z.infer<typeof AutoTaskSchema>;

/**
 * Generation result
 */
export const GenerationResultSchema = z.object({
  generated: z.array(AutoTaskSchema),
  skipped: z.array(z.object({
    sourceId: z.string(),
    reason: z.string()
  })),
  errors: z.array(z.object({
    sourceId: z.string(),
    error: z.string()
  }))
});
export type GenerationResult = z.infer<typeof GenerationResultSchema>;

/**
 * Auto task store
 */
export const AutoTaskStoreSchema = z.object({
  tasks: z.map(z.string(), AutoTaskSchema),
  byHousehold: z.map(z.string(), z.array(z.string())),
  byChild: z.map(z.string(), z.array(z.string())),
  bySource: z.map(z.string(), z.string()),  // sourceId -> autoTaskId (for duplicate check)
  completedSources: z.set(z.string()),       // Set of sourceIds already completed
  lastGeneration: z.date(),
  stats: z.object({
    totalGenerated: z.number(),
    totalConfirmed: z.number(),
    totalDismissed: z.number(),
    totalExpired: z.number()
  })
});
export type AutoTaskStore = z.infer<typeof AutoTaskStoreSchema>;

// =============================================================================
// CONSTANTS
// =============================================================================

export const AUTO_TASK_CONFIG = {
  lookAheadDays: 30,           // Days ahead to generate tasks
  ageTolerance: 1,             // Months tolerance for age matching
  maxTasksPerGeneration: 50,   // Max tasks to generate at once
  expirationDays: 30,          // Days after due date to mark as expired
  reminderDays: [14, 7, 3, 1]  // Days before to send reminders
} as const;

// =============================================================================
// STORE CREATION
// =============================================================================

/**
 * Create an empty auto task store
 */
export function createAutoTaskStore(): AutoTaskStore {
  return {
    tasks: new Map(),
    byHousehold: new Map(),
    byChild: new Map(),
    bySource: new Map(),
    completedSources: new Set(),
    lastGeneration: new Date(0),
    stats: {
      totalGenerated: 0,
      totalConfirmed: 0,
      totalDismissed: 0,
      totalExpired: 0
    }
  };
}

// =============================================================================
// AUTO TASK MANAGEMENT
// =============================================================================

/**
 * Add an auto task to the store
 */
export function addAutoTask(
  store: AutoTaskStore,
  task: AutoTask
): AutoTaskStore {
  const tasks = new Map(store.tasks);
  tasks.set(task.id, task);

  // Update household index
  const byHousehold = new Map(store.byHousehold);
  const householdList = byHousehold.get(task.householdId) || [];
  if (!householdList.includes(task.id)) {
    byHousehold.set(task.householdId, [...householdList, task.id]);
  }

  // Update child index
  const byChild = new Map(store.byChild);
  const childList = byChild.get(task.childId) || [];
  if (!childList.includes(task.id)) {
    byChild.set(task.childId, [...childList, task.id]);
  }

  // Update source index
  const bySource = new Map(store.bySource);
  const sourceKey = `${task.sourceType}_${task.sourceId}_${task.childId}`;
  bySource.set(sourceKey, task.id);

  return {
    ...store,
    tasks,
    byHousehold,
    byChild,
    bySource,
    stats: {
      ...store.stats,
      totalGenerated: store.stats.totalGenerated + 1
    }
  };
}

/**
 * Confirm an auto task (creates real task)
 */
export function confirmAutoTask(
  store: AutoTaskStore,
  taskId: string,
  createdTaskId: string
): AutoTaskStore {
  const task = store.tasks.get(taskId);
  if (!task || task.status !== 'pending') return store;

  const tasks = new Map(store.tasks);
  tasks.set(taskId, {
    ...task,
    status: 'confirmed',
    confirmedAt: new Date(),
    taskId: createdTaskId
  });

  // Mark source as completed
  const completedSources = new Set(store.completedSources);
  const sourceKey = `${task.sourceType}_${task.sourceId}_${task.childId}`;
  completedSources.add(sourceKey);

  return {
    ...store,
    tasks,
    completedSources,
    stats: {
      ...store.stats,
      totalConfirmed: store.stats.totalConfirmed + 1
    }
  };
}

/**
 * Dismiss an auto task
 */
export function dismissAutoTask(
  store: AutoTaskStore,
  taskId: string
): AutoTaskStore {
  const task = store.tasks.get(taskId);
  if (!task || task.status !== 'pending') return store;

  const tasks = new Map(store.tasks);
  tasks.set(taskId, {
    ...task,
    status: 'dismissed',
    dismissedAt: new Date()
  });

  return {
    ...store,
    tasks,
    stats: {
      ...store.stats,
      totalDismissed: store.stats.totalDismissed + 1
    }
  };
}

/**
 * Mark auto task as completed (when linked task is completed)
 */
export function completeAutoTask(
  store: AutoTaskStore,
  taskId: string
): AutoTaskStore {
  const task = store.tasks.get(taskId);
  if (!task) return store;

  const tasks = new Map(store.tasks);
  tasks.set(taskId, {
    ...task,
    status: 'completed'
  });

  // Mark source as completed
  const completedSources = new Set(store.completedSources);
  const sourceKey = `${task.sourceType}_${task.sourceId}_${task.childId}`;
  completedSources.add(sourceKey);

  return {
    ...store,
    tasks,
    completedSources
  };
}

/**
 * Expire old pending auto tasks
 */
export function expireOldTasks(
  store: AutoTaskStore,
  referenceDate: Date = new Date()
): AutoTaskStore {
  const expirationThreshold = new Date(referenceDate);
  expirationThreshold.setDate(expirationThreshold.getDate() - AUTO_TASK_CONFIG.expirationDays);

  const tasks = new Map(store.tasks);
  let expiredCount = 0;

  for (const [id, task] of tasks) {
    if (task.status !== 'pending') continue;

    if (task.dueDate && task.dueDate < expirationThreshold) {
      tasks.set(id, { ...task, status: 'expired' });
      expiredCount++;
    }
  }

  if (expiredCount === 0) return store;

  return {
    ...store,
    tasks,
    stats: {
      ...store.stats,
      totalExpired: store.stats.totalExpired + expiredCount
    }
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get auto task by ID
 */
export function getAutoTask(
  store: AutoTaskStore,
  taskId: string
): AutoTask | undefined {
  return store.tasks.get(taskId);
}

/**
 * Get pending auto tasks for a household
 */
export function getPendingTasksForHousehold(
  store: AutoTaskStore,
  householdId: string
): readonly AutoTask[] {
  const taskIds = store.byHousehold.get(householdId) || [];

  return taskIds
    .map(id => store.tasks.get(id))
    .filter((t): t is AutoTask => t !== undefined && t.status === 'pending')
    .sort((a, b) => {
      // Sort by priority first, then by due date
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    });
}

/**
 * Get pending auto tasks for a child
 */
export function getPendingTasksForChild(
  store: AutoTaskStore,
  childId: string
): readonly AutoTask[] {
  const taskIds = store.byChild.get(childId) || [];

  return taskIds
    .map(id => store.tasks.get(id))
    .filter((t): t is AutoTask => t !== undefined && t.status === 'pending')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    });
}

/**
 * Get critical pending tasks
 */
export function getCriticalPendingTasks(
  store: AutoTaskStore,
  householdId: string
): readonly AutoTask[] {
  return getPendingTasksForHousehold(store, householdId)
    .filter(t => t.priority === 'critical' || t.mandatory);
}

/**
 * Get tasks due soon
 */
export function getTasksDueSoon(
  store: AutoTaskStore,
  householdId: string,
  daysThreshold: number = 7
): readonly AutoTask[] {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);

  return getPendingTasksForHousehold(store, householdId)
    .filter(t => t.dueDate && t.dueDate <= threshold);
}

/**
 * Check if a source has been completed or has pending task
 */
export function isSourceProcessed(
  store: AutoTaskStore,
  sourceType: string,
  sourceId: string,
  childId: string
): boolean {
  const sourceKey = `${sourceType}_${sourceId}_${childId}`;
  return store.completedSources.has(sourceKey) || store.bySource.has(sourceKey);
}

// =============================================================================
// TASK GENERATION
// =============================================================================

/**
 * Generate auto task ID
 */
export function generateAutoTaskId(): string {
  return `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate auto task from age milestone
 */
export function generateFromMilestone(
  milestone: AgeMilestone,
  child: ChildContext,
  language: string = 'fr'
): AutoTask {
  const title = (milestone.name[language] || milestone.name['fr'] || '')
    .replace('{enfant}', child.name)
    .replace('{child}', child.name);

  const description = (milestone.description[language] || milestone.description['fr'] || '')
    .replace('{enfant}', child.name)
    .replace('{child}', child.name);

  const dueDate = new Date(child.birthDate);
  dueDate.setMonth(dueDate.getMonth() + milestone.ageMonths);

  const chargeWeight = milestone.type === 'vaccine' || milestone.type === 'health_checkup'
    ? DEFAULT_CHARGE_WEIGHTS.health
    : milestone.type === 'registration' || milestone.type === 'transition'
    ? DEFAULT_CHARGE_WEIGHTS.education
    : DEFAULT_CHARGE_WEIGHTS.administrative;

  return {
    id: generateAutoTaskId(),
    sourceType: 'age_milestone',
    sourceId: milestone.id,
    childId: child.id,
    childName: child.name,
    householdId: child.householdId,
    title,
    description,
    category: milestone.type === 'vaccine' || milestone.type === 'health_checkup'
      ? 'health'
      : milestone.type === 'registration' || milestone.type === 'transition'
      ? 'education'
      : 'administrative',
    priority: milestone.priority,
    dueDate,
    chargeWeight: {
      ...chargeWeight,
      total: calculateTotalWeight(chargeWeight)
    },
    status: 'pending',
    mandatory: milestone.mandatory,
    tags: [milestone.type, milestone.mandatory ? 'mandatory' : 'optional'],
    createdAt: new Date(),
    confirmedAt: null,
    dismissedAt: null,
    taskId: null
  };
}

/**
 * Generate auto task from period rule
 */
export function generateFromPeriodRule(
  rule: PeriodRule,
  child: ChildContext,
  year: number,
  language: string = 'fr'
): AutoTask {
  const title = (rule.name[language] || rule.name['fr'] || '')
    .replace('{enfant}', child.name)
    .replace('{child}', child.name);

  const description = (rule.description[language] || rule.description['fr'] || '')
    .replace('{enfant}', child.name)
    .replace('{child}', child.name);

  const dueDate = calculateDueDate(rule, year);

  const chargeWeight = DEFAULT_CHARGE_WEIGHTS[rule.category] || DEFAULT_CHARGE_WEIGHTS.seasonal;

  return {
    id: generateAutoTaskId(),
    sourceType: 'period_rule',
    sourceId: `${rule.id}_${year}`,
    childId: child.id,
    childName: child.name,
    householdId: child.householdId,
    title,
    description,
    category: rule.category,
    priority: rule.priority,
    dueDate,
    chargeWeight: {
      ...chargeWeight,
      total: calculateTotalWeight(chargeWeight)
    },
    status: 'pending',
    mandatory: rule.priority === 'critical',
    tags: [...rule.tags, rule.periodType],
    createdAt: new Date(),
    confirmedAt: null,
    dismissedAt: null,
    taskId: null
  };
}

/**
 * Generate all applicable tasks for a child
 */
export function generateTasksForChild(
  store: AutoTaskStore,
  ageRuleStore: AgeRuleStore,
  periodRuleStore: PeriodRuleStore,
  child: ChildContext,
  referenceDate: Date = new Date()
): { store: AutoTaskStore; result: GenerationResult } {
  const generated: AutoTask[] = [];
  const skipped: Array<{ sourceId: string; reason: string }> = [];
  const errors: Array<{ sourceId: string; error: string }> = [];

  const ageInMonths = calculateAgeInMonths(child.birthDate, referenceDate);
  const year = referenceDate.getFullYear();

  // Generate from age milestones
  const milestones = [
    ...getMilestonesForAge(ageRuleStore, ageInMonths, child.country),
    ...getUpcomingMilestones(ageRuleStore, ageInMonths, AUTO_TASK_CONFIG.lookAheadDays / 30, child.country)
  ];

  for (const milestone of milestones) {
    try {
      // Check if already processed
      if (isSourceProcessed(store, 'age_milestone', milestone.id, child.id)) {
        skipped.push({ sourceId: milestone.id, reason: 'Already processed' });
        continue;
      }

      // Check if due soon
      if (!isMilestoneDueSoon(child.birthDate, milestone, AUTO_TASK_CONFIG.lookAheadDays, referenceDate)) {
        skipped.push({ sourceId: milestone.id, reason: 'Not due yet' });
        continue;
      }

      const autoTask = generateFromMilestone(milestone, child);
      generated.push(autoTask);
    } catch (error) {
      errors.push({
        sourceId: milestone.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Generate from period rules
  const periodRules = getRulesForChildAge(periodRuleStore, ageInMonths, child.country);

  for (const rule of periodRules) {
    try {
      const sourceId = `${rule.id}_${year}`;

      // Check if already processed
      if (isSourceProcessed(store, 'period_rule', sourceId, child.id)) {
        skipped.push({ sourceId, reason: 'Already processed' });
        continue;
      }

      // Check if should trigger
      if (!shouldTriggerRule(rule, referenceDate)) {
        skipped.push({ sourceId, reason: 'Not in trigger window' });
        continue;
      }

      const autoTask = generateFromPeriodRule(rule, child, year);
      generated.push(autoTask);
    } catch (error) {
      errors.push({
        sourceId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Add all generated tasks to store
  let updatedStore = store;
  for (const task of generated.slice(0, AUTO_TASK_CONFIG.maxTasksPerGeneration)) {
    updatedStore = addAutoTask(updatedStore, task);
  }

  // Update last generation time
  updatedStore = {
    ...updatedStore,
    lastGeneration: referenceDate
  };

  return {
    store: updatedStore,
    result: { generated, skipped, errors }
  };
}

/**
 * Generate tasks for all children in a household
 */
export function generateTasksForHousehold(
  store: AutoTaskStore,
  ageRuleStore: AgeRuleStore,
  periodRuleStore: PeriodRuleStore,
  children: readonly ChildContext[],
  referenceDate: Date = new Date()
): { store: AutoTaskStore; results: Map<string, GenerationResult> } {
  let updatedStore = store;
  const results = new Map<string, GenerationResult>();

  for (const child of children) {
    const { store: newStore, result } = generateTasksForChild(
      updatedStore,
      ageRuleStore,
      periodRuleStore,
      child,
      referenceDate
    );
    updatedStore = newStore;
    results.set(child.id, result);
  }

  return { store: updatedStore, results };
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * Get tasks needing reminder
 */
export function getTasksNeedingReminder(
  store: AutoTaskStore,
  householdId: string,
  referenceDate: Date = new Date()
): readonly AutoTask[] {
  const pendingTasks = getPendingTasksForHousehold(store, householdId);

  return pendingTasks.filter(task => {
    if (!task.dueDate) return false;

    const daysUntilDue = Math.ceil(
      (task.dueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (AUTO_TASK_CONFIG.reminderDays as readonly number[]).includes(daysUntilDue);
  });
}

/**
 * Generate notification text for auto task
 */
export function generateNotificationText(
  task: AutoTask,
  language: string = 'fr'
): { title: string; body: string } {
  const daysUntilDue = task.dueDate
    ? Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (language === 'fr') {
    const urgency = daysUntilDue !== null && daysUntilDue <= 3
      ? ' (Urgent)'
      : daysUntilDue !== null && daysUntilDue <= 7
      ? ' (Bientôt)'
      : '';

    return {
      title: `Tâche suggérée${urgency}`,
      body: `${task.title} pour ${task.childName}${task.mandatory ? ' - Obligatoire' : ''}`
    };
  }

  const urgency = daysUntilDue !== null && daysUntilDue <= 3
    ? ' (Urgent)'
    : daysUntilDue !== null && daysUntilDue <= 7
    ? ' (Soon)'
    : '';

  return {
    title: `Suggested task${urgency}`,
    body: `${task.title} for ${task.childName}${task.mandatory ? ' - Mandatory' : ''}`
  };
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get generation statistics for a household
 */
export function getHouseholdStats(
  store: AutoTaskStore,
  householdId: string
): {
  total: number;
  pending: number;
  confirmed: number;
  dismissed: number;
  expired: number;
  critical: number;
  dueSoon: number;
} {
  const taskIds = store.byHousehold.get(householdId) || [];
  const tasks = taskIds
    .map(id => store.tasks.get(id))
    .filter((t): t is AutoTask => t !== undefined);

  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    confirmed: tasks.filter(t => t.status === 'confirmed').length,
    dismissed: tasks.filter(t => t.status === 'dismissed').length,
    expired: tasks.filter(t => t.status === 'expired').length,
    critical: tasks.filter(t => t.status === 'pending' && (t.priority === 'critical' || t.mandatory)).length,
    dueSoon: tasks.filter(t => t.status === 'pending' && t.dueDate && t.dueDate <= weekFromNow).length
  };
}

/**
 * Get completion rate
 */
export function getCompletionRate(store: AutoTaskStore): number {
  const { totalConfirmed, totalGenerated, totalDismissed } = store.stats;
  const relevant = totalConfirmed + totalDismissed;
  if (relevant === 0) return 0;
  return (totalConfirmed / relevant) * 100;
}
