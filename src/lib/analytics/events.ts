/**
 * Analytics events definitions for FamilyLoad
 * Centralized event tracking for consistency
 */

import { trackEvent, trackConversion } from "./index"

// ============================================================================
// Task Events
// ============================================================================

export function trackTaskCreated(source: "manual" | "vocal" | "auto", category?: string) {
  trackEvent("task_created", {
    source,
    category: category ?? null,
  })
}

export function trackTaskCompleted(taskId: string, method: "click" | "swipe" = "click") {
  trackEvent("task_completed", {
    task_id: taskId,
    method,
  })
}

export function trackTaskDeleted(taskId: string) {
  trackEvent("task_deleted", { task_id: taskId })
}

export function trackTaskAssigned(taskId: string, assignedTo: string) {
  trackEvent("task_assigned", {
    task_id: taskId,
    assigned_to: assignedTo,
  })
}

export function trackTaskPostponed(taskId: string) {
  trackEvent("task_postponed", { task_id: taskId })
}

// ============================================================================
// Vocal Events
// ============================================================================

export function trackVocalRecordingStarted() {
  trackEvent("vocal_recording_started")
}

export function trackVocalRecordingCompleted(durationMs: number) {
  trackEvent("vocal_recording_completed", {
    duration_ms: durationMs,
  })
}

export function trackVocalTranscriptionSuccess(wordCount: number) {
  trackEvent("vocal_transcription_success", {
    word_count: wordCount,
  })
}

export function trackVocalTranscriptionFailed(error: string) {
  trackEvent("vocal_transcription_failed", {
    error,
  })
}

export function trackVocalTaskCreated() {
  trackEvent("vocal_task_created")
}

// ============================================================================
// Streak Events
// ============================================================================

export function trackStreakMilestone(days: number, milestone: string) {
  trackEvent("streak_milestone", {
    days,
    milestone,
  })
}

export function trackStreakBroken(previousStreak: number) {
  trackEvent("streak_broken", {
    previous_streak: previousStreak,
  })
}

export function trackStreakJokerUsed() {
  trackEvent("streak_joker_used")
}

// ============================================================================
// Onboarding Events
// ============================================================================

export function trackOnboardingStarted() {
  trackEvent("onboarding_started")
}

export function trackOnboardingStepCompleted(step: string, stepNumber: number) {
  trackEvent("onboarding_step_completed", {
    step,
    step_number: stepNumber,
  })
}

export function trackOnboardingCompleted(childrenCount: number) {
  trackEvent("onboarding_completed", {
    children_count: childrenCount,
  })
  trackConversion("onboarding")
}

export function trackOnboardingAbandoned(lastStep: string) {
  trackEvent("onboarding_abandoned", {
    last_step: lastStep,
  })
}

// ============================================================================
// Conversion Events
// ============================================================================

export function trackSignup(method: "email" | "google" | "apple") {
  trackEvent("signup", { method })
  trackConversion("signup")
}

export function trackLogin(method: "email" | "google" | "apple") {
  trackEvent("login", { method })
}

export function trackSubscriptionStarted(plan: string, price: number, currency: string) {
  trackEvent("subscription_started", {
    plan,
    price,
    currency,
  })
  trackConversion("subscription", price, currency)
}

export function trackSubscriptionCancelled(reason?: string) {
  trackEvent("subscription_cancelled", {
    reason: reason ?? null,
  })
}

export function trackTrialStarted() {
  trackEvent("trial_started")
  trackConversion("trial")
}

// ============================================================================
// Export Events
// ============================================================================

export function trackExportPDF(reportType: "charge" | "tasks") {
  trackEvent("export_pdf", { report_type: reportType })
}

export function trackExportData(format: "json") {
  trackEvent("export_data", { format })
}

// ============================================================================
// Feature Usage Events
// ============================================================================

export function trackFeatureUsed(feature: string) {
  trackEvent("feature_used", { feature })
}

export function trackChargeBalanceViewed() {
  trackEvent("charge_balance_viewed")
}

export function trackChildAdded() {
  trackEvent("child_added")
}

export function trackCoParentInvited() {
  trackEvent("coparent_invited")
}

// ============================================================================
// PWA Events
// ============================================================================

export function trackAppInstalled() {
  trackEvent("app_installed")
  trackConversion("app_install")
}

export function trackPushNotificationEnabled() {
  trackEvent("push_notification_enabled")
}

export function trackPushNotificationClicked(notificationType: string) {
  trackEvent("push_notification_clicked", {
    notification_type: notificationType,
  })
}

// ============================================================================
// Error Events
// ============================================================================

export function trackError(errorType: string, message: string, context?: string) {
  trackEvent("error", {
    error_type: errorType,
    message,
    context: context ?? null,
  })
}

// ============================================================================
// Engagement Events
// ============================================================================

export function trackDailyActive() {
  trackEvent("daily_active")
}

export function trackWeeklyActive() {
  trackEvent("weekly_active")
}

export function trackSessionDuration(durationSeconds: number) {
  trackEvent("session_duration", {
    duration_seconds: durationSeconds,
  })
}
