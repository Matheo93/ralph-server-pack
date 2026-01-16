"use client"

import { useCallback, useRef, useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

/**
 * Feature tracking hook - Track feature usage with automatic timing
 *
 * Provides:
 * - Automatic feature open/close tracking
 * - Duration measurement
 * - Interaction counting
 * - Success/error tracking
 */

// ============================================================================
// Types
// ============================================================================

export type FeatureCategory =
  | "magic_notepad"
  | "vocal"
  | "task"
  | "dashboard"
  | "settings"
  | "onboarding"
  | "notification"
  | "calendar"
  | "charge"
  | "household"

export interface FeatureTrackingOptions {
  /** Feature category */
  category: FeatureCategory
  /** Feature name */
  name: string
  /** Additional properties to include with all events */
  properties?: Record<string, string | number | boolean | null>
  /** Track when the feature is opened (default: true) */
  trackOpen?: boolean
  /** Track when the feature is closed (default: true) */
  trackClose?: boolean
}

export interface FeatureTrackingResult {
  /** Track when user opens/starts the feature */
  trackOpen: () => void
  /** Track when user closes/ends the feature */
  trackClose: () => void
  /** Track a specific action within the feature */
  trackAction: (action: string, props?: Record<string, string | number | boolean | null>) => void
  /** Track a successful outcome */
  trackSuccess: (props?: Record<string, string | number | boolean | null>) => void
  /** Track an error */
  trackError: (error: string, props?: Record<string, string | number | boolean | null>) => void
  /** Track button/link clicks */
  trackClick: (element: string) => void
  /** Get current duration in ms */
  getDuration: () => number
  /** Get interaction count */
  getInteractionCount: () => number
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFeatureTracking(options: FeatureTrackingOptions): FeatureTrackingResult {
  const { category, name, properties = {}, trackOpen = true, trackClose = true } = options

  const startTimeRef = useRef<number | null>(null)
  const interactionCountRef = useRef(0)
  const isOpenRef = useRef(false)

  const baseProps = {
    feature_category: category,
    feature_name: name,
    ...properties,
  }

  // Track open
  const handleTrackOpen = useCallback(() => {
    if (isOpenRef.current) return

    isOpenRef.current = true
    startTimeRef.current = Date.now()
    interactionCountRef.current = 0

    if (trackOpen) {
      trackEvent(`${category}_opened`, baseProps)
    }
  }, [category, trackOpen, baseProps])

  // Track close
  const handleTrackClose = useCallback(() => {
    if (!isOpenRef.current) return

    isOpenRef.current = false
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0

    if (trackClose) {
      trackEvent(`${category}_closed`, {
        ...baseProps,
        duration_ms: duration,
        interaction_count: interactionCountRef.current,
      })
    }

    startTimeRef.current = null
  }, [category, trackClose, baseProps])

  // Track action
  const handleTrackAction = useCallback(
    (action: string, props?: Record<string, string | number | boolean | null>) => {
      interactionCountRef.current++

      trackEvent(`${category}_action`, {
        ...baseProps,
        action,
        ...props,
      })
    },
    [category, baseProps]
  )

  // Track success
  const handleTrackSuccess = useCallback(
    (props?: Record<string, string | number | boolean | null>) => {
      const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0

      trackEvent(`${category}_success`, {
        ...baseProps,
        duration_ms: duration,
        interaction_count: interactionCountRef.current,
        ...props,
      })
    },
    [category, baseProps]
  )

  // Track error
  const handleTrackError = useCallback(
    (error: string, props?: Record<string, string | number | boolean | null>) => {
      const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0

      trackEvent(`${category}_error`, {
        ...baseProps,
        error,
        duration_ms: duration,
        interaction_count: interactionCountRef.current,
        ...props,
      })
    },
    [category, baseProps]
  )

  // Track click
  const handleTrackClick = useCallback(
    (element: string) => {
      interactionCountRef.current++

      trackEvent(`${category}_click`, {
        ...baseProps,
        element,
      })
    },
    [category, baseProps]
  )

  // Get duration
  const getDuration = useCallback(() => {
    return startTimeRef.current ? Date.now() - startTimeRef.current : 0
  }, [])

  // Get interaction count
  const getInteractionCount = useCallback(() => {
    return interactionCountRef.current
  }, [])

  // Auto-close on unmount
  useEffect(() => {
    return () => {
      if (isOpenRef.current && trackClose) {
        const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0
        trackEvent(`${category}_closed`, {
          ...baseProps,
          duration_ms: duration,
          interaction_count: interactionCountRef.current,
          auto_closed: true,
        })
      }
    }
  }, [category, trackClose, baseProps])

  return {
    trackOpen: handleTrackOpen,
    trackClose: handleTrackClose,
    trackAction: handleTrackAction,
    trackSuccess: handleTrackSuccess,
    trackError: handleTrackError,
    trackClick: handleTrackClick,
    getDuration,
    getInteractionCount,
  }
}

// ============================================================================
// Pre-configured Tracking Hooks
// ============================================================================

/**
 * Track MagicNotepad usage
 */
export function useMagicNotepadTracking() {
  return useFeatureTracking({
    category: "magic_notepad",
    name: "magic_notepad",
  })
}

/**
 * Track vocal recording usage
 */
export function useVocalTracking() {
  return useFeatureTracking({
    category: "vocal",
    name: "vocal_recording",
  })
}

/**
 * Track task creation
 */
export function useTaskCreationTracking() {
  return useFeatureTracking({
    category: "task",
    name: "task_creation",
  })
}

/**
 * Track task completion
 */
export function useTaskCompletionTracking() {
  return useFeatureTracking({
    category: "task",
    name: "task_completion",
  })
}

/**
 * Track dashboard interactions
 */
export function useDashboardTracking() {
  return useFeatureTracking({
    category: "dashboard",
    name: "dashboard",
  })
}

/**
 * Track settings changes
 */
export function useSettingsTracking() {
  return useFeatureTracking({
    category: "settings",
    name: "settings",
  })
}

/**
 * Track onboarding progress
 */
export function useOnboardingTracking(step: number) {
  return useFeatureTracking({
    category: "onboarding",
    name: `onboarding_step_${step}`,
    properties: { step },
  })
}

/**
 * Track notification interactions
 */
export function useNotificationTracking() {
  return useFeatureTracking({
    category: "notification",
    name: "notification",
  })
}

/**
 * Track calendar view usage
 */
export function useCalendarTracking() {
  return useFeatureTracking({
    category: "calendar",
    name: "calendar",
  })
}

/**
 * Track charge/balance view
 */
export function useChargeTracking() {
  return useFeatureTracking({
    category: "charge",
    name: "charge_balance",
  })
}

// ============================================================================
// Standalone Event Trackers
// ============================================================================

/**
 * Track a one-off feature event
 */
export function trackFeatureEvent(
  category: FeatureCategory,
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
) {
  trackEvent(`${category}_${eventName}`, {
    feature_category: category,
    ...properties,
  })
}

/**
 * Track task events
 */
export const taskEvents = {
  created: (taskId: string, source: "manual" | "vocal" | "magic_notepad" | "suggestion") =>
    trackFeatureEvent("task", "created", { task_id: taskId, source }),

  completed: (taskId: string, durationMs: number) =>
    trackFeatureEvent("task", "completed", { task_id: taskId, duration_ms: durationMs }),

  assigned: (taskId: string, assigneeId: string) =>
    trackFeatureEvent("task", "assigned", { task_id: taskId, assignee_id: assigneeId }),

  postponed: (taskId: string, days: number) =>
    trackFeatureEvent("task", "postponed", { task_id: taskId, days }),

  deleted: (taskId: string) =>
    trackFeatureEvent("task", "deleted", { task_id: taskId }),

  viewed: (taskId: string) =>
    trackFeatureEvent("task", "viewed", { task_id: taskId }),
}

/**
 * Track vocal events
 */
export const vocalEvents = {
  started: () => trackFeatureEvent("vocal", "started"),

  stopped: (durationMs: number) =>
    trackFeatureEvent("vocal", "stopped", { duration_ms: durationMs }),

  transcribed: (wordCount: number, confidence: number) =>
    trackFeatureEvent("vocal", "transcribed", { word_count: wordCount, confidence }),

  classified: (taskCount: number) =>
    trackFeatureEvent("vocal", "classified", { task_count: taskCount }),

  error: (errorType: string) =>
    trackFeatureEvent("vocal", "error", { error_type: errorType }),
}

/**
 * Track magic notepad events
 */
export const magicNotepadEvents = {
  opened: () => trackFeatureEvent("magic_notepad", "opened"),

  closed: (durationMs: number, interactionCount: number) =>
    trackFeatureEvent("magic_notepad", "closed", {
      duration_ms: durationMs,
      interaction_count: interactionCount,
    }),

  voiceStarted: () => trackFeatureEvent("magic_notepad", "voice_started"),

  voiceStopped: (durationMs: number) =>
    trackFeatureEvent("magic_notepad", "voice_stopped", { duration_ms: durationMs }),

  classified: (taskCount: number) =>
    trackFeatureEvent("magic_notepad", "classified", { task_count: taskCount }),

  tasksCreated: (taskCount: number) =>
    trackFeatureEvent("magic_notepad", "tasks_created", { task_count: taskCount }),

  error: (errorType: string) =>
    trackFeatureEvent("magic_notepad", "error", { error_type: errorType }),
}

/**
 * Track onboarding events
 */
export const onboardingEvents = {
  started: () => trackFeatureEvent("onboarding", "started"),

  stepCompleted: (step: number, durationMs: number) =>
    trackFeatureEvent("onboarding", "step_completed", { step, duration_ms: durationMs }),

  skipped: (step: number) =>
    trackFeatureEvent("onboarding", "skipped", { step }),

  completed: (totalDurationMs: number) =>
    trackFeatureEvent("onboarding", "completed", { total_duration_ms: totalDurationMs }),

  abandoned: (lastStep: number) =>
    trackFeatureEvent("onboarding", "abandoned", { last_step: lastStep }),
}

/**
 * Track notification events
 */
export const notificationEvents = {
  permissionRequested: () =>
    trackFeatureEvent("notification", "permission_requested"),

  permissionGranted: () =>
    trackFeatureEvent("notification", "permission_granted"),

  permissionDenied: () =>
    trackFeatureEvent("notification", "permission_denied"),

  received: (notificationType: string) =>
    trackFeatureEvent("notification", "received", { type: notificationType }),

  clicked: (notificationType: string) =>
    trackFeatureEvent("notification", "clicked", { type: notificationType }),

  dismissed: (notificationType: string) =>
    trackFeatureEvent("notification", "dismissed", { type: notificationType }),
}

/**
 * Track household events
 */
export const householdEvents = {
  created: (memberCount: number) =>
    trackFeatureEvent("household", "created", { member_count: memberCount }),

  memberInvited: () =>
    trackFeatureEvent("household", "member_invited"),

  memberJoined: () =>
    trackFeatureEvent("household", "member_joined"),

  memberRemoved: () =>
    trackFeatureEvent("household", "member_removed"),

  childAdded: () =>
    trackFeatureEvent("household", "child_added"),

  childRemoved: () =>
    trackFeatureEvent("household", "child_removed"),
}
