/**
 * Personalization Engine - Personalize user experience based on behavior
 * Adapts the app experience to individual user preferences and patterns
 */

import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const UserPersonaSchema = z.enum([
  'organizer',      // Creates many tasks, manages household
  'executor',       // Completes tasks efficiently
  'collaborator',   // Focuses on assignments and communication
  'explorer',       // Uses many features, tries new things
  'minimalist',     // Simple usage, few features
  'power_user'      // Heavy usage of advanced features
]);

export type UserPersona = z.infer<typeof UserPersonaSchema>;

export const UsagePatternSchema = z.object({
  preferredTime: z.enum(['morning', 'afternoon', 'evening', 'night']),
  peakDays: z.array(z.number().min(0).max(6)), // 0=Sunday
  averageSessionDuration: z.number().min(0),
  sessionsPerWeek: z.number().min(0),
  mostUsedFeatures: z.array(z.string()),
  leastUsedFeatures: z.array(z.string())
});

export type UsagePattern = z.infer<typeof UsagePatternSchema>;

export const PreferenceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  timezone: z.string(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12h', '24h']),
  startOfWeek: z.number().min(0).max(6),
  defaultView: z.enum(['list', 'board', 'calendar']),
  notificationPreference: z.enum(['all', 'important', 'minimal', 'none']),
  quickActionsEnabled: z.boolean(),
  compactMode: z.boolean(),
  showCompletedTasks: z.boolean(),
  autoArchiveDays: z.number().min(0)
});

export type Preference = z.infer<typeof PreferenceSchema>;

export const FeatureRecommendationSchema = z.object({
  feature: z.string(),
  reason: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  ctaText: z.string(),
  ctaAction: z.string(),
  dismissable: z.boolean()
});

export type FeatureRecommendation = z.infer<typeof FeatureRecommendationSchema>;

export const UserProfileSchema = z.object({
  userId: z.string(),
  persona: UserPersonaSchema.optional(),
  personaConfidence: z.number().min(0).max(100).optional(),
  usagePattern: UsagePatternSchema.optional(),
  preferences: PreferenceSchema,
  featureFlags: z.record(z.string(), z.boolean()),
  contentPersonalization: z.object({
    taskCategories: z.array(z.string()),
    suggestedTemplates: z.array(z.string()),
    hiddenTips: z.array(z.string())
  }),
  lastAnalyzedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const BehaviorEventSchema = z.object({
  type: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type BehaviorEvent = z.infer<typeof BehaviorEventSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_PREFERENCES: Preference = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  startOfWeek: 0,
  defaultView: 'list',
  notificationPreference: 'all',
  quickActionsEnabled: true,
  compactMode: false,
  showCompletedTasks: true,
  autoArchiveDays: 30
};

export const PERSONA_TRAITS: Record<UserPersona, {
  description: string;
  typicalBehaviors: string[];
  recommendedFeatures: string[];
}> = {
  organizer: {
    description: 'Creates and manages tasks for the household',
    typicalBehaviors: ['high task creation', 'frequent categorization', 'regular assignments'],
    recommendedFeatures: ['templates', 'recurring_tasks', 'bulk_actions', 'reports']
  },
  executor: {
    description: 'Focuses on completing assigned tasks',
    typicalBehaviors: ['high completion rate', 'quick actions', 'minimal browsing'],
    recommendedFeatures: ['quick_complete', 'focus_mode', 'today_view', 'widgets']
  },
  collaborator: {
    description: 'Emphasizes communication and teamwork',
    typicalBehaviors: ['frequent comments', 'assignments', 'sharing'],
    recommendedFeatures: ['mentions', 'activity_feed', 'notifications', 'chat']
  },
  explorer: {
    description: 'Tries different features and customizations',
    typicalBehaviors: ['diverse feature usage', 'settings changes', 'integrations'],
    recommendedFeatures: ['new_features', 'beta_access', 'customization', 'integrations']
  },
  minimalist: {
    description: 'Simple, focused usage',
    typicalBehaviors: ['basic features only', 'short sessions', 'minimal customization'],
    recommendedFeatures: ['compact_mode', 'simplified_ui', 'essentials_only']
  },
  power_user: {
    description: 'Heavy usage of advanced features',
    typicalBehaviors: ['keyboard shortcuts', 'automations', 'api usage', 'exports'],
    recommendedFeatures: ['keyboard_shortcuts', 'automations', 'api', 'advanced_filters']
  }
};

export const FEATURE_CATEGORIES = [
  'task_management',
  'collaboration',
  'scheduling',
  'reporting',
  'integrations',
  'customization',
  'automation',
  'communication'
] as const;

// ============================================================================
// PERSONALIZATION STORE
// ============================================================================

export interface PersonalizationStore {
  readonly profiles: ReadonlyMap<string, UserProfile>;
  readonly behaviorHistory: ReadonlyMap<string, readonly BehaviorEvent[]>;
  readonly recommendations: ReadonlyMap<string, readonly FeatureRecommendation[]>;
}

export function createPersonalizationStore(): PersonalizationStore {
  return {
    profiles: new Map(),
    behaviorHistory: new Map(),
    recommendations: new Map()
  };
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

export function createUserProfile(
  store: PersonalizationStore,
  userId: string,
  initialPreferences?: Partial<Preference>
): PersonalizationStore {
  const now = new Date();

  const profile: UserProfile = {
    userId,
    preferences: { ...DEFAULT_PREFERENCES, ...initialPreferences },
    featureFlags: {},
    contentPersonalization: {
      taskCategories: [],
      suggestedTemplates: [],
      hiddenTips: []
    },
    createdAt: now,
    updatedAt: now
  };

  return {
    ...store,
    profiles: new Map(store.profiles).set(userId, profile),
    behaviorHistory: new Map(store.behaviorHistory).set(userId, [])
  };
}

export function getUserProfile(
  store: PersonalizationStore,
  userId: string
): UserProfile | undefined {
  return store.profiles.get(userId);
}

export function updatePreferences(
  store: PersonalizationStore,
  userId: string,
  updates: Partial<Preference>
): PersonalizationStore {
  const profile = store.profiles.get(userId);
  if (!profile) {
    return store;
  }

  const updatedProfile: UserProfile = {
    ...profile,
    preferences: { ...profile.preferences, ...updates },
    updatedAt: new Date()
  };

  return {
    ...store,
    profiles: new Map(store.profiles).set(userId, updatedProfile)
  };
}

export function setFeatureFlag(
  store: PersonalizationStore,
  userId: string,
  flag: string,
  value: boolean
): PersonalizationStore {
  const profile = store.profiles.get(userId);
  if (!profile) {
    return store;
  }

  const updatedProfile: UserProfile = {
    ...profile,
    featureFlags: { ...profile.featureFlags, [flag]: value },
    updatedAt: new Date()
  };

  return {
    ...store,
    profiles: new Map(store.profiles).set(userId, updatedProfile)
  };
}

// ============================================================================
// BEHAVIOR TRACKING
// ============================================================================

export function recordBehavior(
  store: PersonalizationStore,
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): PersonalizationStore {
  const event: BehaviorEvent = {
    type: eventType,
    timestamp: new Date(),
    metadata
  };

  const existingHistory = store.behaviorHistory.get(userId) ?? [];
  const newHistory = [...existingHistory, event];

  // Keep only last 1000 events
  const trimmedHistory = newHistory.slice(-1000);

  return {
    ...store,
    behaviorHistory: new Map(store.behaviorHistory).set(userId, trimmedHistory)
  };
}

export function getBehaviorHistory(
  store: PersonalizationStore,
  userId: string,
  days: number = 30
): readonly BehaviorEvent[] {
  const history = store.behaviorHistory.get(userId) ?? [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return history.filter(e => e.timestamp >= cutoff);
}

// ============================================================================
// PERSONA DETECTION
// ============================================================================

export function analyzeUserPersona(
  store: PersonalizationStore,
  userId: string
): PersonalizationStore {
  const history = getBehaviorHistory(store, userId, 30);
  const profile = store.profiles.get(userId);

  if (!profile || history.length < 10) {
    return store; // Not enough data
  }

  const scores = calculatePersonaScores(history);
  const { persona, confidence } = determinePersona(scores);

  const updatedProfile: UserProfile = {
    ...profile,
    persona,
    personaConfidence: confidence,
    lastAnalyzedAt: new Date(),
    updatedAt: new Date()
  };

  return {
    ...store,
    profiles: new Map(store.profiles).set(userId, updatedProfile)
  };
}

function calculatePersonaScores(
  events: readonly BehaviorEvent[]
): Record<UserPersona, number> {
  const scores: Record<UserPersona, number> = {
    organizer: 0,
    executor: 0,
    collaborator: 0,
    explorer: 0,
    minimalist: 0,
    power_user: 0
  };

  // Count event types
  const typeCounts = new Map<string, number>();
  for (const event of events) {
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
  }

  // Organizer signals
  scores.organizer +=
    (typeCounts.get('task_create') ?? 0) * 3 +
    (typeCounts.get('category_create') ?? 0) * 5 +
    (typeCounts.get('task_assign') ?? 0) * 4 +
    (typeCounts.get('template_use') ?? 0) * 3;

  // Executor signals
  scores.executor +=
    (typeCounts.get('task_complete') ?? 0) * 4 +
    (typeCounts.get('quick_action') ?? 0) * 3 +
    (typeCounts.get('task_view') ?? 0) * 1;

  // Collaborator signals
  scores.collaborator +=
    (typeCounts.get('comment_add') ?? 0) * 4 +
    (typeCounts.get('mention_use') ?? 0) * 3 +
    (typeCounts.get('task_assign') ?? 0) * 3 +
    (typeCounts.get('share') ?? 0) * 4;

  // Explorer signals
  const uniqueEventTypes = typeCounts.size;
  scores.explorer += uniqueEventTypes * 2 +
    (typeCounts.get('settings_change') ?? 0) * 3 +
    (typeCounts.get('integration_use') ?? 0) * 4 +
    (typeCounts.get('feature_discover') ?? 0) * 3;

  // Power user signals
  scores.power_user +=
    (typeCounts.get('keyboard_shortcut') ?? 0) * 3 +
    (typeCounts.get('automation_create') ?? 0) * 5 +
    (typeCounts.get('bulk_action') ?? 0) * 3 +
    (typeCounts.get('api_call') ?? 0) * 4 +
    (typeCounts.get('export') ?? 0) * 2;

  // Minimalist signals (inverse of complexity)
  const totalEvents = events.length;
  const sessionsGuess = Math.ceil(totalEvents / 10);
  const avgEventsPerSession = totalEvents / sessionsGuess;
  if (avgEventsPerSession < 5 && uniqueEventTypes < 5) {
    scores.minimalist += 30;
  }

  return scores;
}

function determinePersona(
  scores: Record<UserPersona, number>
): { persona: UserPersona; confidence: number } {
  const entries = Object.entries(scores) as Array<[UserPersona, number]>;
  entries.sort((a, b) => b[1] - a[1]);

  const [topPersona, topScore] = entries[0]!;
  const [, secondScore] = entries[1]!;

  // Confidence based on how much the top score exceeds others
  const total = entries.reduce((sum, [, score]) => sum + score, 0);
  const confidence = total > 0
    ? Math.min(100, ((topScore - secondScore) / total) * 200 + 50)
    : 50;

  return {
    persona: topPersona,
    confidence: Math.round(confidence)
  };
}

// ============================================================================
// USAGE PATTERN ANALYSIS
// ============================================================================

export function analyzeUsagePatterns(
  store: PersonalizationStore,
  userId: string
): PersonalizationStore {
  const history = getBehaviorHistory(store, userId, 30);
  const profile = store.profiles.get(userId);

  if (!profile || history.length < 20) {
    return store;
  }

  const pattern = calculateUsagePattern(history);

  const updatedProfile: UserProfile = {
    ...profile,
    usagePattern: pattern,
    lastAnalyzedAt: new Date(),
    updatedAt: new Date()
  };

  return {
    ...store,
    profiles: new Map(store.profiles).set(userId, updatedProfile)
  };
}

function calculateUsagePattern(events: readonly BehaviorEvent[]): UsagePattern {
  // Time of day analysis
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<number, number>();
  const featureCounts = new Map<string, number>();

  for (const event of events) {
    const hour = event.timestamp.getHours();
    const day = event.timestamp.getDay();

    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    featureCounts.set(event.type, (featureCounts.get(event.type) ?? 0) + 1);
  }

  // Determine preferred time
  let preferredTime: 'morning' | 'afternoon' | 'evening' | 'night';
  const morningCount = sumRange(hourCounts, 6, 11);
  const afternoonCount = sumRange(hourCounts, 12, 17);
  const eveningCount = sumRange(hourCounts, 18, 22);
  const nightCount = sumRange(hourCounts, 23, 23) + sumRange(hourCounts, 0, 5);

  const maxTime = Math.max(morningCount, afternoonCount, eveningCount, nightCount);
  if (maxTime === morningCount) preferredTime = 'morning';
  else if (maxTime === afternoonCount) preferredTime = 'afternoon';
  else if (maxTime === eveningCount) preferredTime = 'evening';
  else preferredTime = 'night';

  // Peak days
  const dayEntries = Array.from(dayCounts.entries());
  dayEntries.sort((a, b) => b[1] - a[1]);
  const avgDayCount = dayEntries.reduce((sum, [, c]) => sum + c, 0) / 7;
  const peakDays = dayEntries
    .filter(([, c]) => c > avgDayCount)
    .map(([day]) => day);

  // Most/least used features
  const featureEntries = Array.from(featureCounts.entries());
  featureEntries.sort((a, b) => b[1] - a[1]);
  const mostUsedFeatures = featureEntries.slice(0, 5).map(([f]) => f);
  const leastUsedFeatures = featureEntries.slice(-5).map(([f]) => f);

  // Session estimates
  const uniqueDays = new Set(events.map(e => e.timestamp.toDateString())).size;
  const sessionsPerWeek = (uniqueDays / 30) * 7;
  const averageSessionDuration = 15; // Default estimate

  return {
    preferredTime,
    peakDays,
    averageSessionDuration,
    sessionsPerWeek,
    mostUsedFeatures,
    leastUsedFeatures
  };
}

function sumRange(map: Map<number, number>, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += map.get(i) ?? 0;
  }
  return sum;
}

// ============================================================================
// FEATURE RECOMMENDATIONS
// ============================================================================

export function generateRecommendations(
  store: PersonalizationStore,
  userId: string
): PersonalizationStore {
  const profile = store.profiles.get(userId);
  if (!profile) {
    return store;
  }

  const recommendations: FeatureRecommendation[] = [];

  // Persona-based recommendations
  if (profile.persona) {
    const personaTraits = PERSONA_TRAITS[profile.persona];
    for (const feature of personaTraits.recommendedFeatures) {
      if (!profile.featureFlags[feature]) {
        recommendations.push({
          feature,
          reason: `Based on your ${profile.persona} usage style`,
          priority: 'high',
          ctaText: `Try ${formatFeatureName(feature)}`,
          ctaAction: `enable_${feature}`,
          dismissable: true
        });
      }
    }
  }

  // Usage pattern recommendations
  if (profile.usagePattern) {
    const { leastUsedFeatures, preferredTime } = profile.usagePattern;

    // Recommend underused features
    for (const feature of leastUsedFeatures.slice(0, 2)) {
      recommendations.push({
        feature,
        reason: 'This feature could help your workflow',
        priority: 'medium',
        ctaText: `Discover ${formatFeatureName(feature)}`,
        ctaAction: `explore_${feature}`,
        dismissable: true
      });
    }

    // Time-based recommendations
    if (preferredTime === 'morning') {
      recommendations.push({
        feature: 'daily_digest',
        reason: 'Start your day with a summary',
        priority: 'medium',
        ctaText: 'Enable Morning Digest',
        ctaAction: 'enable_daily_digest',
        dismissable: true
      });
    }
  }

  // Limit to top 5 recommendations
  const sortedRecommendations = recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);

  return {
    ...store,
    recommendations: new Map(store.recommendations).set(userId, sortedRecommendations)
  };
}

export function getRecommendations(
  store: PersonalizationStore,
  userId: string
): readonly FeatureRecommendation[] {
  return store.recommendations.get(userId) ?? [];
}

export function dismissRecommendation(
  store: PersonalizationStore,
  userId: string,
  feature: string
): PersonalizationStore {
  const current = store.recommendations.get(userId) ?? [];
  const filtered = current.filter(r => r.feature !== feature);

  // Track dismissed tip
  const profile = store.profiles.get(userId);
  if (profile) {
    const updatedProfile: UserProfile = {
      ...profile,
      contentPersonalization: {
        ...profile.contentPersonalization,
        hiddenTips: [...profile.contentPersonalization.hiddenTips, feature]
      },
      updatedAt: new Date()
    };

    return {
      ...store,
      profiles: new Map(store.profiles).set(userId, updatedProfile),
      recommendations: new Map(store.recommendations).set(userId, filtered)
    };
  }

  return {
    ...store,
    recommendations: new Map(store.recommendations).set(userId, filtered)
  };
}

function formatFeatureName(feature: string): string {
  return feature
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// CONTENT PERSONALIZATION
// ============================================================================

export function suggestTaskCategories(
  store: PersonalizationStore,
  userId: string,
  householdType: 'family' | 'roommates' | 'couple' | 'single'
): readonly string[] {
  const defaults: Record<typeof householdType, string[]> = {
    family: ['Chores', 'School', 'Kids Activities', 'Meals', 'Shopping', 'Appointments'],
    roommates: ['Chores', 'Bills', 'Shopping', 'Maintenance', 'Events'],
    couple: ['Chores', 'Meals', 'Shopping', 'Date Nights', 'Bills', 'Health'],
    single: ['Chores', 'Shopping', 'Meals', 'Self-Care', 'Finance', 'Goals']
  };

  const profile = store.profiles.get(userId);
  const saved = profile?.contentPersonalization.taskCategories ?? [];

  return saved.length > 0 ? saved : defaults[householdType];
}

export function suggestTaskTemplates(
  store: PersonalizationStore,
  userId: string,
  category?: string
): readonly {
  name: string;
  description: string;
  category: string;
  recurring?: string;
}[] {
  const templates = [
    { name: 'Weekly Laundry', description: 'Wash, dry, fold, put away', category: 'Chores', recurring: 'weekly' },
    { name: 'Grocery Shopping', description: 'Buy weekly groceries', category: 'Shopping', recurring: 'weekly' },
    { name: 'Take Out Trash', description: 'Empty all trash cans', category: 'Chores', recurring: 'weekly' },
    { name: 'Clean Bathroom', description: 'Full bathroom cleaning', category: 'Chores', recurring: 'weekly' },
    { name: 'Vacuum House', description: 'Vacuum all rooms', category: 'Chores', recurring: 'weekly' },
    { name: 'Pay Bills', description: 'Pay monthly bills', category: 'Bills', recurring: 'monthly' },
    { name: 'Meal Prep', description: 'Prepare meals for the week', category: 'Meals', recurring: 'weekly' },
    { name: 'Water Plants', description: 'Water indoor plants', category: 'Chores', recurring: 'weekly' },
    { name: 'Car Maintenance', description: 'Oil change, tire check', category: 'Maintenance', recurring: 'monthly' },
    { name: 'Deep Clean Kitchen', description: 'Clean appliances, organize pantry', category: 'Chores', recurring: 'monthly' }
  ];

  const profile = store.profiles.get(userId);
  const suggested = profile?.contentPersonalization.suggestedTemplates ?? [];

  // Filter by category if specified
  let filtered = category
    ? templates.filter(t => t.category.toLowerCase() === category.toLowerCase())
    : templates;

  // Prioritize previously suggested templates
  if (suggested.length > 0) {
    const suggestedSet = new Set(suggested);
    filtered = [
      ...filtered.filter(t => suggestedSet.has(t.name)),
      ...filtered.filter(t => !suggestedSet.has(t.name))
    ];
  }

  return filtered;
}

export function updateContentPersonalization(
  store: PersonalizationStore,
  userId: string,
  updates: Partial<UserProfile['contentPersonalization']>
): PersonalizationStore {
  const profile = store.profiles.get(userId);
  if (!profile) {
    return store;
  }

  const updatedProfile: UserProfile = {
    ...profile,
    contentPersonalization: { ...profile.contentPersonalization, ...updates },
    updatedAt: new Date()
  };

  return {
    ...store,
    profiles: new Map(store.profiles).set(userId, updatedProfile)
  };
}

// ============================================================================
// UI PERSONALIZATION
// ============================================================================

export interface UIPersonalization {
  showQuickActions: boolean;
  dashboardWidgets: readonly string[];
  sidebarOrder: readonly string[];
  defaultFilters: Record<string, unknown>;
  keyboardShortcutsEnabled: boolean;
  animationsReduced: boolean;
  highContrastMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export function getUIPersonalization(
  store: PersonalizationStore,
  userId: string
): UIPersonalization {
  const profile = store.profiles.get(userId);

  const defaults: UIPersonalization = {
    showQuickActions: true,
    dashboardWidgets: ['today_tasks', 'activity_feed', 'family_progress'],
    sidebarOrder: ['dashboard', 'tasks', 'calendar', 'family', 'settings'],
    defaultFilters: {},
    keyboardShortcutsEnabled: false,
    animationsReduced: false,
    highContrastMode: false,
    fontSize: 'medium'
  };

  if (!profile) {
    return defaults;
  }

  // Customize based on persona
  if (profile.persona === 'power_user') {
    return {
      ...defaults,
      keyboardShortcutsEnabled: true,
      dashboardWidgets: ['today_tasks', 'productivity_stats', 'shortcuts']
    };
  }

  if (profile.persona === 'minimalist') {
    return {
      ...defaults,
      showQuickActions: false,
      dashboardWidgets: ['today_tasks'],
      animationsReduced: true
    };
  }

  if (profile.persona === 'collaborator') {
    return {
      ...defaults,
      dashboardWidgets: ['activity_feed', 'family_progress', 'today_tasks']
    };
  }

  return {
    ...defaults,
    showQuickActions: profile.preferences.quickActionsEnabled,
    fontSize: profile.preferences.compactMode ? 'small' : 'medium'
  };
}

// ============================================================================
// NOTIFICATION PERSONALIZATION
// ============================================================================

export interface NotificationPersonalization {
  channels: readonly ('push' | 'email' | 'sms' | 'in_app')[];
  quietHours: { start: number; end: number } | null;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  priorityThreshold: 'all' | 'medium' | 'high' | 'critical';
  groupSimilar: boolean;
  soundEnabled: boolean;
}

export function getNotificationPersonalization(
  store: PersonalizationStore,
  userId: string
): NotificationPersonalization {
  const profile = store.profiles.get(userId);

  const defaults: NotificationPersonalization = {
    channels: ['push', 'in_app'],
    quietHours: { start: 22, end: 8 },
    digestFrequency: 'realtime',
    priorityThreshold: 'all',
    groupSimilar: true,
    soundEnabled: true
  };

  if (!profile) {
    return defaults;
  }

  switch (profile.preferences.notificationPreference) {
    case 'all':
      return defaults;
    case 'important':
      return {
        ...defaults,
        priorityThreshold: 'medium',
        digestFrequency: 'hourly'
      };
    case 'minimal':
      return {
        ...defaults,
        channels: ['in_app'],
        priorityThreshold: 'high',
        digestFrequency: 'daily',
        soundEnabled: false
      };
    case 'none':
      return {
        ...defaults,
        channels: [],
        digestFrequency: 'weekly',
        soundEnabled: false
      };
    default:
      return defaults;
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function getPersonalizationInsights(
  store: PersonalizationStore,
  userId: string
): {
  profile: UserProfile | undefined;
  recommendations: readonly FeatureRecommendation[];
  uiSettings: UIPersonalization;
  notificationSettings: NotificationPersonalization;
  suggestedCategories: readonly string[];
  behaviorSummary: {
    totalEvents: number;
    recentActivity: number;
    topFeatures: readonly string[];
  };
} {
  const profile = getUserProfile(store, userId);
  const history = getBehaviorHistory(store, userId, 7);

  const featureCounts = new Map<string, number>();
  for (const event of history) {
    featureCounts.set(event.type, (featureCounts.get(event.type) ?? 0) + 1);
  }

  const topFeatures = Array.from(featureCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f]) => f);

  return {
    profile,
    recommendations: getRecommendations(store, userId),
    uiSettings: getUIPersonalization(store, userId),
    notificationSettings: getNotificationPersonalization(store, userId),
    suggestedCategories: suggestTaskCategories(store, userId, 'family'),
    behaviorSummary: {
      totalEvents: store.behaviorHistory.get(userId)?.length ?? 0,
      recentActivity: history.length,
      topFeatures
    }
  };
}

export function getPersonaDistribution(
  store: PersonalizationStore
): ReadonlyMap<UserPersona, number> {
  const distribution = new Map<UserPersona, number>();

  for (const persona of UserPersonaSchema.options) {
    distribution.set(persona, 0);
  }

  for (const profile of store.profiles.values()) {
    if (profile.persona) {
      distribution.set(profile.persona, (distribution.get(profile.persona) ?? 0) + 1);
    }
  }

  return distribution;
}

export function getPreferenceStats(
  store: PersonalizationStore
): {
  themeDistribution: ReadonlyMap<string, number>;
  viewDistribution: ReadonlyMap<string, number>;
  notificationDistribution: ReadonlyMap<string, number>;
  avgFeatureFlags: number;
} {
  const profiles = Array.from(store.profiles.values());

  const themeDistribution = new Map<string, number>();
  const viewDistribution = new Map<string, number>();
  const notificationDistribution = new Map<string, number>();
  let totalFlags = 0;

  for (const profile of profiles) {
    const theme = profile.preferences.theme;
    themeDistribution.set(theme, (themeDistribution.get(theme) ?? 0) + 1);

    const view = profile.preferences.defaultView;
    viewDistribution.set(view, (viewDistribution.get(view) ?? 0) + 1);

    const notif = profile.preferences.notificationPreference;
    notificationDistribution.set(notif, (notificationDistribution.get(notif) ?? 0) + 1);

    totalFlags += Object.keys(profile.featureFlags).length;
  }

  return {
    themeDistribution,
    viewDistribution,
    notificationDistribution,
    avgFeatureFlags: profiles.length > 0 ? totalFlags / profiles.length : 0
  };
}
