"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"

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
 * - Delay between popups (5 seconds minimum)
 * - User dismissal respected
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

const POPUP_DELAY_MS = 15000 // 15 seconds between popups - give user time to focus on content
const INITIAL_DELAY_MS = 30000 // 30 seconds initial delay before showing any popup
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
  const [lastDismissTime, setLastDismissTime] = useState<number>(0)
  const [isInitialized, setIsInitialized] = useState(false)

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
    // This gives the user time to see the page content first
    const initTimer = setTimeout(() => {
      setIsInitialized(true)
    }, INITIAL_DELAY_MS)

    return () => clearTimeout(initTimer)
  }, [])

  // Process queue when current popup is null and enough time has passed
  useEffect(() => {
    // Don't process queue until initialized (initial delay passed)
    if (!isInitialized) return
    if (state.currentPopup !== null || state.queue.length === 0) return

    const timeSinceLastDismiss = Date.now() - lastDismissTime
    const delay = lastDismissTime === 0 ? 0 : Math.max(0, POPUP_DELAY_MS - timeSinceLastDismiss)

    const timer = setTimeout(() => {
      setState(prev => {
        // Get next popup from queue that isn't dismissed
        const nextPopup = prev.queue.find(p => !prev.dismissed.has(p))
        if (!nextPopup) return { ...prev, queue: [] }

        return {
          ...prev,
          currentPopup: nextPopup,
          queue: prev.queue.filter(p => p !== nextPopup)
        }
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [state.currentPopup, state.queue, lastDismissTime, isInitialized])

  const requestPopup = useCallback((type: PopupType) => {
    setState(prev => {
      // Don't add if already dismissed
      if (prev.dismissed.has(type)) return prev

      // Don't add if already showing or in queue
      if (prev.currentPopup === type || prev.queue.includes(type)) return prev

      // If no current popup AND initialized, show immediately
      if (prev.currentPopup === null && isInitialized) {
        return { ...prev, currentPopup: type }
      }

      // Add to queue in priority order (will be processed when initialized)
      const newQueue = [...prev.queue, type].sort(
        (a, b) => POPUP_PRIORITY.indexOf(a) - POPUP_PRIORITY.indexOf(b)
      )

      return { ...prev, queue: newQueue }
    })
  }, [isInitialized])

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
    setLastDismissTime(Date.now())
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
