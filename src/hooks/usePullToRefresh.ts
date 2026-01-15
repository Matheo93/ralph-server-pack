"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"

interface UsePullToRefreshOptions {
  threshold?: number
  onRefresh?: () => Promise<void>
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  isPulling: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function usePullToRefresh(
  options: UsePullToRefreshOptions = {}
): UsePullToRefreshReturn {
  const { threshold = 80, onRefresh, disabled = false } = options

  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const startY = useRef(0)
  const scrollTop = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    const touch = e.touches[0]
    if (!touch) return

    startY.current = touch.clientY
    scrollTop.current = window.scrollY || document.documentElement.scrollTop
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    const touch = e.touches[0]
    if (!touch) return

    // Only activate when scrolled to top
    const currentScrollTop = window.scrollY || document.documentElement.scrollTop
    if (currentScrollTop > 0) return

    const diff = touch.clientY - startY.current

    // Only pull down, not up
    if (diff <= 0) {
      setPullDistance(0)
      setIsPulling(false)
      return
    }

    // Apply resistance (pull distance is less than actual drag)
    const resistance = 0.5
    const newDistance = Math.min(diff * resistance, threshold * 1.5)

    setPullDistance(newDistance)
    setIsPulling(true)

    // Prevent scroll when pulling
    if (newDistance > 5) {
      e.preventDefault()
    }
  }, [disabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return

    setIsPulling(false)

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true)
      setPullDistance(threshold * 0.5) // Keep some visual feedback

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }

      try {
        if (onRefresh) {
          await onRefresh()
        } else {
          // Default: use Next.js router refresh
          router.refresh()
          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error("Pull to refresh error:", error)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Not enough pull, reset
      setPullDistance(0)
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh, router])

  // Reset on unmount
  useEffect(() => {
    return () => {
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [])

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
