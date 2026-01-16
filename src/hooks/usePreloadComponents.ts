"use client"

import { useEffect, useCallback, useRef } from "react"

/**
 * Hook to preload heavy components based on user interactions
 *
 * Strategies:
 * - onIdle: Preload when browser is idle (requestIdleCallback)
 * - onHover: Preload when user hovers over trigger element
 * - onVisible: Preload when element enters viewport
 * - immediate: Preload immediately after mount
 */

type PreloadStrategy = "onIdle" | "onHover" | "onVisible" | "immediate"

interface PreloadConfig {
  /** Which strategy to use for preloading */
  strategy: PreloadStrategy
  /** Delay in ms before preloading (for onIdle/immediate) */
  delay?: number
  /** Import function that loads the component */
  importFn: () => Promise<unknown>
}

/**
 * Preload a single component
 */
export function usePreloadComponent(config: PreloadConfig) {
  const { strategy, delay = 0, importFn } = config
  const hasPreloaded = useRef(false)

  const preload = useCallback(() => {
    if (hasPreloaded.current) return
    hasPreloaded.current = true

    if (delay > 0) {
      setTimeout(() => {
        importFn()
      }, delay)
    } else {
      importFn()
    }
  }, [delay, importFn])

  useEffect(() => {
    if (strategy === "immediate") {
      preload()
    } else if (strategy === "onIdle") {
      if ("requestIdleCallback" in window) {
        const id = requestIdleCallback(() => preload(), { timeout: 5000 })
        return () => cancelIdleCallback(id)
      } else {
        // Fallback for Safari
        const timer = setTimeout(preload, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [strategy, preload])

  return { preload, hasPreloaded: hasPreloaded.current }
}

/**
 * Preload multiple components with priority ordering
 */
export function usePreloadQueue(components: PreloadConfig[]) {
  const queueIndex = useRef(0)

  useEffect(() => {
    const preloadNext = () => {
      if (queueIndex.current >= components.length) return

      const config = components[queueIndex.current]
      if (!config) return

      config.importFn().then(() => {
        queueIndex.current++
        // Schedule next preload
        if ("requestIdleCallback" in window) {
          requestIdleCallback(preloadNext, { timeout: 5000 })
        } else {
          setTimeout(preloadNext, 500)
        }
      })
    }

    // Start preloading on idle
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(preloadNext, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    } else {
      const timer = setTimeout(preloadNext, 1000)
      return () => clearTimeout(timer)
    }
  }, [components])
}

/**
 * Hook to preload component on hover
 * Returns ref to attach to trigger element
 */
export function usePreloadOnHover(importFn: () => Promise<unknown>) {
  const hasPreloaded = useRef(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleMouseEnter = () => {
      if (hasPreloaded.current) return
      hasPreloaded.current = true
      importFn()
    }

    element.addEventListener("mouseenter", handleMouseEnter)
    return () => element.removeEventListener("mouseenter", handleMouseEnter)
  }, [importFn])

  return ref
}

/**
 * Hook to preload component when visible
 * Uses IntersectionObserver
 */
export function usePreloadOnVisible(
  importFn: () => Promise<unknown>,
  options?: IntersectionObserverInit
) {
  const hasPreloaded = useRef(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || hasPreloaded.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPreloaded.current) {
            hasPreloaded.current = true
            importFn()
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: "200px", // Preload 200px before visible
        ...options,
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [importFn, options])

  return ref
}

// ============================================================================
// Pre-configured preloaders for common components
// ============================================================================

/**
 * Preload MagicNotepad when FAB area is hovered
 */
export function useMagicNotepadPreloader() {
  return usePreloadOnHover(() => import("@/components/custom/MagicNotepad"))
}

/**
 * Preload ConfettiCelebration before task completion
 */
export function useConfettiPreloader() {
  return usePreloadComponent({
    strategy: "onIdle",
    delay: 3000,
    importFn: () => import("@/components/custom/ConfettiCelebration"),
  })
}

/**
 * Preload VocalRecorder when near mic button
 */
export function useVocalRecorderPreloader() {
  return usePreloadOnHover(() => import("@/components/custom/VocalRecorder"))
}

/**
 * Preload coaching components after initial render
 */
export function useCoachingPreloader() {
  return usePreloadComponent({
    strategy: "onIdle",
    delay: 5000,
    importFn: () => import("@/components/custom/CoachMarks"),
  })
}

/**
 * Preload heavy marketing components
 */
export function useMarketingPreloader() {
  usePreloadQueue([
    {
      strategy: "onIdle",
      importFn: () => import("@/components/marketing/AnimatedFamilyIllustration"),
    },
    {
      strategy: "onIdle",
      importFn: () => import("@/components/marketing/Hero"),
    },
  ])
}

/**
 * Preload page transition components
 */
export function usePageTransitionPreloader() {
  return usePreloadComponent({
    strategy: "immediate",
    importFn: () => import("@/components/custom/PageTransition"),
  })
}
