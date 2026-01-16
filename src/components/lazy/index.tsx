"use client"

/**
 * Lazy-loaded components for improved initial bundle size
 *
 * These components use dynamic imports to avoid loading heavy dependencies
 * (framer-motion, etc.) on initial page load.
 */

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// ============================================================================
// Loading Fallbacks
// ============================================================================

function FloatingButtonSkeleton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Skeleton className="w-14 h-14 rounded-full" />
    </div>
  )
}

function NotepadSkeleton() {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[350px] h-[400px] bg-background rounded-2xl shadow-2xl border p-4">
      <Skeleton className="h-8 w-32 mb-4" />
      <Skeleton className="h-32 w-full mb-4" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

function QuickActionsSkeleton() {
  return (
    <div className="flex gap-2 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-20 rounded-full" />
      ))}
    </div>
  )
}

function CoachMarksSkeleton() {
  return null // Coach marks appear on top, no skeleton needed
}

function ConfettiSkeleton() {
  return null // No visual skeleton for confetti
}

function VocalRecorderSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Skeleton className="w-16 h-16 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

function ProgressRingSkeleton() {
  return <Skeleton className="w-24 h-24 rounded-full" />
}

// ============================================================================
// Lazy Components - Framer Motion Heavy
// ============================================================================

/**
 * MagicNotepad - Floating notepad for quick task creation
 * Heavy: framer-motion animations
 */
export const LazyMagicNotepad = dynamic(
  () => import("@/components/custom/MagicNotepad").then((mod) => ({ default: mod.MagicNotepad })),
  {
    loading: FloatingButtonSkeleton,
    ssr: false,
  }
)

/**
 * ConfettiCelebration - Celebration animations
 * Heavy: framer-motion, canvas animations
 */
export const LazyConfettiCelebration = dynamic(
  () => import("@/components/custom/ConfettiCelebration").then((mod) => ({ default: mod.ConfettiCelebration })),
  {
    loading: ConfettiSkeleton,
    ssr: false,
  }
)

/**
 * TaskList - Animated task list with drag and drop
 * Heavy: framer-motion animations
 */
export const LazyTaskList = dynamic(
  () => import("@/components/custom/TaskList").then((mod) => ({ default: mod.TaskList })),
  {
    loading: TaskListSkeleton,
    ssr: false,
  }
)

/**
 * TaskCard - Animated task card with gestures
 * Heavy: framer-motion animations
 */
export const LazyTaskCard = dynamic(
  () => import("@/components/custom/TaskCard").then((mod) => ({ default: mod.TaskCard })),
  {
    loading: CardSkeleton,
    ssr: false,
  }
)

/**
 * QuickActions - Animated quick action buttons
 * Heavy: framer-motion animations
 */
export const LazyQuickActions = dynamic(
  () => import("@/components/custom/QuickActions").then((mod) => ({ default: mod.QuickActions })),
  {
    loading: QuickActionsSkeleton,
    ssr: false,
  }
)

/**
 * CoachMarksProvider - Onboarding tooltips with animations
 * Heavy: framer-motion animations
 */
export const LazyCoachMarksProvider = dynamic(
  () => import("@/components/custom/CoachMarks").then((mod) => ({ default: mod.CoachMarksProvider })),
  {
    loading: CoachMarksSkeleton,
    ssr: false,
  }
)

/**
 * TourTriggerButton - Tour trigger button
 * Heavy: framer-motion animations
 */
export const LazyTourTriggerButton = dynamic(
  () => import("@/components/custom/CoachMarks").then((mod) => ({ default: mod.TourTriggerButton })),
  {
    loading: () => <Skeleton className="w-8 h-8 rounded" />,
    ssr: false,
  }
)

/**
 * VocalRecorder - Voice recording with animations
 * Heavy: framer-motion, audio processing
 */
export const LazyVocalRecorder = dynamic(
  () => import("@/components/custom/VocalRecorder").then((mod) => ({ default: mod.VocalRecorder })),
  {
    loading: VocalRecorderSkeleton,
    ssr: false,
  }
)

/**
 * VocalButton - Voice button with animations
 * Heavy: framer-motion animations
 */
export const LazyVocalButton = dynamic(
  () => import("@/components/custom/VocalButton").then((mod) => ({ default: mod.VocalButton })),
  {
    loading: () => <Skeleton className="w-12 h-12 rounded-full" />,
    ssr: false,
  }
)

/**
 * ProgressRing - Animated circular progress
 * Heavy: framer-motion spring animations
 */
export const LazyProgressRing = dynamic(
  () => import("@/components/custom/ProgressRing").then((mod) => ({ default: mod.ProgressRing })),
  {
    loading: ProgressRingSkeleton,
    ssr: false,
  }
)

/**
 * FirstTimeGuide - Animated onboarding guide
 * Heavy: framer-motion animations
 */
export const LazyFirstTimeGuide = dynamic(
  () => import("@/components/custom/FirstTimeGuide").then((mod) => ({ default: mod.FirstTimeGuide })),
  {
    loading: CoachMarksSkeleton,
    ssr: false,
  }
)

/**
 * OfflineIndicator - Network status with animations
 * Heavy: framer-motion animations
 */
export const LazyOfflineIndicator = dynamic(
  () => import("@/components/custom/OfflineIndicator").then((mod) => ({ default: mod.OfflineIndicator })),
  {
    loading: () => null,
    ssr: false,
  }
)

/**
 * UpdatePrompt - PWA update prompt with animations
 * Heavy: framer-motion animations
 */
export const LazyUpdatePrompt = dynamic(
  () => import("@/components/custom/UpdatePrompt").then((mod) => ({ default: mod.UpdatePrompt })),
  {
    loading: () => null,
    ssr: false,
  }
)

/**
 * PushPermissionPrompt - Push notification prompt with animations
 * Heavy: framer-motion animations
 */
export const LazyPushPermissionPrompt = dynamic(
  () => import("@/components/custom/PushPermissionPrompt").then((mod) => ({ default: mod.PushPermissionPrompt })),
  {
    loading: () => null,
    ssr: false,
  }
)

/**
 * KeyboardShortcutsHelp - Keyboard shortcuts modal with animations
 * Heavy: framer-motion animations
 */
export const LazyKeyboardShortcutsHelp = dynamic(
  () => import("@/components/custom/KeyboardShortcutsHelp").then((mod) => ({ default: mod.KeyboardShortcutsHelp })),
  {
    loading: () => null,
    ssr: false,
  }
)

/**
 * PostponeDialog - Task postpone dialog with animations
 * Heavy: framer-motion animations
 */
export const LazyPostponeDialog = dynamic(
  () => import("@/components/custom/PostponeDialog").then((mod) => ({ default: mod.PostponeDialog })),
  {
    loading: () => null,
    ssr: false,
  }
)

// ============================================================================
// Page Transition Components
// ============================================================================

/**
 * PageTransitionProvider - Provides page transition context
 * Heavy: framer-motion AnimatePresence
 */
export const LazyPageTransitionProvider = dynamic(
  () => import("@/components/custom/PageTransition").then((mod) => ({ default: mod.PageTransitionProvider })),
  {
    ssr: false,
  }
)

/**
 * PageWrapper - Wraps pages with transition animations
 * Heavy: framer-motion motion.div
 */
export const LazyPageWrapper = dynamic(
  () => import("@/components/custom/PageTransition").then((mod) => ({ default: mod.PageWrapper })),
  {
    ssr: false,
  }
)

/**
 * AnimatedPage - Page with direction-aware transitions
 * Heavy: framer-motion AnimatePresence
 */
export const LazyAnimatedPage = dynamic(
  () => import("@/components/custom/PageTransition").then((mod) => ({ default: mod.AnimatedPage })),
  {
    ssr: false,
  }
)

// ============================================================================
// Marketing Components
// ============================================================================

/**
 * AnimatedFamilyIllustration - Hero section animation
 * Heavy: framer-motion motion.svg
 */
export const LazyAnimatedFamilyIllustration = dynamic(
  () => import("@/components/marketing/AnimatedFamilyIllustration").then((mod) => ({ default: mod.AnimatedFamilyIllustration })),
  {
    loading: () => <Skeleton className="w-full h-64 rounded-lg" />,
    ssr: false,
  }
)

// ============================================================================
// Re-export types for convenience
// ============================================================================

// Note: Types are inferred from component props
