"use client"

import { useCallback, useRef, useState, useEffect } from "react"

// =============================================================================
// TYPES
// =============================================================================

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // Minimum distance to trigger swipe (default: 50px)
  preventScroll?: boolean // Prevent scrolling during swipe
  enabled?: boolean
}

export interface SwipeState {
  isSwiping: boolean
  direction: "left" | "right" | "up" | "down" | null
  distance: number
}

export interface LongPressOptions {
  onLongPress: () => void
  duration?: number // Duration to trigger (default: 500ms)
  onStart?: () => void
  onCancel?: () => void
  enabled?: boolean
}

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number // Distance to trigger refresh (default: 100px)
  enabled?: boolean
}

// =============================================================================
// SWIPE GESTURE HOOK
// =============================================================================

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
    enabled = true,
  } = options

  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    distance: 0,
  })

  const startPos = useRef<{ x: number; y: number } | null>(null)
  const currentPos = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return
      const touch = e.touches[0]
      if (!touch) return
      startPos.current = { x: touch.clientX, y: touch.clientY }
      currentPos.current = { x: touch.clientX, y: touch.clientY }
      setState({ isSwiping: true, direction: null, distance: 0 })
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !startPos.current) return
      const touch = e.touches[0]
      if (!touch) return

      currentPos.current = { x: touch.clientX, y: touch.clientY }
      const deltaX = touch.clientX - startPos.current.x
      const deltaY = touch.clientY - startPos.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      let direction: SwipeState["direction"] = null
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left"
      } else {
        direction = deltaY > 0 ? "down" : "up"
      }

      setState({ isSwiping: true, direction, distance })

      if (preventScroll && distance > 10) {
        e.preventDefault()
      }
    },
    [enabled, preventScroll]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !startPos.current || !currentPos.current) {
      setState({ isSwiping: false, direction: null, distance: 0 })
      return
    }

    const deltaX = currentPos.current.x - startPos.current.x
    const deltaY = currentPos.current.y - startPos.current.y
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX > absY && absX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else if (absY > absX && absY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }

    startPos.current = null
    currentPos.current = null
    setState({ isSwiping: false, direction: null, distance: 0 })
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  const bind = useCallback(() => ({
    onTouchStart: handleTouchStart as unknown as React.TouchEventHandler,
    onTouchMove: handleTouchMove as unknown as React.TouchEventHandler,
    onTouchEnd: handleTouchEnd as unknown as React.TouchEventHandler,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { state, bind }
}

// =============================================================================
// LONG PRESS HOOK
// =============================================================================

export function useLongPress(options: LongPressOptions) {
  const {
    onLongPress,
    duration = 500,
    onStart,
    onCancel,
    enabled = true,
  } = options

  const [isPressed, setIsPressed] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressTriggered = useRef(false)

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!enabled) return
      e.preventDefault()
      isLongPressTriggered.current = false
      setIsPressed(true)
      onStart?.()

      timerRef.current = setTimeout(() => {
        isLongPressTriggered.current = true
        onLongPress()
      }, duration)
    },
    [enabled, duration, onLongPress, onStart]
  )

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsPressed(false)
    if (!isLongPressTriggered.current) {
      onCancel?.()
    }
  }, [onCancel])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    isPressed,
    bind: {
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
    },
  }
}

// =============================================================================
// PULL TO REFRESH HOOK
// =============================================================================

export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 100,
    enabled = true,
  } = options

  const [state, setState] = useState({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
  })

  const startY = useRef<number | null>(null)
  const scrollTop = useRef<number>(0)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return
      scrollTop.current = window.scrollY || document.documentElement.scrollTop
      if (scrollTop.current !== 0) return

      const touch = e.touches[0]
      if (!touch) return
      startY.current = touch.clientY
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || startY.current === null || state.isRefreshing) return
      if (scrollTop.current !== 0) return

      const touch = e.touches[0]
      if (!touch) return

      const currentY = touch.clientY
      const pullDistance = Math.max(0, (currentY - startY.current) * 0.5) // Damping

      if (pullDistance > 0) {
        e.preventDefault()
        setState({
          isPulling: true,
          pullDistance,
          isRefreshing: false,
          canRefresh: pullDistance > threshold,
        })
      }
    },
    [enabled, threshold, state.isRefreshing]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || startY.current === null) return

    if (state.canRefresh && !state.isRefreshing) {
      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
        pullDistance: 0,
      }))

      try {
        await onRefresh()
      } finally {
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false,
        })
      }
    } else {
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false,
      })
    }

    startY.current = null
  }, [enabled, state.canRefresh, state.isRefreshing, onRefresh])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener("touchstart", handleTouchStart, { passive: false })
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return state
}

// =============================================================================
// DOUBLE TAP HOOK
// =============================================================================

export function useDoubleTap(
  onDoubleTap: () => void,
  delay: number = 300,
  enabled: boolean = true
) {
  const lastTap = useRef<number>(0)

  const handleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!enabled) return

      const now = Date.now()
      if (now - lastTap.current < delay) {
        e.preventDefault()
        onDoubleTap()
        lastTap.current = 0
      } else {
        lastTap.current = now
      }
    },
    [enabled, delay, onDoubleTap]
  )

  return {
    onClick: handleTap,
    onTouchEnd: handleTap,
  }
}

// =============================================================================
// HAPTIC FEEDBACK (iOS Safari)
// =============================================================================

export function triggerHapticFeedback(type: "light" | "medium" | "heavy" = "medium") {
  // Check if the Vibration API is available
  if ("vibrate" in navigator) {
    const durations = {
      light: 10,
      medium: 20,
      heavy: 50,
    }
    navigator.vibrate(durations[type])
  }

  // For iOS Safari, we can try to trigger haptic via audio context
  // This is a workaround and doesn't always work
  if (typeof window !== "undefined" && "AudioContext" in window) {
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0 // Silent
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.001)
    } catch {
      // Silently fail - haptic not critical
    }
  }
}
