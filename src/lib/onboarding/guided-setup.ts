/**
 * Guided Setup - Step-by-step onboarding wizard
 * Functional, immutable approach to onboarding flows
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const SetupStepStatus = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
])
export type SetupStepStatus = z.infer<typeof SetupStepStatus>

export const SetupStepType = z.enum([
  "welcome",
  "profile",
  "household",
  "invite_members",
  "categories",
  "first_task",
  "notifications",
  "tour",
  "complete",
])
export type SetupStepType = z.infer<typeof SetupStepType>

export const SetupStepSchema = z.object({
  id: SetupStepType,
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  status: SetupStepStatus,
  required: z.boolean(),
  order: z.number(),
  estimatedMinutes: z.number(),
  completedAt: z.date().nullable(),
  skippedAt: z.date().nullable(),
  data: z.record(z.string(), z.unknown()).default({}),
})
export type SetupStep = z.infer<typeof SetupStepSchema>

export const OnboardingStateSchema = z.object({
  userId: z.string(),
  householdId: z.string().nullable(),
  steps: z.array(SetupStepSchema),
  currentStepIndex: z.number(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  lastActivityAt: z.date(),
  source: z.enum(["organic", "referral", "ad", "social", "unknown"]).default("unknown"),
  metadata: z.record(z.string(), z.string()).default({}),
})
export type OnboardingState = z.infer<typeof OnboardingStateSchema>

export const ProfileDataSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  avatar: z.string().nullable(),
  timezone: z.string(),
  language: z.string(),
})
export type ProfileData = z.infer<typeof ProfileDataSchema>

export const HouseholdDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["family", "couple", "roommates", "other"]),
  size: z.number().min(1).max(20),
})
export type HouseholdData = z.infer<typeof HouseholdDataSchema>

export const InviteMembersDataSchema = z.object({
  invitations: z.array(z.object({
    email: z.string().email(),
    role: z.enum(["parent", "child", "other"]),
    name: z.string().optional(),
  })),
})
export type InviteMembersData = z.infer<typeof InviteMembersDataSchema>

export const CategoriesDataSchema = z.object({
  selectedCategories: z.array(z.string()),
  customCategories: z.array(z.string()),
})
export type CategoriesData = z.infer<typeof CategoriesDataSchema>

export const FirstTaskDataSchema = z.object({
  title: z.string().min(1),
  category: z.string(),
  assigneeId: z.string().nullable(),
  deadline: z.date().nullable(),
})
export type FirstTaskData = z.infer<typeof FirstTaskDataSchema>

export const NotificationsDataSchema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  reminderTiming: z.number(), // hours before deadline
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
})
export type NotificationsData = z.infer<typeof NotificationsDataSchema>

// =============================================================================
// DEFAULT STEPS
// =============================================================================

export const DEFAULT_STEPS: Omit<SetupStep, "status" | "completedAt" | "skippedAt" | "data">[] = [
  {
    id: "welcome",
    title: "Bienvenue !",
    description: "Découvrez FamilyLoad en quelques étapes",
    icon: "👋",
    required: true,
    order: 0,
    estimatedMinutes: 1,
  },
  {
    id: "profile",
    title: "Votre profil",
    description: "Configurez votre profil utilisateur",
    icon: "👤",
    required: true,
    order: 1,
    estimatedMinutes: 2,
  },
  {
    id: "household",
    title: "Votre foyer",
    description: "Créez ou rejoignez un foyer",
    icon: "🏠",
    required: true,
    order: 2,
    estimatedMinutes: 2,
  },
  {
    id: "invite_members",
    title: "Inviter la famille",
    description: "Ajoutez les membres de votre famille",
    icon: "👨‍👩‍👧‍👦",
    required: false,
    order: 3,
    estimatedMinutes: 3,
  },
  {
    id: "categories",
    title: "Catégories",
    description: "Choisissez vos catégories de tâches",
    icon: "📁",
    required: false,
    order: 4,
    estimatedMinutes: 2,
  },
  {
    id: "first_task",
    title: "Première tâche",
    description: "Créez votre première tâche",
    icon: "✅",
    required: false,
    order: 5,
    estimatedMinutes: 2,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configurez vos préférences de notification",
    icon: "🔔",
    required: false,
    order: 6,
    estimatedMinutes: 2,
  },
  {
    id: "tour",
    title: "Visite guidée",
    description: "Découvrez les fonctionnalités principales",
    icon: "🎯",
    required: false,
    order: 7,
    estimatedMinutes: 3,
  },
  {
    id: "complete",
    title: "C'est parti !",
    description: "Vous êtes prêt à utiliser FamilyLoad",
    icon: "🎉",
    required: true,
    order: 8,
    estimatedMinutes: 1,
  },
]

export const PRESET_CATEGORIES = [
  { id: "menage", name: "Ménage", icon: "🧹" },
  { id: "cuisine", name: "Cuisine", icon: "🍳" },
  { id: "courses", name: "Courses", icon: "🛒" },
  { id: "linge", name: "Linge", icon: "👕" },
  { id: "jardin", name: "Jardin", icon: "🌱" },
  { id: "bricolage", name: "Bricolage", icon: "🔧" },
  { id: "enfants", name: "Enfants", icon: "👶" },
  { id: "animaux", name: "Animaux", icon: "🐾" },
  { id: "admin", name: "Administratif", icon: "📋" },
  { id: "sante", name: "Santé", icon: "💊" },
]

// =============================================================================
// ONBOARDING STATE MANAGEMENT
// =============================================================================

/**
 * Create initial onboarding state
 */
export function createOnboardingState(
  userId: string,
  source: OnboardingState["source"] = "unknown"
): OnboardingState {
  const now = new Date()
  const steps: SetupStep[] = DEFAULT_STEPS.map((step) => ({
    ...step,
    status: "pending",
    completedAt: null,
    skippedAt: null,
    data: {},
  }))

  // Mark welcome as in_progress
  steps[0]!.status = "in_progress"

  return {
    userId,
    householdId: null,
    steps,
    currentStepIndex: 0,
    startedAt: now,
    completedAt: null,
    lastActivityAt: now,
    source,
    metadata: {},
  }
}

/**
 * Get current step
 */
export function getCurrentStep(state: OnboardingState): SetupStep | null {
  return state.steps[state.currentStepIndex] ?? null
}

/**
 * Get step by ID
 */
export function getStepById(
  state: OnboardingState,
  stepId: SetupStepType
): SetupStep | null {
  return state.steps.find((s) => s.id === stepId) ?? null
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.completedAt !== null ||
    state.steps.every((s) => s.status === "completed" || s.status === "skipped" || !s.required)
}

/**
 * Get progress percentage
 */
export function getProgress(state: OnboardingState): number {
  const completed = state.steps.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  ).length
  return Math.round((completed / state.steps.length) * 100)
}

/**
 * Get remaining time estimate
 */
export function getRemainingTimeEstimate(state: OnboardingState): number {
  return state.steps
    .filter((s) => s.status === "pending" || s.status === "in_progress")
    .reduce((sum, s) => sum + s.estimatedMinutes, 0)
}

// =============================================================================
// STEP TRANSITIONS
// =============================================================================

/**
 * Complete current step and move to next
 */
export function completeStep(
  state: OnboardingState,
  stepData?: Record<string, unknown>
): OnboardingState {
  const now = new Date()
  const currentStep = state.steps[state.currentStepIndex]

  if (!currentStep) {
    return state
  }

  const updatedSteps = state.steps.map((step, index) => {
    if (index === state.currentStepIndex) {
      return {
        ...step,
        status: "completed" as SetupStepStatus,
        completedAt: now,
        data: stepData ?? step.data,
      }
    }
    if (index === state.currentStepIndex + 1) {
      return {
        ...step,
        status: "in_progress" as SetupStepStatus,
      }
    }
    return step
  })

  const nextIndex = state.currentStepIndex + 1
  const isComplete = nextIndex >= state.steps.length

  return {
    ...state,
    steps: updatedSteps,
    currentStepIndex: isComplete ? state.currentStepIndex : nextIndex,
    completedAt: isComplete ? now : null,
    lastActivityAt: now,
  }
}

/**
 * Skip current step and move to next
 */
export function skipStep(state: OnboardingState): OnboardingState {
  const now = new Date()
  const currentStep = state.steps[state.currentStepIndex]

  if (!currentStep || currentStep.required) {
    return state // Cannot skip required steps
  }

  const updatedSteps = state.steps.map((step, index) => {
    if (index === state.currentStepIndex) {
      return {
        ...step,
        status: "skipped" as SetupStepStatus,
        skippedAt: now,
      }
    }
    if (index === state.currentStepIndex + 1) {
      return {
        ...step,
        status: "in_progress" as SetupStepStatus,
      }
    }
    return step
  })

  const nextIndex = state.currentStepIndex + 1
  const isComplete = nextIndex >= state.steps.length

  return {
    ...state,
    steps: updatedSteps,
    currentStepIndex: isComplete ? state.currentStepIndex : nextIndex,
    completedAt: isComplete ? now : null,
    lastActivityAt: now,
  }
}

/**
 * Go back to previous step
 */
export function goToPreviousStep(state: OnboardingState): OnboardingState {
  if (state.currentStepIndex === 0) {
    return state
  }

  const now = new Date()
  const prevIndex = state.currentStepIndex - 1

  const updatedSteps = state.steps.map((step, index) => {
    if (index === state.currentStepIndex) {
      return {
        ...step,
        status: "pending" as SetupStepStatus,
      }
    }
    if (index === prevIndex) {
      return {
        ...step,
        status: "in_progress" as SetupStepStatus,
        completedAt: null,
        skippedAt: null,
      }
    }
    return step
  })

  return {
    ...state,
    steps: updatedSteps,
    currentStepIndex: prevIndex,
    lastActivityAt: now,
  }
}

/**
 * Go to specific step
 */
export function goToStep(
  state: OnboardingState,
  stepIndex: number
): OnboardingState {
  if (stepIndex < 0 || stepIndex >= state.steps.length) {
    return state
  }

  // Can only go to completed/skipped steps or the next uncompleted one
  const targetStep = state.steps[stepIndex]!
  const canGoTo = targetStep.status === "completed" ||
    targetStep.status === "skipped" ||
    stepIndex <= state.currentStepIndex + 1

  if (!canGoTo) {
    return state
  }

  const now = new Date()
  const updatedSteps = state.steps.map((step, index) => {
    if (index === state.currentStepIndex && state.currentStepIndex !== stepIndex) {
      return {
        ...step,
        status: step.status === "in_progress" ? "pending" as SetupStepStatus : step.status,
      }
    }
    if (index === stepIndex) {
      return {
        ...step,
        status: "in_progress" as SetupStepStatus,
      }
    }
    return step
  })

  return {
    ...state,
    steps: updatedSteps,
    currentStepIndex: stepIndex,
    lastActivityAt: now,
  }
}

// =============================================================================
// DATA VALIDATION
// =============================================================================

/**
 * Validate step data
 */
export function validateStepData(
  stepId: SetupStepType,
  data: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (stepId) {
    case "profile": {
      const result = ProfileDataSchema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map((i) => i.message))
      }
      break
    }

    case "household": {
      const result = HouseholdDataSchema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map((i) => i.message))
      }
      break
    }

    case "invite_members": {
      const result = InviteMembersDataSchema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map((i) => i.message))
      }
      break
    }

    case "categories": {
      const result = CategoriesDataSchema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map((i) => i.message))
      }
      break
    }

    case "first_task": {
      const result = FirstTaskDataSchema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map((i) => i.message))
      }
      break
    }

    case "notifications": {
      const result = NotificationsDataSchema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map((i) => i.message))
      }
      break
    }

    default:
      // Steps without data validation (welcome, tour, complete)
      break
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Complete step with validation
 */
export function completeStepWithValidation(
  state: OnboardingState,
  data: unknown
): { state: OnboardingState; valid: boolean; errors: string[] } {
  const currentStep = getCurrentStep(state)
  if (!currentStep) {
    return { state, valid: false, errors: ["No current step"] }
  }

  const { valid, errors } = validateStepData(currentStep.id, data)

  if (!valid) {
    return { state, valid: false, errors }
  }

  const newState = completeStep(state, data as Record<string, unknown>)
  return { state: newState, valid: true, errors: [] }
}

// =============================================================================
// HOUSEHOLD SETUP
// =============================================================================

/**
 * Set household ID after creation
 */
export function setHouseholdId(
  state: OnboardingState,
  householdId: string
): OnboardingState {
  return {
    ...state,
    householdId,
    lastActivityAt: new Date(),
  }
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface OnboardingMetrics {
  totalSteps: number
  completedSteps: number
  skippedSteps: number
  pendingSteps: number
  progress: number
  timeSpentMinutes: number
  averageStepTimeMinutes: number
  dropOffStep: SetupStepType | null
}

/**
 * Calculate onboarding metrics
 */
export function calculateOnboardingMetrics(state: OnboardingState): OnboardingMetrics {
  const completed = state.steps.filter((s) => s.status === "completed")
  const skipped = state.steps.filter((s) => s.status === "skipped")
  const pending = state.steps.filter((s) => s.status === "pending" || s.status === "in_progress")

  // Calculate time spent
  const timeSpent = state.completedAt
    ? state.completedAt.getTime() - state.startedAt.getTime()
    : state.lastActivityAt.getTime() - state.startedAt.getTime()
  const timeSpentMinutes = Math.round(timeSpent / (60 * 1000))

  // Find drop-off step (first pending step if not complete)
  const dropOffStep = !state.completedAt
    ? pending[0]?.id ?? null
    : null

  return {
    totalSteps: state.steps.length,
    completedSteps: completed.length,
    skippedSteps: skipped.length,
    pendingSteps: pending.length,
    progress: getProgress(state),
    timeSpentMinutes,
    averageStepTimeMinutes: completed.length > 0
      ? Math.round(timeSpentMinutes / completed.length)
      : 0,
    dropOffStep,
  }
}

/**
 * Calculate aggregate metrics across multiple users
 */
export function calculateAggregateMetrics(
  states: OnboardingState[]
): {
  totalUsers: number
  completionRate: number
  averageProgress: number
  averageTimeMinutes: number
  stepCompletionRates: Record<SetupStepType, number>
  dropOffDistribution: Record<SetupStepType, number>
} {
  if (states.length === 0) {
    return {
      totalUsers: 0,
      completionRate: 0,
      averageProgress: 0,
      averageTimeMinutes: 0,
      stepCompletionRates: {} as Record<SetupStepType, number>,
      dropOffDistribution: {} as Record<SetupStepType, number>,
    }
  }

  const completed = states.filter((s) => s.completedAt !== null)
  const metrics = states.map(calculateOnboardingMetrics)

  // Calculate step completion rates
  const stepCompletionRates: Record<string, number> = {}
  const dropOffDistribution: Record<string, number> = {}

  for (const stepType of DEFAULT_STEPS.map((s) => s.id)) {
    const completedCount = states.filter(
      (s) => s.steps.find((step) => step.id === stepType)?.status === "completed"
    ).length
    stepCompletionRates[stepType] = Math.round((completedCount / states.length) * 100)

    const dropOffs = metrics.filter((m) => m.dropOffStep === stepType).length
    if (dropOffs > 0) {
      dropOffDistribution[stepType] = dropOffs
    }
  }

  return {
    totalUsers: states.length,
    completionRate: Math.round((completed.length / states.length) * 100),
    averageProgress: Math.round(
      metrics.reduce((sum, m) => sum + m.progress, 0) / metrics.length
    ),
    averageTimeMinutes: Math.round(
      metrics.reduce((sum, m) => sum + m.timeSpentMinutes, 0) / metrics.length
    ),
    stepCompletionRates: stepCompletionRates as Record<SetupStepType, number>,
    dropOffDistribution: dropOffDistribution as Record<SetupStepType, number>,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const guidedSetup = {
  // Constants
  DEFAULT_STEPS,
  PRESET_CATEGORIES,

  // State management
  createOnboardingState,
  getCurrentStep,
  getStepById,
  isOnboardingComplete,
  getProgress,
  getRemainingTimeEstimate,

  // Transitions
  completeStep,
  skipStep,
  goToPreviousStep,
  goToStep,

  // Validation
  validateStepData,
  completeStepWithValidation,

  // Household
  setHouseholdId,

  // Analytics
  calculateOnboardingMetrics,
  calculateAggregateMetrics,
}
