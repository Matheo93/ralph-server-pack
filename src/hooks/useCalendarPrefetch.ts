"use client"

import { useCallback, useRef, useState } from "react"
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from "date-fns"
import { getCalendarEvents, getEventsCountByDate, type CalendarEvent } from "@/lib/actions/calendar"

export interface PrefetchedData {
  events: CalendarEvent[]
  eventCounts: Record<string, number>
}

interface PrefetchCache {
  [key: string]: PrefetchedData | Promise<PrefetchedData>
}

// Délai de debounce pour le prefetch (en ms)
const PREFETCH_DEBOUNCE_MS = 150

/**
 * Hook pour prefetcher les données du calendrier des mois adjacents
 * Permet de réduire le temps de chargement lors de la navigation
 */
export function useCalendarPrefetch(initialData?: { date: Date; data: PrefetchedData }) {
  const cacheRef = useRef<PrefetchCache>({})
  const pendingRef = useRef<Set<string>>(new Set())
  const debounceTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Initialize cache with initial data if provided
  if (initialData) {
    const key = format(initialData.date, "yyyy-MM")
    if (!cacheRef.current[key]) {
      cacheRef.current[key] = initialData.data
    }
  }

  const getCacheKey = useCallback((date: Date): string => {
    return format(startOfMonth(date), "yyyy-MM")
  }, [])

  const fetchMonthData = useCallback(async (date: Date): Promise<PrefetchedData> => {
    const startDate = startOfMonth(date)
    const endDate = endOfMonth(date)

    const [events, eventCounts] = await Promise.all([
      getCalendarEvents({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }),
      getEventsCountByDate(
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      ),
    ])

    return { events, eventCounts }
  }, [])

  const prefetchMonthImmediate = useCallback(async (date: Date): Promise<void> => {
    const key = getCacheKey(date)

    // Skip if already cached or pending
    if (cacheRef.current[key] || pendingRef.current.has(key)) {
      return
    }

    pendingRef.current.add(key)

    try {
      const promise = fetchMonthData(date)
      cacheRef.current[key] = promise

      const data = await promise
      cacheRef.current[key] = data
    } catch (error) {
      // Remove from cache on error
      delete cacheRef.current[key]
      console.error("Erreur lors du prefetch du calendrier:", error)
    } finally {
      pendingRef.current.delete(key)
    }
  }, [getCacheKey, fetchMonthData])

  /**
   * Prefetch un mois avec debouncing pour éviter les requêtes excessives
   * lors du mouvement rapide de la souris
   */
  const prefetchMonth = useCallback((date: Date): void => {
    const key = getCacheKey(date)

    // Skip if already cached or pending
    if (cacheRef.current[key] || pendingRef.current.has(key)) {
      return
    }

    // Clear existing timer for this key
    if (debounceTimerRef.current[key]) {
      clearTimeout(debounceTimerRef.current[key])
    }

    // Set new debounced timer
    debounceTimerRef.current[key] = setTimeout(() => {
      void prefetchMonthImmediate(date)
      delete debounceTimerRef.current[key]
    }, PREFETCH_DEBOUNCE_MS)
  }, [getCacheKey, prefetchMonthImmediate])

  /**
   * Prefetch immédiat du mois précédent (sans debounce)
   * Utilisé quand l'intention est claire (hover sur bouton nav)
   */
  const prefetchPreviousMonth = useCallback((currentDate: Date): void => {
    const previousMonth = subMonths(currentDate, 1)
    void prefetchMonthImmediate(previousMonth)
  }, [prefetchMonthImmediate])

  /**
   * Prefetch immédiat du mois suivant (sans debounce)
   * Utilisé quand l'intention est claire (hover sur bouton nav)
   */
  const prefetchNextMonth = useCallback((currentDate: Date): void => {
    const nextMonth = addMonths(currentDate, 1)
    void prefetchMonthImmediate(nextMonth)
  }, [prefetchMonthImmediate])

  /**
   * Prefetch les deux mois adjacents immédiatement
   */
  const prefetchAdjacentMonths = useCallback((currentDate: Date): void => {
    prefetchPreviousMonth(currentDate)
    prefetchNextMonth(currentDate)
  }, [prefetchPreviousMonth, prefetchNextMonth])

  /**
   * Annule tous les prefetch en attente (debounced)
   */
  const cancelPendingPrefetches = useCallback((): void => {
    Object.values(debounceTimerRef.current).forEach(timer => clearTimeout(timer))
    debounceTimerRef.current = {}
  }, [])

  /**
   * Get cached data for a specific month (synchronous, returns null if not cached)
   */
  const getCachedData = useCallback((date: Date): PrefetchedData | null => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    // Return null if not cached or if still a promise
    if (!cached || cached instanceof Promise) {
      return null
    }

    return cached
  }, [getCacheKey])

  /**
   * Get data for a month - from cache if available, otherwise fetch
   * This is the main method to use when navigating between months
   */
  const getMonthData = useCallback(async (date: Date): Promise<PrefetchedData> => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    // Return cached data if available and not a promise
    if (cached && !(cached instanceof Promise)) {
      return cached
    }

    // Wait for pending promise if exists
    if (cached instanceof Promise) {
      setIsLoading(true)
      try {
        const data = await cached
        return data
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch if not in cache
    setIsLoading(true)
    try {
      const data = await fetchMonthData(date)
      cacheRef.current[key] = data
      return data
    } finally {
      setIsLoading(false)
    }
  }, [getCacheKey, fetchMonthData])

  /**
   * Set data in cache for a specific month (useful for initial server data)
   */
  const setCachedData = useCallback((date: Date, data: PrefetchedData): void => {
    const key = getCacheKey(date)
    cacheRef.current[key] = data
  }, [getCacheKey])

  const clearCache = useCallback((): void => {
    cancelPendingPrefetches()
    cacheRef.current = {}
    pendingRef.current.clear()
  }, [cancelPendingPrefetches])

  /**
   * Check if data is currently being fetched
   */
  const isPending = useCallback((date: Date): boolean => {
    const key = getCacheKey(date)
    return pendingRef.current.has(key) || cacheRef.current[key] instanceof Promise
  }, [getCacheKey])

  return {
    prefetchMonth,
    prefetchPreviousMonth,
    prefetchNextMonth,
    prefetchAdjacentMonths,
    getCachedData,
    getMonthData,
    setCachedData,
    clearCache,
    cancelPendingPrefetches,
    isPending,
    isLoading,
  }
}
