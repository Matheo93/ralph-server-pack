"use client"

import { useCallback } from "react"

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error"

interface HapticOptions {
  pattern?: HapticPattern
  duration?: number
}

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 25, 25],
  error: [50, 100, 50],
}

/**
 * Hook for haptic feedback on supported devices
 * Provides vibration patterns for different interaction types
 */
export function useHapticFeedback() {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator

  const vibrate = useCallback(
    (options: HapticOptions = {}) => {
      const { pattern = "light" } = options

      if (!isSupported) return false

      try {
        const vibrationPattern = HAPTIC_PATTERNS[pattern]
        return navigator.vibrate(vibrationPattern)
      } catch {
        // Vibration may be blocked by browser/OS
        return false
      }
    },
    [isSupported]
  )

  // Convenience methods
  const lightTap = useCallback(() => vibrate({ pattern: "light" }), [vibrate])
  const mediumTap = useCallback(() => vibrate({ pattern: "medium" }), [vibrate])
  const heavyTap = useCallback(() => vibrate({ pattern: "heavy" }), [vibrate])
  const success = useCallback(() => vibrate({ pattern: "success" }), [vibrate])
  const warning = useCallback(() => vibrate({ pattern: "warning" }), [vibrate])
  const error = useCallback(() => vibrate({ pattern: "error" }), [vibrate])

  // Cancel any ongoing vibration
  const cancel = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0)
    }
  }, [isSupported])

  return {
    isSupported,
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
    cancel,
  }
}

/**
 * Create a click handler that adds haptic feedback
 */
export function withHaptic<T extends (...args: Parameters<T>) => ReturnType<T>>(
  handler: T,
  pattern: HapticPattern = "light"
): (...args: Parameters<T>) => ReturnType<T> {
  return ((...args: Parameters<T>) => {
    // Trigger haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        const vibrationPattern = HAPTIC_PATTERNS[pattern]
        navigator.vibrate(vibrationPattern)
      } catch {
        // Ignore errors
      }
    }
    // Call the original handler
    return handler(...args)
  }) as T
}

/**
 * Component wrapper that adds ripple effect on touch
 * Use with touch-friendly elements
 */
export function createRippleEffect(
  event: React.TouchEvent | React.MouseEvent
): void {
  const target = event.currentTarget as HTMLElement

  // Create ripple element
  const ripple = document.createElement("span")
  ripple.className =
    "absolute inset-0 rounded-inherit bg-current opacity-0 animate-ripple pointer-events-none"

  // Calculate position
  const rect = target.getBoundingClientRect()
  const x =
    "touches" in event
      ? event.touches[0]!.clientX - rect.left
      : (event as React.MouseEvent).clientX - rect.left
  const y =
    "touches" in event
      ? event.touches[0]!.clientY - rect.top
      : (event as React.MouseEvent).clientY - rect.top

  // Set ripple position
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  // Add and remove ripple
  target.style.position = "relative"
  target.style.overflow = "hidden"
  target.appendChild(ripple)

  // Remove after animation
  setTimeout(() => {
    ripple.remove()
  }, 600)
}
