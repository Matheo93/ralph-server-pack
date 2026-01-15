/**
 * Onboarding API Routes
 * Handles onboarding wizard, activation tracking, and personalization
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Import onboarding modules
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
  OnboardingState,
  SetupStepType
} from '@/lib/onboarding/guided-setup';

import {
  createActivationStore,
  initializeActivation,
  recordMilestone,
  recordEngagement,
  updateStreak,
  getActivationState,
  getMilestoneProgress,
  getActivationDetails,
  getStreakInfo,
  calculateEngagementScore,
  getUserActivationSummary,
  getActivationFunnel,
  identifyAtRiskUsers,
  detectMilestones,
  ActivationMilestone,
  ActivationStore,
  MilestoneDetectionContext
} from '@/lib/onboarding/activation-tracker';

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
  PersonalizationStore,
  Preference
} from '@/lib/onboarding/personalization-engine';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const OnboardingActionSchema = z.discriminatedUnion('action', [
  // Onboarding state management
  z.object({
    action: z.literal('create_state'),
    userId: z.string(),
    source: z.enum(['organic', 'referral', 'ad', 'social', 'unknown']).optional()
  }),
  z.object({
    action: z.literal('complete_step'),
    userId: z.string(),
    stepData: z.record(z.string(), z.unknown()).optional()
  }),
  z.object({
    action: z.literal('skip_step'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('previous_step'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('go_to_step'),
    userId: z.string(),
    stepIndex: z.number()
  }),
  z.object({
    action: z.literal('set_household'),
    userId: z.string(),
    householdId: z.string()
  }),
  z.object({
    action: z.literal('get_state'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_metrics'),
    userId: z.string()
  }),

  // Activation tracking
  z.object({
    action: z.literal('init_activation'),
    userId: z.string(),
    householdId: z.string().optional()
  }),
  z.object({
    action: z.literal('record_milestone'),
    userId: z.string(),
    milestone: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional()
  }),
  z.object({
    action: z.literal('record_engagement'),
    userId: z.string(),
    eventType: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    sessionId: z.string().optional()
  }),
  z.object({
    action: z.literal('update_streak'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_activation_state'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_activation_summary'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_activation_funnel')
  }),
  z.object({
    action: z.literal('get_at_risk_users'),
    inactiveDays: z.number().optional()
  }),
  z.object({
    action: z.literal('detect_milestones'),
    userId: z.string(),
    context: z.object({
      tasksCreated: z.number(),
      tasksCompleted: z.number(),
      membersInvited: z.number(),
      categoriesCreated: z.number(),
      commentsAdded: z.number(),
      attachmentsAdded: z.number(),
      recurringTasksCreated: z.number(),
      assignmentsMade: z.number(),
      notificationsEnabled: z.boolean(),
      calendarConnected: z.boolean(),
      mobileAppInstalled: z.boolean(),
      tourCompleted: z.boolean(),
      profileComplete: z.boolean(),
      householdCreated: z.boolean(),
      daysActive: z.number(),
      allMembersActive: z.boolean()
    })
  }),

  // Personalization
  z.object({
    action: z.literal('create_profile'),
    userId: z.string(),
    initialPreferences: z.record(z.string(), z.unknown()).optional()
  }),
  z.object({
    action: z.literal('get_profile'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('update_preferences'),
    userId: z.string(),
    preferences: z.record(z.string(), z.unknown())
  }),
  z.object({
    action: z.literal('set_feature_flag'),
    userId: z.string(),
    flag: z.string(),
    value: z.boolean()
  }),
  z.object({
    action: z.literal('record_behavior'),
    userId: z.string(),
    eventType: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional()
  }),
  z.object({
    action: z.literal('analyze_persona'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('analyze_patterns'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_recommendations'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('dismiss_recommendation'),
    userId: z.string(),
    feature: z.string()
  }),
  z.object({
    action: z.literal('suggest_categories'),
    userId: z.string(),
    householdType: z.enum(['family', 'roommates', 'couple', 'single'])
  }),
  z.object({
    action: z.literal('suggest_templates'),
    userId: z.string(),
    category: z.string().optional()
  }),
  z.object({
    action: z.literal('get_ui_personalization'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_notification_personalization'),
    userId: z.string()
  }),
  z.object({
    action: z.literal('get_personalization_insights'),
    userId: z.string()
  })
]);

type OnboardingAction = z.infer<typeof OnboardingActionSchema>;

// ============================================================================
// IN-MEMORY STORES (would be replaced with database in production)
// ============================================================================

const onboardingStates = new Map<string, OnboardingState>();
let activationStore: ActivationStore = createActivationStore();
let personalizationStore: PersonalizationStore = createPersonalizationStore();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function serializeOnboardingState(state: OnboardingState | undefined): unknown {
  if (!state) return null;
  return {
    ...state,
    startedAt: state.startedAt.toISOString(),
    completedAt: state.completedAt?.toISOString(),
    lastActivityAt: state.lastActivityAt.toISOString(),
    steps: state.steps.map(s => ({
      ...s,
      completedAt: s.completedAt?.toISOString(),
      skippedAt: s.skippedAt?.toISOString()
    }))
  };
}

function serializeActivationState(state: ReturnType<typeof getActivationState>): unknown {
  if (!state) return null;
  return {
    ...state,
    startedAt: state.startedAt.toISOString(),
    activatedAt: state.activatedAt?.toISOString(),
    lastActiveAt: state.lastActiveAt?.toISOString(),
    milestones: state.milestones.map(m => ({
      ...m,
      achievedAt: m.achievedAt.toISOString()
    }))
  };
}

function serializeUserProfile(profile: ReturnType<typeof getUserProfile>): unknown {
  if (!profile) return null;
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    lastAnalyzedAt: profile.lastAnalyzedAt?.toISOString()
  };
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = OnboardingActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const action = parsed.data;

    switch (action.action) {
      // ======================================================================
      // ONBOARDING STATE MANAGEMENT
      // ======================================================================

      case 'create_state': {
        const state = createOnboardingState(action.userId, action.source);
        onboardingStates.set(action.userId, state);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(state)
        });
      }

      case 'complete_step': {
        const current = onboardingStates.get(action.userId);
        if (!current) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const newState = completeStep(current, action.stepData);
        onboardingStates.set(action.userId, newState);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(newState)
        });
      }

      case 'skip_step': {
        const current = onboardingStates.get(action.userId);
        if (!current) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const newState = skipStep(current);
        onboardingStates.set(action.userId, newState);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(newState)
        });
      }

      case 'previous_step': {
        const current = onboardingStates.get(action.userId);
        if (!current) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const newState = goToPreviousStep(current);
        onboardingStates.set(action.userId, newState);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(newState)
        });
      }

      case 'go_to_step': {
        const current = onboardingStates.get(action.userId);
        if (!current) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const newState = goToStep(current, action.stepIndex);
        onboardingStates.set(action.userId, newState);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(newState)
        });
      }

      case 'set_household': {
        const current = onboardingStates.get(action.userId);
        if (!current) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const newState = setHouseholdId(current, action.householdId);
        onboardingStates.set(action.userId, newState);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(newState)
        });
      }

      case 'get_state': {
        const state = onboardingStates.get(action.userId);
        return NextResponse.json({
          success: true,
          state: serializeOnboardingState(state),
          progress: state ? getProgress(state) : 0,
          isComplete: state ? isOnboardingComplete(state) : false,
          currentStep: state ? getCurrentStep(state) : null
        });
      }

      case 'get_metrics': {
        const state = onboardingStates.get(action.userId);
        if (!state) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        const metrics = calculateOnboardingMetrics(state);
        return NextResponse.json({ success: true, metrics });
      }

      // ======================================================================
      // ACTIVATION TRACKING
      // ======================================================================

      case 'init_activation': {
        activationStore = initializeActivation(
          activationStore,
          action.userId,
          action.householdId
        );
        const state = getActivationState(activationStore, action.userId);
        return NextResponse.json({
          success: true,
          state: serializeActivationState(state)
        });
      }

      case 'record_milestone': {
        activationStore = recordMilestone(
          activationStore,
          action.userId,
          action.milestone as ActivationMilestone,
          action.metadata
        );
        const state = getActivationState(activationStore, action.userId);
        return NextResponse.json({
          success: true,
          state: serializeActivationState(state)
        });
      }

      case 'record_engagement': {
        activationStore = recordEngagement(activationStore, action.userId, {
          type: action.eventType as Parameters<typeof recordEngagement>[2]['type'],
          metadata: action.metadata,
          sessionId: action.sessionId
        });
        return NextResponse.json({ success: true });
      }

      case 'update_streak': {
        activationStore = updateStreak(activationStore, action.userId);
        const streak = getStreakInfo(activationStore, action.userId);
        return NextResponse.json({ success: true, streak });
      }

      case 'get_activation_state': {
        const state = getActivationState(activationStore, action.userId);
        return NextResponse.json({
          success: true,
          state: serializeActivationState(state)
        });
      }

      case 'get_activation_summary': {
        const summary = getUserActivationSummary(activationStore, action.userId);
        return NextResponse.json({
          success: true,
          summary: {
            ...summary,
            state: serializeActivationState(summary.state)
          }
        });
      }

      case 'get_activation_funnel': {
        const funnel = getActivationFunnel(activationStore);
        return NextResponse.json({
          success: true,
          funnel: {
            ...funnel,
            byMilestone: Object.fromEntries(funnel.byMilestone)
          }
        });
      }

      case 'get_at_risk_users': {
        const atRisk = identifyAtRiskUsers(
          activationStore,
          action.inactiveDays ?? 3
        );
        return NextResponse.json({
          success: true,
          atRiskUsers: atRisk.map(u => ({
            ...u,
            state: serializeActivationState(u.state)
          }))
        });
      }

      case 'detect_milestones': {
        activationStore = detectMilestones(
          activationStore,
          action.userId,
          action.context as MilestoneDetectionContext
        );
        const state = getActivationState(activationStore, action.userId);
        return NextResponse.json({
          success: true,
          state: serializeActivationState(state)
        });
      }

      // ======================================================================
      // PERSONALIZATION
      // ======================================================================

      case 'create_profile': {
        personalizationStore = createUserProfile(
          personalizationStore,
          action.userId,
          action.initialPreferences as Partial<Preference>
        );
        const profile = getUserProfile(personalizationStore, action.userId);
        return NextResponse.json({
          success: true,
          profile: serializeUserProfile(profile)
        });
      }

      case 'get_profile': {
        const profile = getUserProfile(personalizationStore, action.userId);
        return NextResponse.json({
          success: true,
          profile: serializeUserProfile(profile)
        });
      }

      case 'update_preferences': {
        personalizationStore = updatePreferences(
          personalizationStore,
          action.userId,
          action.preferences as Partial<Preference>
        );
        const profile = getUserProfile(personalizationStore, action.userId);
        return NextResponse.json({
          success: true,
          profile: serializeUserProfile(profile)
        });
      }

      case 'set_feature_flag': {
        personalizationStore = setFeatureFlag(
          personalizationStore,
          action.userId,
          action.flag,
          action.value
        );
        const profile = getUserProfile(personalizationStore, action.userId);
        return NextResponse.json({
          success: true,
          profile: serializeUserProfile(profile)
        });
      }

      case 'record_behavior': {
        personalizationStore = recordBehavior(
          personalizationStore,
          action.userId,
          action.eventType,
          action.metadata
        );
        return NextResponse.json({ success: true });
      }

      case 'analyze_persona': {
        personalizationStore = analyzeUserPersona(
          personalizationStore,
          action.userId
        );
        const profile = getUserProfile(personalizationStore, action.userId);
        return NextResponse.json({
          success: true,
          profile: serializeUserProfile(profile)
        });
      }

      case 'analyze_patterns': {
        personalizationStore = analyzeUsagePatterns(
          personalizationStore,
          action.userId
        );
        const profile = getUserProfile(personalizationStore, action.userId);
        return NextResponse.json({
          success: true,
          profile: serializeUserProfile(profile)
        });
      }

      case 'get_recommendations': {
        personalizationStore = generateRecommendations(
          personalizationStore,
          action.userId
        );
        const recommendations = getRecommendations(
          personalizationStore,
          action.userId
        );
        return NextResponse.json({ success: true, recommendations });
      }

      case 'dismiss_recommendation': {
        personalizationStore = dismissRecommendation(
          personalizationStore,
          action.userId,
          action.feature
        );
        return NextResponse.json({ success: true });
      }

      case 'suggest_categories': {
        const categories = suggestTaskCategories(
          personalizationStore,
          action.userId,
          action.householdType
        );
        return NextResponse.json({ success: true, categories });
      }

      case 'suggest_templates': {
        const templates = suggestTaskTemplates(
          personalizationStore,
          action.userId,
          action.category
        );
        return NextResponse.json({ success: true, templates });
      }

      case 'get_ui_personalization': {
        const uiSettings = getUIPersonalization(
          personalizationStore,
          action.userId
        );
        return NextResponse.json({ success: true, uiSettings });
      }

      case 'get_notification_personalization': {
        const notificationSettings = getNotificationPersonalization(
          personalizationStore,
          action.userId
        );
        return NextResponse.json({ success: true, notificationSettings });
      }

      case 'get_personalization_insights': {
        const insights = getPersonalizationInsights(
          personalizationStore,
          action.userId
        );
        return NextResponse.json({
          success: true,
          insights: {
            ...insights,
            profile: serializeUserProfile(insights.profile)
          }
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER - Health check and stats
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const onboardingCount = onboardingStates.size;
    const activationCount = activationStore.states.size;
    const personalizationCount = personalizationStore.profiles.size;

    const funnel = getActivationFunnel(activationStore);

    return NextResponse.json({
      status: 'healthy',
      stats: {
        onboardingUsers: onboardingCount,
        activationUsers: activationCount,
        personalizationProfiles: personalizationCount,
        activationRate: funnel.activationRate,
        avgTimeToActivation: funnel.avgTimeToActivation
      }
    });
  } catch (error) {
    console.error('Onboarding API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
