"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react"

/**
 * PopupCoordinator - Coordinates multiple popups/prompts to avoid overwhelming users
 *
 * Priority order (highest first):
 * 1. Push notifications - most important for engagement
 * 2. PWA install - important but less urgent
 * 3. Invite co-parent - nice to have
 *
 * Rules:
 * - Only one popup visible at a time (STRICTLY ENFORCED)
 * - Minimum delay between popups (enforced by coordinator)
 * - User dismissal respected (saved to localStorage for 7 days)
 * - Initial delay before showing any popup
 * - Components should register immediately, coordinator manages timing
 *
 * IMPORTANT: Components MUST check isPopupAllowed before rendering.
 * The coordinator guarantees only one popup type returns true at any time.
 */

type PopupType = "push-notification" | "pwa-install" | "invite-coparent"

interface PopupState {
  currentPopup: PopupType | null
  queue: PopupType[]
  dismissed: Set<PopupType>
  isInitialized: boolean
  lastPopupTime: number
}

interface PopupCoordinatorContextValue {
  requestPopup: (type: PopupType) => void
  dismissPopup: (type: PopupType, permanent?: boolean) => void
  isPopupAllowed: (type: PopupType) => boolean
  currentPopup: PopupType | null
}

const PopupCoordinatorContext = createContext<PopupCoordinatorContextValue | null>(null)

const POPUP_DELAY_MS = 180000 // 3 minutes between popups (reduced from 5)
const INITIAL_DELAY_MS = 15000 // 15 seconds initial delay - balanced for UX
const STORAGE_PREFIX = "familyload_popup_"

// Priority order - lower index = higher priority
const POPUP_PRIORITY: PopupType[] = [
  "push-notification",
  "pwa-install",
  "invite-coparent"
]

interface PopupCoordinatorProviderProps {
  children: ReactNode
}

export function PopupCoordinatorProvider({ children }: PopupCoordinatorProviderProps) {
  // Single unified state to prevent synchronization issues
  const [state, setState] = useState<PopupState>({
    currentPopup: null,
    queue: [],
    dismissed: new Set(),
    isInitialized: false,
    lastPopupTime: 0
  })
  const processingRef = useRef(false) // Prevent race conditions
  const timerRef = useRef<NodeJS.Timeout | null>(null) // Track active timer

  // Load dismissed state from localStorage and set initial delay
  useEffect(() => {
    if (typeof window === "undefined") return

    const dismissed = new Set<PopupType>()
    for (const type of POPUP_PRIORITY) {
      const key = `${STORAGE_PREFIX}${type}_dismissed`
      const dismissedAt = localStorage.getItem(key)
      if (dismissedAt) {
        const dismissedTime = new Date(dismissedAt).getTime()
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
        // Re-show after 7 days
        if (daysSinceDismissed < 7) {
          dismissed.add(type)
        }
      }
    }
    setState(prev => ({ ...prev, dismissed }))

    // Initial delay before allowing any popups to show
    const initTimer = setTimeout(() => {
      setState(prev => ({ ...prev, isInitialized: true }))
    }, INITIAL_DELAY_MS)

    return () => clearTimeout(initTimer)
  }, [])

  // Process queue when current popup is null and enough time has passed
  useEffect(() => {
    // Don't process queue until initialized
    if (!state.isInitialized) return
    if (state.currentPopup !== null || state.queue.length === 0) return
    if (processingRef.current) return // Prevent race conditions

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const timeSinceLastPopup = Date.now() - state.lastPopupTime
    // Always enforce the delay, even for the first popup after initialization
    const delay = state.lastPopupTime === 0
      ? 0 // First popup after init shows immediately
      : Math.max(0, POPUP_DELAY_MS - timeSinceLastPopup)

    processingRef.current = true

    timerRef.current = setTimeout(() => {
      setState(prev => {
        // Double-check we're still in a valid state to show a popup
        if (prev.currentPopup !== null) {
          processingRef.current = false
          return prev
        }

        // Get next popup from queue that isn't dismissed
        const nextPopup = prev.queue.find(p => !prev.dismissed.has(p))
        if (!nextPopup) {
          processingRef.current = false
          return { ...prev, queue: [] }
        }

        processingRef.current = false

        return {
          ...prev,
          currentPopup: nextPopup,
          queue: prev.queue.filter(p => p !== nextPopup),
          lastPopupTime: Date.now()
        }
      })
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      processingRef.current = false
    }
  }, [state.currentPopup, state.queue, state.lastPopupTime, state.isInitialized])

  const requestPopup = useCallback((type: PopupType) => {
    setState(prev => {
      // Don't add if already dismissed
      if (prev.dismissed.has(type)) return prev

      // Don't add if already showing or in queue
      if (prev.currentPopup === type || prev.queue.includes(type)) return prev

      // NEVER show immediately - always queue and let the useEffect manage timing
      // This prevents race conditions where multiple popups try to show at once
      // The queue processor will respect priority order and delays

      // Add to queue in priority order
      const newQueue = [...prev.queue, type].sort(
        (a, b) => POPUP_PRIORITY.indexOf(a) - POPUP_PRIORITY.indexOf(b)
      )

      return { ...prev, queue: newQueue }
    })
  }, [])

  const dismissPopup = useCallback((type: PopupType, permanent = true) => {
    setState(prev => {
      const newDismissed = new Set(prev.dismissed)
      if (permanent) {
        newDismissed.add(type)
        // Save to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${STORAGE_PREFIX}${type}_dismissed`,
            new Date().toISOString()
          )
        }
      }

      return {
        ...prev,
        currentPopup: prev.currentPopup === type ? null : prev.currentPopup,
        queue: prev.queue.filter(p => p !== type),
        dismissed: newDismissed,
        lastPopupTime: Date.now()
      }
    })
  }, [])

  // CRITICAL: This function determines if a popup can render
  // Only one popup type will EVER return true at any given time
  const isPopupAllowed = useCallback((type: PopupType) => {
    // Must be initialized first
    if (!state.isInitialized) return false
    // Only the current popup is allowed to show
    return state.currentPopup === type
  }, [state.currentPopup, state.isInitialized])

  return (
    <PopupCoordinatorContext.Provider
      value={{ requestPopup, dismissPopup, isPopupAllowed, currentPopup: state.currentPopup }}
    >
      {children}
    </PopupCoordinatorContext.Provider>
  )
}

export function usePopupCoordinator() {
  const context = useContext(PopupCoordinatorContext)
  if (!context) {
    throw new Error("usePopupCoordinator must be used within PopupCoordinatorProvider")
  }
  return context
}
