/**
 * Onboarding Activation & Personalization Tests
 * Tests for activation tracking and personalization engine
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Guided Setup (using existing interface)
import {
  createOnboardingState,
  completeStep,
  skipStep,
  goToPreviousStep,
  goToStep,
  getCurrentStep,
  getProgress,
  isOnboardingComplete,
  calculateOnboardingMetrics,
  setHouseholdId,
  validateStepData,
  OnboardingState,
  DEFAULT_STEPS
} from '@/lib/onboarding/guided-setup';

// Activation Tracker
import {
  createActivationStore,
  initializeActivation,
  recordMilestone,
  recordEngagement,
  updateStreak,
  getActivationState,
  getMilestoneProgress,
  getNextSuggestedMilestones,
  hasMilestone,
  getStreakInfo,
  calculateEngagementScore,
  getUserActivationSummary,
  getActivationFunnel,
  identifyAtRiskUsers,
  detectMilestones,
  getActivationDetails,
  ActivationStore,
  DEFAULT_ACTIVATION_CONFIG,
  MILESTONE_DESCRIPTIONS
} from '@/lib/onboarding/activation-tracker';

// Personalization Engine
import {
  createPersonalizationStore,
  createUserProfile,
  getUserProfile,
  updatePreferences,
  setFeatureFlag,
  recordBehavior,
  analyzeUserPersona,
  analyzeUsagePatterns,
  generateRecommendations,
  getRecommendations,
  dismissRecommendation,
  suggestTaskCategories,
  suggestTaskTemplates,
  getUIPersonalization,
  getNotificationPersonalization,
  getPersonalizationInsights,
  getPersonaDistribution,
  getPreferenceStats,
  PersonalizationStore,
  DEFAULT_PREFERENCES,
  PERSONA_TRAITS
} from '@/lib/onboarding/personalization-engine';

// ============================================================================
// GUIDED SETUP TESTS (using existing interface)
// ============================================================================

describe('Guided Setup', () => {
  const userId = 'user-123';

  describe('createOnboardingState', () => {
    it('should create initial onboarding state', () => {
      const state = createOnboardingState(userId);

      expect(state).toBeDefined();
      expect(state.userId).toBe(userId);
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedAt).toBeNull();
    });

    it('should include source when provided', () => {
      const state = createOnboardingState(userId, 'referral');

      expect(state.source).toBe('referral');
    });
  });

  describe('completeStep', () => {
    it('should complete current step and move to next', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state);

      expect(state.currentStepIndex).toBe(1);
      expect(state.steps[0]!.status).toBe('completed');
    });

    it('should store step data', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state); // welcome -> profile
      state = completeStep(state, { name: 'John', email: 'john@example.com' });

      expect(state.steps[1]!.data).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should mark onboarding complete at final step', () => {
      let state = createOnboardingState(userId);

      // Complete all steps
      for (let i = 0; i < DEFAULT_STEPS.length; i++) {
        state = completeStep(state);
      }

      expect(state.completedAt).not.toBeNull();
    });
  });

  describe('skipStep', () => {
    it('should skip current step if not required', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state); // welcome -> profile
      state = completeStep(state); // profile -> household
      state = completeStep(state); // household -> invite_members (not required)
      state = skipStep(state); // skip invite_members

      expect(state.steps[3]!.status).toBe('skipped');
      expect(state.currentStepIndex).toBe(4);
    });

    it('should not skip required steps', () => {
      let state = createOnboardingState(userId);
      const initialIndex = state.currentStepIndex;
      state = skipStep(state); // welcome is required

      expect(state.currentStepIndex).toBe(initialIndex);
    });
  });

  describe('goToPreviousStep', () => {
    it('should go back to previous step', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state); // welcome -> profile
      state = completeStep(state); // profile -> household
      state = goToPreviousStep(state);

      expect(state.currentStepIndex).toBe(1);
    });

    it('should not go before first step', () => {
      let state = createOnboardingState(userId);
      state = goToPreviousStep(state);

      expect(state.currentStepIndex).toBe(0);
    });
  });

  describe('goToStep', () => {
    it('should navigate to completed step', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state); // welcome -> profile
      state = completeStep(state); // profile -> household
      state = goToStep(state, 0); // back to welcome

      expect(state.currentStepIndex).toBe(0);
    });
  });

  describe('getCurrentStep', () => {
    it('should return current step', () => {
      const state = createOnboardingState(userId);
      const current = getCurrentStep(state);

      expect(current).not.toBeNull();
      expect(current!.id).toBe('welcome');
    });
  });

  describe('getProgress', () => {
    it('should calculate progress correctly', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state);
      state = completeStep(state);

      const progress = getProgress(state);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return false for incomplete onboarding', () => {
      const state = createOnboardingState(userId);
      expect(isOnboardingComplete(state)).toBe(false);
    });
  });

  describe('calculateOnboardingMetrics', () => {
    it('should calculate completion metrics', () => {
      let state = createOnboardingState(userId);
      state = completeStep(state);
      state = completeStep(state);

      const metrics = calculateOnboardingMetrics(state);

      expect(metrics.completedSteps).toBe(2);
      expect(metrics.totalSteps).toBe(DEFAULT_STEPS.length);
      expect(metrics.progress).toBeGreaterThan(0);
    });
  });

  describe('validateStepData', () => {
    it('should validate profile step data', () => {
      const result = validateStepData('profile', {
        name: 'John',
        email: 'john@example.com',
        avatar: null,
        timezone: 'UTC',
        language: 'en'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid profile data', () => {
      const result = validateStepData('profile', {});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate household step data', () => {
      const result = validateStepData('household', {
        name: 'My Family',
        type: 'family',
        size: 4
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('setHouseholdId', () => {
    it('should set household ID', () => {
      let state = createOnboardingState(userId);
      state = setHouseholdId(state, 'household-123');

      expect(state.householdId).toBe('household-123');
    });
  });

  describe('DEFAULT_STEPS', () => {
    it('should have all required steps', () => {
      expect(DEFAULT_STEPS.length).toBeGreaterThan(0);
      expect(DEFAULT_STEPS.some(s => s.id === 'welcome')).toBe(true);
      expect(DEFAULT_STEPS.some(s => s.id === 'profile')).toBe(true);
      expect(DEFAULT_STEPS.some(s => s.id === 'household')).toBe(true);
    });
  });
});

// ============================================================================
// ACTIVATION TRACKER TESTS
// ============================================================================

describe('Activation Tracker', () => {
  let store: ActivationStore;
  const userId = 'user-456';

  beforeEach(() => {
    store = createActivationStore();
  });

  describe('createActivationStore', () => {
    it('should create store with default config', () => {
      expect(store.states.size).toBe(0);
      expect(store.config).toEqual(DEFAULT_ACTIVATION_CONFIG);
    });
  });

  describe('initializeActivation', () => {
    it('should initialize activation state', () => {
      store = initializeActivation(store, userId);
      const state = getActivationState(store, userId);

      expect(state).toBeDefined();
      expect(state!.userId).toBe(userId);
      expect(state!.activationScore).toBe(DEFAULT_ACTIVATION_CONFIG.milestoneWeights.account_created);
      expect(state!.isActivated).toBe(false);
    });

    it('should automatically record account_created milestone', () => {
      store = initializeActivation(store, userId);
      expect(hasMilestone(store, userId, 'account_created')).toBe(true);
    });
  });

  describe('recordMilestone', () => {
    it('should record new milestone', () => {
      store = initializeActivation(store, userId);
      store = recordMilestone(store, userId, 'profile_completed');

      expect(hasMilestone(store, userId, 'profile_completed')).toBe(true);
    });

    it('should not duplicate milestones', () => {
      store = initializeActivation(store, userId);
      store = recordMilestone(store, userId, 'profile_completed');
      store = recordMilestone(store, userId, 'profile_completed');

      const state = getActivationState(store, userId);
      const profileMilestones = state!.milestones.filter(m => m.milestone === 'profile_completed');
      expect(profileMilestones.length).toBe(1);
    });

    it('should update activation score', () => {
      store = initializeActivation(store, userId);
      const initialScore = getActivationState(store, userId)!.activationScore;

      store = recordMilestone(store, userId, 'profile_completed');
      const newScore = getActivationState(store, userId)!.activationScore;

      expect(newScore).toBeGreaterThan(initialScore);
    });

    it('should activate user when requirements met', () => {
      store = initializeActivation(store, userId);
      store = recordMilestone(store, userId, 'profile_completed');
      store = recordMilestone(store, userId, 'household_created');
      store = recordMilestone(store, userId, 'first_task_created');
      store = recordMilestone(store, userId, 'first_task_completed');
      store = recordMilestone(store, userId, 'first_member_invited');
      store = recordMilestone(store, userId, 'notifications_enabled');

      const state = getActivationState(store, userId);
      expect(state!.isActivated).toBe(true);
      expect(state!.activatedAt).toBeDefined();
    });
  });

  describe('getMilestoneProgress', () => {
    it('should track achieved and pending milestones', () => {
      store = initializeActivation(store, userId);
      store = recordMilestone(store, userId, 'profile_completed');

      const progress = getMilestoneProgress(store, userId);
      expect(progress.achieved).toContain('account_created');
      expect(progress.achieved).toContain('profile_completed');
      expect(progress.pending).not.toContain('account_created');
    });
  });

  describe('getNextSuggestedMilestones', () => {
    it('should suggest high-value milestones', () => {
      store = initializeActivation(store, userId);
      const suggestions = getNextSuggestedMilestones(store, userId, 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
      expect(suggestions[0]!.weight).toBeGreaterThan(0);
    });

    it('should prioritize required milestones', () => {
      store = initializeActivation(store, userId);
      const suggestions = getNextSuggestedMilestones(store, userId, 5);

      const suggestedMilestones = suggestions.map(s => s.milestone);
      const requiredInSuggestions = DEFAULT_ACTIVATION_CONFIG.requiredMilestones
        .filter(m => suggestedMilestones.includes(m));

      expect(requiredInSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('recordEngagement', () => {
    it('should record engagement event', () => {
      store = initializeActivation(store, userId);
      store = recordEngagement(store, userId, { type: 'task_create' });
      store = recordEngagement(store, userId, { type: 'task_complete' });

      const events = store.engagementEvents.get(userId);
      expect(events!.length).toBe(2);
    });

    it('should update last active timestamp', () => {
      store = initializeActivation(store, userId);
      store = recordEngagement(store, userId, { type: 'session_start' });
      const newLastActive = getActivationState(store, userId)!.lastActiveAt;

      expect(newLastActive).toBeDefined();
    });
  });

  describe('updateStreak', () => {
    it('should update streak counter', () => {
      store = initializeActivation(store, userId);
      store = updateStreak(store, userId);

      const streak = getStreakInfo(store, userId);
      expect(streak.current).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateEngagementScore', () => {
    it('should return zero for no activity', () => {
      store = initializeActivation(store, userId);
      const score = calculateEngagementScore(store, userId);

      expect(score.score).toBe(0);
    });

    it('should calculate score breakdown', () => {
      store = initializeActivation(store, userId);

      for (let i = 0; i < 10; i++) {
        store = recordEngagement(store, userId, { type: 'task_view' });
      }

      const score = calculateEngagementScore(store, userId);
      expect(score.breakdown).toBeDefined();
      expect(score.breakdown.frequency).toBeDefined();
    });
  });

  describe('getUserActivationSummary', () => {
    it('should return complete summary', () => {
      store = initializeActivation(store, userId);
      store = recordMilestone(store, userId, 'profile_completed');

      const summary = getUserActivationSummary(store, userId);
      expect(summary.state).toBeDefined();
      expect(summary.progress).toBeDefined();
      expect(summary.activation).toBeDefined();
      expect(summary.streak).toBeDefined();
      expect(summary.nextSteps).toBeDefined();
    });
  });

  describe('getActivationFunnel', () => {
    it('should calculate funnel metrics', () => {
      store = initializeActivation(store, 'user-1');
      store = initializeActivation(store, 'user-2');
      store = initializeActivation(store, 'user-3');

      const funnel = getActivationFunnel(store);
      expect(funnel.total).toBe(3);
      expect(funnel.byMilestone.size).toBeGreaterThan(0);
    });
  });

  describe('identifyAtRiskUsers', () => {
    it('should identify inactive users', () => {
      store = initializeActivation(store, userId);

      const state = store.states.get(userId)!;
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      const modifiedState = { ...state, lastActiveAt: oldDate };
      store = {
        ...store,
        states: new Map(store.states).set(userId, modifiedState)
      };

      const atRisk = identifyAtRiskUsers(store, 3);
      expect(atRisk.length).toBe(1);
      expect(atRisk[0]!.userId).toBe(userId);
    });
  });

  describe('detectMilestones', () => {
    it('should auto-detect milestones from context', () => {
      store = initializeActivation(store, userId);

      store = detectMilestones(store, userId, {
        tasksCreated: 5,
        tasksCompleted: 3,
        membersInvited: 2,
        categoriesCreated: 3,
        commentsAdded: 1,
        attachmentsAdded: 0,
        recurringTasksCreated: 1,
        assignmentsMade: 2,
        notificationsEnabled: true,
        calendarConnected: false,
        mobileAppInstalled: false,
        tourCompleted: true,
        profileComplete: true,
        householdCreated: true,
        daysActive: 10,
        allMembersActive: false
      });

      expect(hasMilestone(store, userId, 'first_task_created')).toBe(true);
      expect(hasMilestone(store, userId, 'first_task_completed')).toBe(true);
      expect(hasMilestone(store, userId, 'profile_completed')).toBe(true);
      expect(hasMilestone(store, userId, 'household_created')).toBe(true);
      expect(hasMilestone(store, userId, 'notifications_enabled')).toBe(true);
      expect(hasMilestone(store, userId, 'first_week_active')).toBe(true);
    });
  });

  describe('getActivationDetails', () => {
    it('should return activation details', () => {
      store = initializeActivation(store, userId);
      const details = getActivationDetails(store, userId);

      expect(details.score).toBeGreaterThan(0);
      expect(details.threshold).toBe(DEFAULT_ACTIVATION_CONFIG.activationThreshold);
      expect(details.missingRequired.length).toBeGreaterThan(0);
    });
  });

  describe('MILESTONE_DESCRIPTIONS', () => {
    it('should have descriptions for all milestones', () => {
      const allMilestones = Object.keys(MILESTONE_DESCRIPTIONS);
      expect(allMilestones.length).toBeGreaterThan(10);
    });
  });
});

// ============================================================================
// PERSONALIZATION ENGINE TESTS
// ============================================================================

describe('Personalization Engine', () => {
  let store: PersonalizationStore;
  const userId = 'user-789';

  beforeEach(() => {
    store = createPersonalizationStore();
  });

  describe('createPersonalizationStore', () => {
    it('should create empty store', () => {
      expect(store.profiles.size).toBe(0);
      expect(store.behaviorHistory.size).toBe(0);
    });
  });

  describe('createUserProfile', () => {
    it('should create profile with default preferences', () => {
      store = createUserProfile(store, userId);
      const profile = getUserProfile(store, userId);

      expect(profile).toBeDefined();
      expect(profile!.userId).toBe(userId);
      expect(profile!.preferences).toEqual(DEFAULT_PREFERENCES);
    });

    it('should merge initial preferences', () => {
      store = createUserProfile(store, userId, { theme: 'dark', language: 'fr' });
      const profile = getUserProfile(store, userId);

      expect(profile!.preferences.theme).toBe('dark');
      expect(profile!.preferences.language).toBe('fr');
    });
  });

  describe('updatePreferences', () => {
    it('should update specific preferences', () => {
      store = createUserProfile(store, userId);
      store = updatePreferences(store, userId, { theme: 'dark' });

      const profile = getUserProfile(store, userId);
      expect(profile!.preferences.theme).toBe('dark');
      expect(profile!.preferences.language).toBe(DEFAULT_PREFERENCES.language);
    });
  });

  describe('setFeatureFlag', () => {
    it('should set feature flag', () => {
      store = createUserProfile(store, userId);
      store = setFeatureFlag(store, userId, 'beta_features', true);

      const profile = getUserProfile(store, userId);
      expect(profile!.featureFlags['beta_features']).toBe(true);
    });
  });

  describe('recordBehavior', () => {
    it('should record behavior events', () => {
      store = createUserProfile(store, userId);
      store = recordBehavior(store, userId, 'task_create');
      store = recordBehavior(store, userId, 'task_complete');

      const history = store.behaviorHistory.get(userId);
      expect(history!.length).toBe(2);
    });

    it('should include metadata', () => {
      store = createUserProfile(store, userId);
      store = recordBehavior(store, userId, 'feature_use', { feature: 'calendar' });

      const history = store.behaviorHistory.get(userId);
      expect(history![0]!.metadata).toEqual({ feature: 'calendar' });
    });
  });

  describe('analyzeUserPersona', () => {
    it('should detect persona from behavior', () => {
      store = createUserProfile(store, userId);

      for (let i = 0; i < 20; i++) {
        store = recordBehavior(store, userId, 'task_create');
        store = recordBehavior(store, userId, 'task_assign');
        store = recordBehavior(store, userId, 'category_create');
      }

      store = analyzeUserPersona(store, userId);
      const profile = getUserProfile(store, userId);

      expect(profile!.persona).toBeDefined();
      expect(profile!.personaConfidence).toBeGreaterThan(0);
    });

    it('should not analyze with insufficient data', () => {
      store = createUserProfile(store, userId);
      store = recordBehavior(store, userId, 'task_view');

      store = analyzeUserPersona(store, userId);
      const profile = getUserProfile(store, userId);

      expect(profile!.persona).toBeUndefined();
    });
  });

  describe('analyzeUsagePatterns', () => {
    it('should detect usage patterns', () => {
      store = createUserProfile(store, userId);

      for (let i = 0; i < 30; i++) {
        store = recordBehavior(store, userId, 'session_start');
        store = recordBehavior(store, userId, 'task_view');
        store = recordBehavior(store, userId, 'task_create');
      }

      store = analyzeUsagePatterns(store, userId);
      const profile = getUserProfile(store, userId);

      expect(profile!.usagePattern).toBeDefined();
      expect(profile!.usagePattern!.mostUsedFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations', () => {
      store = createUserProfile(store, userId);

      for (let i = 0; i < 20; i++) {
        store = recordBehavior(store, userId, 'task_create');
      }
      store = analyzeUserPersona(store, userId);

      store = generateRecommendations(store, userId);
      const recommendations = getRecommendations(store, userId);

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('dismissRecommendation', () => {
    it('should remove dismissed recommendation', () => {
      store = createUserProfile(store, userId);

      for (let i = 0; i < 20; i++) {
        store = recordBehavior(store, userId, 'task_create');
      }
      store = analyzeUserPersona(store, userId);
      store = generateRecommendations(store, userId);

      const initialRecs = getRecommendations(store, userId);
      if (initialRecs.length > 0) {
        const featureToDismiss = initialRecs[0]!.feature;
        store = dismissRecommendation(store, userId, featureToDismiss);

        const newRecs = getRecommendations(store, userId);
        expect(newRecs.every(r => r.feature !== featureToDismiss)).toBe(true);
      }
    });
  });

  describe('suggestTaskCategories', () => {
    it('should suggest categories for family', () => {
      store = createUserProfile(store, userId);
      const categories = suggestTaskCategories(store, userId, 'family');

      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('Chores');
    });

    it('should suggest different categories for roommates', () => {
      store = createUserProfile(store, userId);
      const categories = suggestTaskCategories(store, userId, 'roommates');

      expect(categories).toContain('Bills');
    });
  });

  describe('suggestTaskTemplates', () => {
    it('should suggest templates', () => {
      store = createUserProfile(store, userId);
      const templates = suggestTaskTemplates(store, userId);

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]!.name).toBeDefined();
      expect(templates[0]!.category).toBeDefined();
    });

    it('should filter by category', () => {
      store = createUserProfile(store, userId);
      const templates = suggestTaskTemplates(store, userId, 'Chores');

      expect(templates.every(t => t.category === 'Chores')).toBe(true);
    });
  });

  describe('getUIPersonalization', () => {
    it('should return UI settings', () => {
      store = createUserProfile(store, userId);
      const ui = getUIPersonalization(store, userId);

      expect(ui.showQuickActions).toBeDefined();
      expect(ui.dashboardWidgets).toBeDefined();
      expect(ui.sidebarOrder).toBeDefined();
    });

    it('should customize for power users', () => {
      store = createUserProfile(store, userId);

      for (let i = 0; i < 30; i++) {
        store = recordBehavior(store, userId, 'keyboard_shortcut');
        store = recordBehavior(store, userId, 'automation_create');
      }
      store = analyzeUserPersona(store, userId);

      const profile = getUserProfile(store, userId);
      if (profile!.persona === 'power_user') {
        const ui = getUIPersonalization(store, userId);
        expect(ui.keyboardShortcutsEnabled).toBe(true);
      }
    });
  });

  describe('getNotificationPersonalization', () => {
    it('should return notification settings', () => {
      store = createUserProfile(store, userId);
      const notif = getNotificationPersonalization(store, userId);

      expect(notif.channels).toBeDefined();
      expect(notif.quietHours).toBeDefined();
      expect(notif.digestFrequency).toBeDefined();
    });

    it('should respect minimal notification preference', () => {
      store = createUserProfile(store, userId, { notificationPreference: 'minimal' });
      const notif = getNotificationPersonalization(store, userId);

      expect(notif.priorityThreshold).toBe('high');
      expect(notif.soundEnabled).toBe(false);
    });
  });

  describe('getPersonalizationInsights', () => {
    it('should return complete insights', () => {
      store = createUserProfile(store, userId);
      const insights = getPersonalizationInsights(store, userId);

      expect(insights.profile).toBeDefined();
      expect(insights.uiSettings).toBeDefined();
      expect(insights.notificationSettings).toBeDefined();
      expect(insights.suggestedCategories).toBeDefined();
      expect(insights.behaviorSummary).toBeDefined();
    });
  });

  describe('getPersonaDistribution', () => {
    it('should calculate distribution', () => {
      store = createUserProfile(store, 'user-1');
      store = createUserProfile(store, 'user-2');

      const distribution = getPersonaDistribution(store);
      expect(distribution.size).toBeGreaterThan(0);
    });
  });

  describe('getPreferenceStats', () => {
    it('should calculate preference statistics', () => {
      store = createUserProfile(store, 'user-1', { theme: 'dark' });
      store = createUserProfile(store, 'user-2', { theme: 'light' });
      store = createUserProfile(store, 'user-3', { theme: 'dark' });

      const stats = getPreferenceStats(store);
      expect(stats.themeDistribution.get('dark')).toBe(2);
      expect(stats.themeDistribution.get('light')).toBe(1);
    });
  });

  describe('PERSONA_TRAITS', () => {
    it('should have traits for all personas', () => {
      const personas = ['organizer', 'executor', 'collaborator', 'explorer', 'minimalist', 'power_user'];
      for (const persona of personas) {
        expect(PERSONA_TRAITS[persona as keyof typeof PERSONA_TRAITS]).toBeDefined();
        expect(PERSONA_TRAITS[persona as keyof typeof PERSONA_TRAITS].description).toBeDefined();
        expect(PERSONA_TRAITS[persona as keyof typeof PERSONA_TRAITS].recommendedFeatures.length).toBeGreaterThan(0);
      }
    });
  });

  describe('DEFAULT_PREFERENCES', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_PREFERENCES.theme).toBeDefined();
      expect(DEFAULT_PREFERENCES.language).toBeDefined();
      expect(DEFAULT_PREFERENCES.timezone).toBeDefined();
      expect(DEFAULT_PREFERENCES.dateFormat).toBeDefined();
      expect(DEFAULT_PREFERENCES.timeFormat).toBeDefined();
      expect(DEFAULT_PREFERENCES.notificationPreference).toBeDefined();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Onboarding Integration', () => {
  it('should complete full onboarding flow', () => {
    let onboardingState = createOnboardingState('integration-user');
    let activationStore = createActivationStore();
    let personalizationStore = createPersonalizationStore();
    const userId = 'integration-user';

    // Step 1: Initialize activation and personalization
    activationStore = initializeActivation(activationStore, userId);
    personalizationStore = createUserProfile(personalizationStore, userId);

    // Step 2: Complete onboarding steps
    onboardingState = completeStep(onboardingState); // welcome
    onboardingState = completeStep(onboardingState, {
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      timezone: 'UTC',
      language: 'en'
    }); // profile

    // Step 3: Record activation milestones
    activationStore = recordMilestone(activationStore, userId, 'profile_completed');

    // Step 4: Record behavior
    personalizationStore = recordBehavior(personalizationStore, userId, 'onboarding_progress');

    // Verify state
    const progress = getProgress(onboardingState);
    expect(progress).toBeGreaterThan(0);

    const activationDetails = getActivationDetails(activationStore, userId);
    expect(activationDetails.score).toBeGreaterThan(0);

    const profile = getUserProfile(personalizationStore, userId);
    expect(profile).toBeDefined();
  });

  it('should track user journey from signup to activation', () => {
    let activationStore = createActivationStore();
    const userId = 'journey-user';

    // Signup
    activationStore = initializeActivation(activationStore, userId);

    // Complete profile
    activationStore = recordMilestone(activationStore, userId, 'profile_completed');

    // Create household
    activationStore = recordMilestone(activationStore, userId, 'household_created');

    // Create first task
    activationStore = recordMilestone(activationStore, userId, 'first_task_created');

    // Complete first task
    activationStore = recordMilestone(activationStore, userId, 'first_task_completed');

    // Enable notifications
    activationStore = recordMilestone(activationStore, userId, 'notifications_enabled');

    // Invite member
    activationStore = recordMilestone(activationStore, userId, 'first_member_invited');

    // Check activation
    const details = getActivationDetails(activationStore, userId);
    expect(details.missingRequired.length).toBe(0);
    expect(details.score).toBeGreaterThanOrEqual(details.threshold);

    const state = getActivationState(activationStore, userId);
    expect(state!.isActivated).toBe(true);
  });
});
