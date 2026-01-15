"use client"

/**
 * HapticFeedback - Vibration patterns for mobile devices
 * Provides tactile feedback for swipes, success/error states
 */

import { useCallback, useEffect, useRef } from "react"

// ============================================================================
// Types
// ============================================================================

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "error"
  | "warning"
  | "selection"
  | "swipe"

interface HapticOptions {
  enabled?: boolean
  respectSystemSettings?: boolean
}

// ============================================================================
// Vibration Patterns (in milliseconds)
// ============================================================================

export const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 30, 10], // Short-pause-short
  error: [50, 50, 50], // Three medium pulses
  warning: [30, 30], // Two pulses
  selection: 5, // Very light tap
  swipe: 15, // Quick feedback
}

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check if the Vibration API is supported
 */
export function isVibrationSupported(): boolean {
  if (typeof window === "undefined") return false
  return "vibrate" in navigator
}

/**
 * Check if the device is a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// ============================================================================
// Core Vibration Function
// ============================================================================

/**
 * Trigger a vibration pattern
 */
export function vibrate(
  pattern: HapticPattern | number | number[],
  options: HapticOptions = {}
): boolean {
  const { enabled = true, respectSystemSettings = true } = options

  // Early exit checks
  if (!enabled) return false
  if (!isVibrationSupported()) return false
  if (!isMobileDevice()) return false
  if (respectSystemSettings && prefersReducedMotion()) return false

  // Get vibration pattern
  const vibrationValue = typeof pattern === "string"
    ? VIBRATION_PATTERNS[pattern]
    : pattern

  try {
    return navigator.vibrate(vibrationValue)
  } catch {
    return false
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): boolean {
  if (!isVibrationSupported()) return false
  try {
    return navigator.vibrate(0)
  } catch {
    return false
  }
}

// ============================================================================
// Hook: useHaptic
// ============================================================================

interface UseHapticReturn {
  trigger: (pattern: HapticPattern) => void
  isSupported: boolean
  isMobile: boolean
  light: () => void
  medium: () => void
  heavy: () => void
  success: () => void
  error: () => void
  warning: () => void
  selection: () => void
  swipe: () => void
}

export function useHaptic(options: HapticOptions = {}): UseHapticReturn {
  const { enabled = true, respectSystemSettings = true } = options

  const trigger = useCallback(
    (pattern: HapticPattern) => {
      vibrate(pattern, { enabled, respectSystemSettings })
    },
    [enabled, respectSystemSettings]
  )

  const isSupported = isVibrationSupported()
  const isMobile = isMobileDevice()

  return {
    trigger,
    isSupported,
    isMobile,
    light: useCallback(() => trigger("light"), [trigger]),
    medium: useCallback(() => trigger("medium"), [trigger]),
    heavy: useCallback(() => trigger("heavy"), [trigger]),
    success: useCallback(() => trigger("success"), [trigger]),
    error: useCallback(() => trigger("error"), [trigger]),
    warning: useCallback(() => trigger("warning"), [trigger]),
    selection: useCallback(() => trigger("selection"), [trigger]),
    swipe: useCallback(() => trigger("swipe"), [trigger]),
  }
}

// ============================================================================
// Hook: useSwipeHaptic
// ============================================================================

interface SwipeHapticOptions extends HapticOptions {
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
  threshold?: number
}

export function useSwipeHaptic(options: SwipeHapticOptions = {}) {
  const {
    enabled = true,
    respectSystemSettings = true,
    onSwipeStart,
    onSwipeEnd,
    threshold = 50,
  } = options

  const startXRef = useRef<number | null>(null)
  const hasTriggeredRef = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      startXRef.current = touch.clientX
      hasTriggeredRef.current = false
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startXRef.current === null) return
    if (hasTriggeredRef.current) return

    const touch = e.touches[0]
    if (!touch) return

    const deltaX = touch.clientX - startXRef.current

    if (Math.abs(deltaX) > threshold) {
      vibrate("swipe", { enabled, respectSystemSettings })
      hasTriggeredRef.current = true
      onSwipeStart?.()
    }
  }, [enabled, respectSystemSettings, threshold, onSwipeStart])

  const handleTouchEnd = useCallback(() => {
    if (hasTriggeredRef.current) {
      onSwipeEnd?.()
    }
    startXRef.current = null
    hasTriggeredRef.current = false
  }, [onSwipeEnd])

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}

// ============================================================================
// Hook: useButtonHaptic
// ============================================================================

interface ButtonHapticOptions extends HapticOptions {
  pattern?: HapticPattern
}

export function useButtonHaptic(options: ButtonHapticOptions = {}) {
  const {
    enabled = true,
    respectSystemSettings = true,
    pattern = "selection",
  } = options

  const handleClick = useCallback(() => {
    vibrate(pattern, { enabled, respectSystemSettings })
  }, [pattern, enabled, respectSystemSettings])

  return {
    onClick: handleClick,
  }
}

// ============================================================================
// Component: HapticButton
// ============================================================================

interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticPattern?: HapticPattern
  hapticEnabled?: boolean
  children: React.ReactNode
}

export function HapticButton({
  hapticPattern = "selection",
  hapticEnabled = true,
  children,
  onClick,
  ...props
}: HapticButtonProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hapticEnabled) {
        vibrate(hapticPattern)
      }
      onClick?.(e)
    },
    [hapticPattern, hapticEnabled, onClick]
  )

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

// ============================================================================
// Component: HapticWrapper
// ============================================================================

interface HapticWrapperProps {
  pattern?: HapticPattern
  enabled?: boolean
  triggerOn?: "click" | "touch"
  children: React.ReactNode
  className?: string
}

export function HapticWrapper({
  pattern = "selection",
  enabled = true,
  triggerOn = "click",
  children,
  className,
}: HapticWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    const handleInteraction = () => {
      vibrate(pattern)
    }

    const eventType = triggerOn === "touch" ? "touchstart" : "click"
    element.addEventListener(eventType, handleInteraction, { passive: true })

    return () => {
      element.removeEventListener(eventType, handleInteraction)
    }
  }, [pattern, enabled, triggerOn])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

// ============================================================================
// Presets for Common Interactions
// ============================================================================

export const hapticPresets = {
  /** Light tap for selections */
  tap: () => vibrate("selection"),

  /** Medium feedback for confirmations */
  confirm: () => vibrate("medium"),

  /** Success pattern for completed actions */
  success: () => vibrate("success"),

  /** Error pattern for failed actions */
  error: () => vibrate("error"),

  /** Warning pattern for important notices */
  warning: () => vibrate("warning"),

  /** Swipe feedback */
  swipe: () => vibrate("swipe"),

  /** Heavy impact for important actions */
  impact: () => vibrate("heavy"),
} as const
