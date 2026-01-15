/**
 * Activation Tracker - Track user activation milestones and engagement
 * Monitors user progress through key activation events
 */

import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const ActivationMilestoneSchema = z.enum([
  'account_created',
  'profile_completed',
  'household_created',
  'first_member_invited',
  'first_task_created',
  'first_task_completed',
  'first_category_created',
  'notifications_enabled',
  'app_tour_completed',
  'first_week_active',
  'first_recurring_task',
  'first_assignment',
  'first_comment',
  'first_attachment',
  'calendar_connected',
  'mobile_app_installed',
  'streak_started',
  'all_members_active',
  'ten_tasks_completed',
  'household_organized'
]);

export type ActivationMilestone = z.infer<typeof ActivationMilestoneSchema>;

export const MilestoneEventSchema = z.object({
  milestone: ActivationMilestoneSchema,
  achievedAt: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type MilestoneEvent = z.infer<typeof MilestoneEventSchema>;

export const ActivationStateSchema = z.object({
  userId: z.string(),
  householdId: z.string().optional(),
  startedAt: z.date(),
  milestones: z.array(MilestoneEventSchema),
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  lastActiveAt: z.date().optional(),
  activationScore: z.number().min(0).max(100),
  isActivated: z.boolean(),
  activatedAt: z.date().optional()
});

export type ActivationState = z.infer<typeof ActivationStateSchema>;

export const EngagementEventSchema = z.object({
  type: z.enum([
    'session_start',
    'session_end',
    'task_view',
    'task_create',
    'task_complete',
    'task_assign',
    'comment_add',
    'notification_click',
    'feature_use',
    'search_use',
    'settings_change'
  ]),
  timestamp: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional()
});

export type EngagementEvent = z.infer<typeof EngagementEventSchema>;

export const DailyEngagementSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  sessionCount: z.number().min(0),
  totalDuration: z.number().min(0), // minutes
  tasksCreated: z.number().min(0),
  tasksCompleted: z.number().min(0),
  interactions: z.number().min(0)
});

export type DailyEngagement = z.infer<typeof DailyEngagementSchema>;

export const ActivationConfigSchema = z.object({
  requiredMilestones: z.array(ActivationMilestoneSchema),
  activationThreshold: z.number().min(0).max(100),
  milestoneWeights: z.record(ActivationMilestoneSchema, z.number()),
  streakBonusPerDay: z.number().min(0),
  maxStreakBonus: z.number().min(0)
});

export type ActivationConfig = z.infer<typeof ActivationConfigSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_ACTIVATION_CONFIG: ActivationConfig = {
  requiredMilestones: [
    'account_created',
    'profile_completed',
    'household_created',
    'first_task_created'
  ],
  activationThreshold: 60,
  milestoneWeights: {
    account_created: 5,
    profile_completed: 10,
    household_created: 15,
    first_member_invited: 10,
    first_task_created: 15,
    first_task_completed: 10,
    first_category_created: 5,
    notifications_enabled: 5,
    app_tour_completed: 5,
    first_week_active: 10,
    first_recurring_task: 5,
    first_assignment: 5,
    first_comment: 3,
    first_attachment: 3,
    calendar_connected: 5,
    mobile_app_installed: 5,
    streak_started: 5,
    all_members_active: 10,
    ten_tasks_completed: 10,
    household_organized: 10
  },
  streakBonusPerDay: 2,
  maxStreakBonus: 20
};

export const MILESTONE_DESCRIPTIONS: Record<ActivationMilestone, string> = {
  account_created: 'Account created successfully',
  profile_completed: 'Profile information filled out',
  household_created: 'First household created',
  first_member_invited: 'Invited first family member',
  first_task_created: 'Created first task',
  first_task_completed: 'Completed first task',
  first_category_created: 'Created custom category',
  notifications_enabled: 'Enabled push notifications',
  app_tour_completed: 'Completed app tour',
  first_week_active: 'Active for one week',
  first_recurring_task: 'Created recurring task',
  first_assignment: 'Assigned task to member',
  first_comment: 'Added first comment',
  first_attachment: 'Added first attachment',
  calendar_connected: 'Connected external calendar',
  mobile_app_installed: 'Installed mobile app',
  streak_started: 'Started activity streak',
  all_members_active: 'All household members active',
  ten_tasks_completed: 'Completed 10 tasks',
  household_organized: 'Organized household categories'
};

// ============================================================================
// ACTIVATION STORE
// ============================================================================

export interface ActivationStore {
  readonly states: ReadonlyMap<string, ActivationState>;
  readonly engagementEvents: ReadonlyMap<string, readonly EngagementEvent[]>;
  readonly dailyEngagement: ReadonlyMap<string, ReadonlyMap<string, DailyEngagement>>;
  readonly config: ActivationConfig;
}

export function createActivationStore(
  config: ActivationConfig = DEFAULT_ACTIVATION_CONFIG
): ActivationStore {
  return {
    states: new Map(),
    engagementEvents: new Map(),
    dailyEngagement: new Map(),
    config
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export function initializeActivation(
  store: ActivationStore,
  userId: string,
  householdId?: string
): ActivationStore {
  const now = new Date();

  const initialState: ActivationState = {
    userId,
    householdId,
    startedAt: now,
    milestones: [{
      milestone: 'account_created',
      achievedAt: now
    }],
    currentStreak: 0,
    longestStreak: 0,
    lastActiveAt: now,
    activationScore: store.config.milestoneWeights.account_created,
    isActivated: false
  };

  return {
    ...store,
    states: new Map(store.states).set(userId, initialState),
    engagementEvents: new Map(store.engagementEvents).set(userId, [])
  };
}

export function getActivationState(
  store: ActivationStore,
  userId: string
): ActivationState | undefined {
  return store.states.get(userId);
}

// ============================================================================
// MILESTONE TRACKING
// ============================================================================

export function recordMilestone(
  store: ActivationStore,
  userId: string,
  milestone: ActivationMilestone,
  metadata?: Record<string, unknown>
): ActivationStore {
  const state = store.states.get(userId);
  if (!state) {
    return store;
  }

  // Check if milestone already achieved
  if (state.milestones.some(m => m.milestone === milestone)) {
    return store;
  }

  const now = new Date();
  const newMilestone: MilestoneEvent = {
    milestone,
    achievedAt: now,
    metadata
  };

  const newMilestones = [...state.milestones, newMilestone];
  const newScore = calculateActivationScore(newMilestones, state.currentStreak, store.config);
  const isActivated = checkActivation(newMilestones, newScore, store.config);

  const updatedState: ActivationState = {
    ...state,
    milestones: newMilestones,
    activationScore: newScore,
    isActivated,
    activatedAt: isActivated && !state.isActivated ? now : state.activatedAt
  };

  return {
    ...store,
    states: new Map(store.states).set(userId, updatedState)
  };
}

export function hasMilestone(
  store: ActivationStore,
  userId: string,
  milestone: ActivationMilestone
): boolean {
  const state = store.states.get(userId);
  if (!state) {
    return false;
  }
  return state.milestones.some(m => m.milestone === milestone);
}

export function getMilestoneProgress(
  store: ActivationStore,
  userId: string
): {
  achieved: readonly ActivationMilestone[];
  pending: readonly ActivationMilestone[];
  required: readonly ActivationMilestone[];
  requiredComplete: boolean;
} {
  const state = store.states.get(userId);
  const allMilestones = ActivationMilestoneSchema.options;

  if (!state) {
    return {
      achieved: [],
      pending: allMilestones,
      required: store.config.requiredMilestones,
      requiredComplete: false
    };
  }

  const achieved = state.milestones.map(m => m.milestone);
  const pending = allMilestones.filter(m => !achieved.includes(m));
  const requiredComplete = store.config.requiredMilestones.every(
    m => achieved.includes(m)
  );

  return {
    achieved,
    pending,
    required: store.config.requiredMilestones,
    requiredComplete
  };
}

export function getNextSuggestedMilestones(
  store: ActivationStore,
  userId: string,
  limit: number = 3
): readonly {
  milestone: ActivationMilestone;
  weight: number;
  description: string;
}[] {
  const progress = getMilestoneProgress(store, userId);

  // Prioritize required milestones first
  const pendingRequired = store.config.requiredMilestones
    .filter(m => progress.pending.includes(m));

  const pendingOptional = progress.pending
    .filter(m => !store.config.requiredMilestones.includes(m));

  const sorted = [...pendingRequired, ...pendingOptional]
    .map(milestone => ({
      milestone,
      weight: store.config.milestoneWeights[milestone],
      description: MILESTONE_DESCRIPTIONS[milestone]
    }))
    .sort((a, b) => b.weight - a.weight);

  return sorted.slice(0, limit);
}

// ============================================================================
// ENGAGEMENT TRACKING
// ============================================================================

export function recordEngagement(
  store: ActivationStore,
  userId: string,
  event: Omit<EngagementEvent, 'timestamp'>
): ActivationStore {
  const now = new Date();
  const fullEvent: EngagementEvent = {
    ...event,
    timestamp: now
  };

  const existingEvents = store.engagementEvents.get(userId) ?? [];
  const newEvents = [...existingEvents, fullEvent];

  // Update daily engagement
  const dateKey = now.toISOString().split('T')[0]!;
  const userDaily = store.dailyEngagement.get(userId) ?? new Map();
  const currentDaily = userDaily.get(dateKey) ?? {
    date: dateKey,
    sessionCount: 0,
    totalDuration: 0,
    tasksCreated: 0,
    tasksCompleted: 0,
    interactions: 0
  };

  const updatedDaily: DailyEngagement = {
    ...currentDaily,
    interactions: currentDaily.interactions + 1,
    sessionCount: event.type === 'session_start'
      ? currentDaily.sessionCount + 1
      : currentDaily.sessionCount,
    tasksCreated: event.type === 'task_create'
      ? currentDaily.tasksCreated + 1
      : currentDaily.tasksCreated,
    tasksCompleted: event.type === 'task_complete'
      ? currentDaily.tasksCompleted + 1
      : currentDaily.tasksCompleted
  };

  const newUserDaily = new Map(userDaily).set(dateKey, updatedDaily);

  // Update state last active
  const state = store.states.get(userId);
  const updatedStates = state
    ? new Map(store.states).set(userId, { ...state, lastActiveAt: now })
    : store.states;

  return {
    ...store,
    states: updatedStates,
    engagementEvents: new Map(store.engagementEvents).set(userId, newEvents),
    dailyEngagement: new Map(store.dailyEngagement).set(userId, newUserDaily)
  };
}

export function getEngagementHistory(
  store: ActivationStore,
  userId: string,
  days: number = 30
): readonly EngagementEvent[] {
  const events = store.engagementEvents.get(userId) ?? [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return events.filter(e => e.timestamp >= cutoff);
}

export function getDailyEngagement(
  store: ActivationStore,
  userId: string,
  days: number = 30
): readonly DailyEngagement[] {
  const userDaily = store.dailyEngagement.get(userId);
  if (!userDaily) {
    return [];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().split('T')[0]!;

  return Array.from(userDaily.values())
    .filter(d => d.date >= cutoffKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

export function updateStreak(
  store: ActivationStore,
  userId: string
): ActivationStore {
  const state = store.states.get(userId);
  if (!state) {
    return store;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0]!;

  if (!state.lastActiveAt) {
    return store;
  }

  const lastActive = state.lastActiveAt.toISOString().split('T')[0]!;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0]!;

  let newStreak = state.currentStreak;

  if (lastActive === today) {
    // Already active today, no change
  } else if (lastActive === yesterdayKey) {
    // Consecutive day, increment streak
    newStreak = state.currentStreak + 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  const newLongest = Math.max(state.longestStreak, newStreak);
  const newScore = calculateActivationScore(state.milestones, newStreak, store.config);

  // Check if streak milestone should be awarded
  let updatedStore = store;
  if (newStreak >= 3 && !hasMilestone(store, userId, 'streak_started')) {
    updatedStore = recordMilestone(store, userId, 'streak_started');
  }

  const updatedState: ActivationState = {
    ...state,
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveAt: now,
    activationScore: newScore
  };

  return {
    ...updatedStore,
    states: new Map(updatedStore.states).set(userId, updatedState)
  };
}

export function getStreakInfo(
  store: ActivationStore,
  userId: string
): {
  current: number;
  longest: number;
  streakBonus: number;
  daysUntilLoss: number;
} {
  const state = store.states.get(userId);
  if (!state) {
    return { current: 0, longest: 0, streakBonus: 0, daysUntilLoss: 0 };
  }

  const streakBonus = Math.min(
    state.currentStreak * store.config.streakBonusPerDay,
    store.config.maxStreakBonus
  );

  // Calculate days until streak loss
  let daysUntilLoss = 0;
  if (state.lastActiveAt) {
    const now = new Date();
    const lastActive = state.lastActiveAt;
    const diffMs = now.getTime() - lastActive.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    daysUntilLoss = Math.max(0, Math.ceil(2 - diffDays)); // 2 days to maintain streak
  }

  return {
    current: state.currentStreak,
    longest: state.longestStreak,
    streakBonus,
    daysUntilLoss
  };
}

// ============================================================================
// SCORING & ACTIVATION
// ============================================================================

function calculateActivationScore(
  milestones: readonly MilestoneEvent[],
  streak: number,
  config: ActivationConfig
): number {
  const milestoneScore = milestones.reduce((sum, m) => {
    return sum + (config.milestoneWeights[m.milestone] ?? 0);
  }, 0);

  const streakBonus = Math.min(
    streak * config.streakBonusPerDay,
    config.maxStreakBonus
  );

  return Math.min(100, milestoneScore + streakBonus);
}

function checkActivation(
  milestones: readonly MilestoneEvent[],
  score: number,
  config: ActivationConfig
): boolean {
  // Must have all required milestones
  const achievedMilestones = new Set(milestones.map(m => m.milestone));
  const hasAllRequired = config.requiredMilestones.every(m =>
    achievedMilestones.has(m)
  );

  // Must meet score threshold
  return hasAllRequired && score >= config.activationThreshold;
}

export function getActivationDetails(
  store: ActivationStore,
  userId: string
): {
  score: number;
  threshold: number;
  isActivated: boolean;
  activatedAt: Date | undefined;
  missingRequired: readonly ActivationMilestone[];
  pointsToActivation: number;
} {
  const state = store.states.get(userId);
  if (!state) {
    return {
      score: 0,
      threshold: store.config.activationThreshold,
      isActivated: false,
      activatedAt: undefined,
      missingRequired: store.config.requiredMilestones,
      pointsToActivation: store.config.activationThreshold
    };
  }

  const achievedMilestones = new Set(state.milestones.map(m => m.milestone));
  const missingRequired = store.config.requiredMilestones.filter(
    m => !achievedMilestones.has(m)
  );

  const pointsToActivation = Math.max(
    0,
    store.config.activationThreshold - state.activationScore
  );

  return {
    score: state.activationScore,
    threshold: store.config.activationThreshold,
    isActivated: state.isActivated,
    activatedAt: state.activatedAt,
    missingRequired,
    pointsToActivation
  };
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function calculateEngagementScore(
  store: ActivationStore,
  userId: string,
  days: number = 7
): {
  score: number;
  breakdown: {
    frequency: number;
    depth: number;
    consistency: number;
    completion: number;
  };
} {
  const daily = getDailyEngagement(store, userId, days);

  if (daily.length === 0) {
    return {
      score: 0,
      breakdown: { frequency: 0, depth: 0, consistency: 0, completion: 0 }
    };
  }

  // Frequency: How many days were they active
  const frequency = (daily.length / days) * 100;

  // Depth: Average interactions per active day
  const avgInteractions = daily.reduce((sum, d) => sum + d.interactions, 0) / daily.length;
  const depth = Math.min(100, avgInteractions * 5); // 20 interactions = 100%

  // Consistency: Standard deviation of activity (lower is better)
  const interactions = daily.map(d => d.interactions);
  const mean = interactions.reduce((a, b) => a + b, 0) / interactions.length;
  const variance = interactions.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / interactions.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (stdDev * 10));

  // Completion: Tasks completed vs created ratio
  const totalCreated = daily.reduce((sum, d) => sum + d.tasksCreated, 0);
  const totalCompleted = daily.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const completion = totalCreated > 0
    ? Math.min(100, (totalCompleted / totalCreated) * 100)
    : 50; // Neutral if no tasks created

  const score = (frequency * 0.3) + (depth * 0.25) + (consistency * 0.25) + (completion * 0.2);

  return {
    score: Math.round(score),
    breakdown: {
      frequency: Math.round(frequency),
      depth: Math.round(depth),
      consistency: Math.round(consistency),
      completion: Math.round(completion)
    }
  };
}

export function getUserActivationSummary(
  store: ActivationStore,
  userId: string
): {
  state: ActivationState | undefined;
  progress: ReturnType<typeof getMilestoneProgress>;
  activation: ReturnType<typeof getActivationDetails>;
  streak: ReturnType<typeof getStreakInfo>;
  engagement: ReturnType<typeof calculateEngagementScore>;
  nextSteps: ReturnType<typeof getNextSuggestedMilestones>;
} {
  return {
    state: getActivationState(store, userId),
    progress: getMilestoneProgress(store, userId),
    activation: getActivationDetails(store, userId),
    streak: getStreakInfo(store, userId),
    engagement: calculateEngagementScore(store, userId),
    nextSteps: getNextSuggestedMilestones(store, userId)
  };
}

export function getActivationFunnel(
  store: ActivationStore
): {
  total: number;
  activated: number;
  activationRate: number;
  byMilestone: ReadonlyMap<ActivationMilestone, number>;
  avgTimeToActivation: number;
} {
  const states = Array.from(store.states.values());
  const total = states.length;
  const activated = states.filter(s => s.isActivated).length;

  // Count users per milestone
  const byMilestone = new Map<ActivationMilestone, number>();
  for (const milestone of ActivationMilestoneSchema.options) {
    const count = states.filter(s =>
      s.milestones.some(m => m.milestone === milestone)
    ).length;
    byMilestone.set(milestone, count);
  }

  // Calculate average time to activation
  const activatedStates = states.filter(s => s.isActivated && s.activatedAt);
  const avgTimeToActivation = activatedStates.length > 0
    ? activatedStates.reduce((sum, s) => {
        const diffMs = s.activatedAt!.getTime() - s.startedAt.getTime();
        return sum + (diffMs / (1000 * 60 * 60 * 24)); // days
      }, 0) / activatedStates.length
    : 0;

  return {
    total,
    activated,
    activationRate: total > 0 ? (activated / total) * 100 : 0,
    byMilestone,
    avgTimeToActivation
  };
}

export function identifyAtRiskUsers(
  store: ActivationStore,
  inactiveDays: number = 3
): readonly {
  userId: string;
  state: ActivationState;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  const atRisk: {
    userId: string;
    state: ActivationState;
    riskLevel: 'low' | 'medium' | 'high';
    reason: string;
  }[] = [];

  for (const state of store.states.values()) {
    if (state.isActivated) {
      continue; // Already activated, not at risk
    }

    const lastActive = state.lastActiveAt ?? state.startedAt;
    const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActive >= inactiveDays) {
      let riskLevel: 'low' | 'medium' | 'high';
      let reason: string;

      if (daysSinceActive >= 7) {
        riskLevel = 'high';
        reason = `Inactive for ${Math.round(daysSinceActive)} days`;
      } else if (state.activationScore < 30) {
        riskLevel = 'high';
        reason = 'Low activation progress and inactive';
      } else if (daysSinceActive >= 5) {
        riskLevel = 'medium';
        reason = `Inactive for ${Math.round(daysSinceActive)} days`;
      } else {
        riskLevel = 'low';
        reason = 'Recently became inactive';
      }

      atRisk.push({
        userId: state.userId,
        state,
        riskLevel,
        reason
      });
    }
  }

  return atRisk.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

// ============================================================================
// AUTOMATIC MILESTONE DETECTION
// ============================================================================

export interface MilestoneDetectionContext {
  tasksCreated: number;
  tasksCompleted: number;
  membersInvited: number;
  categoriesCreated: number;
  commentsAdded: number;
  attachmentsAdded: number;
  recurringTasksCreated: number;
  assignmentsMade: number;
  notificationsEnabled: boolean;
  calendarConnected: boolean;
  mobileAppInstalled: boolean;
  tourCompleted: boolean;
  profileComplete: boolean;
  householdCreated: boolean;
  daysActive: number;
  allMembersActive: boolean;
}

export function detectMilestones(
  store: ActivationStore,
  userId: string,
  context: MilestoneDetectionContext
): ActivationStore {
  let updatedStore = store;

  const checks: Array<{
    milestone: ActivationMilestone;
    condition: boolean;
  }> = [
    { milestone: 'profile_completed', condition: context.profileComplete },
    { milestone: 'household_created', condition: context.householdCreated },
    { milestone: 'first_member_invited', condition: context.membersInvited >= 1 },
    { milestone: 'first_task_created', condition: context.tasksCreated >= 1 },
    { milestone: 'first_task_completed', condition: context.tasksCompleted >= 1 },
    { milestone: 'first_category_created', condition: context.categoriesCreated >= 1 },
    { milestone: 'notifications_enabled', condition: context.notificationsEnabled },
    { milestone: 'app_tour_completed', condition: context.tourCompleted },
    { milestone: 'first_week_active', condition: context.daysActive >= 7 },
    { milestone: 'first_recurring_task', condition: context.recurringTasksCreated >= 1 },
    { milestone: 'first_assignment', condition: context.assignmentsMade >= 1 },
    { milestone: 'first_comment', condition: context.commentsAdded >= 1 },
    { milestone: 'first_attachment', condition: context.attachmentsAdded >= 1 },
    { milestone: 'calendar_connected', condition: context.calendarConnected },
    { milestone: 'mobile_app_installed', condition: context.mobileAppInstalled },
    { milestone: 'all_members_active', condition: context.allMembersActive },
    { milestone: 'ten_tasks_completed', condition: context.tasksCompleted >= 10 },
    { milestone: 'household_organized', condition: context.categoriesCreated >= 3 }
  ];

  for (const { milestone, condition } of checks) {
    if (condition && !hasMilestone(updatedStore, userId, milestone)) {
      updatedStore = recordMilestone(updatedStore, userId, milestone);
    }
  }

  return updatedStore;
}
