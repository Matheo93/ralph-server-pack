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
 * - Only one popup visible at a time
 * - Minimum delay of 2 minutes between popups
 * - User dismissal respected (saved to localStorage for 7 days)
 * - Initial delay of 1 minute before showing any popup
 */

type PopupType = "push-notification" | "pwa-install" | "invite-coparent"

interface PopupState {
  currentPopup: PopupType | null
  queue: PopupType[]
  dismissed: Set<PopupType>
}

interface PopupCoordinatorContextValue {
  requestPopup: (type: PopupType) => void
  dismissPopup: (type: PopupType, permanent?: boolean) => void
  isPopupAllowed: (type: PopupType) => boolean
  currentPopup: PopupType | null
}

const PopupCoordinatorContext = createContext<PopupCoordinatorContextValue | null>(null)

const POPUP_DELAY_MS = 300000 // 5 minutes between popups - prevent overwhelming users
const INITIAL_DELAY_MS = 180000 // 3 minutes initial delay - let user settle in first
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
  const [state, setState] = useState<PopupState>({
    currentPopup: null,
    queue: [],
    dismissed: new Set()
  })
  const [lastPopupTime, setLastPopupTime] = useState<number>(0) // Track when a popup was shown
  const [isInitialized, setIsInitialized] = useState(false)
  const processingRef = useRef(false) // Prevent race conditions

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
      setIsInitialized(true)
    }, INITIAL_DELAY_MS)

    return () => clearTimeout(initTimer)
  }, [])

  // Process queue when current popup is null and enough time has passed
  useEffect(() => {
    // Don't process queue until initialized
    if (!isInitialized) return
    if (state.currentPopup !== null || state.queue.length === 0) return
    if (processingRef.current) return // Prevent race conditions

    const timeSinceLastPopup = Date.now() - lastPopupTime
    // Always enforce the delay, even for the first popup after initialization
    const delay = lastPopupTime === 0
      ? 0 // First popup after init shows immediately
      : Math.max(0, POPUP_DELAY_MS - timeSinceLastPopup)

    processingRef.current = true

    const timer = setTimeout(() => {
      setState(prev => {
        // Get next popup from queue that isn't dismissed
        const nextPopup = prev.queue.find(p => !prev.dismissed.has(p))
        if (!nextPopup) {
          processingRef.current = false
          return { ...prev, queue: [] }
        }

        // Record when this popup was shown
        setLastPopupTime(Date.now())
        processingRef.current = false

        return {
          ...prev,
          currentPopup: nextPopup,
          queue: prev.queue.filter(p => p !== nextPopup)
        }
      })
    }, delay)

    return () => {
      clearTimeout(timer)
      processingRef.current = false
    }
  }, [state.currentPopup, state.queue, lastPopupTime, isInitialized])

  const requestPopup = useCallback((type: PopupType) => {
    setState(prev => {
      // Don't add if already dismissed
      if (prev.dismissed.has(type)) return prev

      // Don't add if already showing or in queue
      if (prev.currentPopup === type || prev.queue.includes(type)) return prev

      // If no current popup AND initialized AND no recent popup, show immediately
      const timeSinceLastPopup = Date.now() - lastPopupTime
      const canShowNow = prev.currentPopup === null &&
                         isInitialized &&
                         prev.queue.length === 0 &&
                         (lastPopupTime === 0 || timeSinceLastPopup >= POPUP_DELAY_MS)

      if (canShowNow) {
        setLastPopupTime(Date.now())
        return { ...prev, currentPopup: type }
      }

      // Add to queue in priority order
      const newQueue = [...prev.queue, type].sort(
        (a, b) => POPUP_PRIORITY.indexOf(a) - POPUP_PRIORITY.indexOf(b)
      )

      return { ...prev, queue: newQueue }
    })
  }, [isInitialized, lastPopupTime])

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
        dismissed: newDismissed
      }
    })
    setLastPopupTime(Date.now())
  }, [])

  const isPopupAllowed = useCallback((type: PopupType) => {
    return state.currentPopup === type
  }, [state.currentPopup])

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
