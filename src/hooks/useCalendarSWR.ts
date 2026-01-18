"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { getCalendarEvents, getEventsCountByDate, type CalendarEvent } from "@/lib/actions/calendar"

export interface CalendarSWRData {
  events: CalendarEvent[]
  eventCounts: Record<string, number>
}

interface CacheEntry {
  data: CalendarSWRData
  timestamp: number
  isRevalidating: boolean
}

interface CacheState {
  [key: string]: CacheEntry | Promise<CalendarSWRData>
}

// Configuration SWR
const SWR_CONFIG = {
  // Durée pendant laquelle les données sont considérées "fresh" (pas de revalidation)
  FRESH_AGE_MS: 30 * 1000, // 30 secondes
  // Durée maximale de cache (après quoi on force un refetch même en affichant le stale)
  MAX_AGE_MS: 5 * 60 * 1000, // 5 minutes
  // Intervalle de revalidation automatique en arrière-plan
  REVALIDATE_ON_FOCUS: true,
  REVALIDATE_ON_RECONNECT: true,
  // Déduplication des requêtes simultanées
  DEDUPE_INTERVAL_MS: 2000,
} as const

/**
 * Hook implémentant le pattern Stale-While-Revalidate pour les données calendrier.
 *
 * Le pattern SWR fonctionne ainsi:
 * 1. Retourne immédiatement les données du cache (même si "stale")
 * 2. Lance une revalidation en arrière-plan
 * 3. Met à jour les données une fois la revalidation terminée
 *
 * Cela permet une expérience utilisateur fluide avec affichage instantané
 * tout en gardant les données à jour.
 */
export function useCalendarSWR(initialData?: { date: Date; data: CalendarSWRData }) {
  const cacheRef = useRef<CacheState>({})
  const lastFetchRef = useRef<Record<string, number>>({})
  const [, forceUpdate] = useState({})

  // Initialiser le cache avec les données initiales
  useEffect(() => {
    if (initialData) {
      const key = getCacheKey(initialData.date)
      cacheRef.current[key] = {
        data: initialData.data,
        timestamp: Date.now(),
        isRevalidating: false,
      }
    }
  }, []) // Intentionnel: on ne veut initialiser qu'une fois

  const getCacheKey = useCallback((date: Date): string => {
    return format(startOfMonth(date), "yyyy-MM")
  }, [])

  const fetchMonthData = useCallback(async (date: Date): Promise<CalendarSWRData> => {
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

  /**
   * Vérifie si le cache est "fresh" (pas besoin de revalidation)
   */
  const isFresh = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < SWR_CONFIG.FRESH_AGE_MS
  }, [])

  /**
   * Vérifie si le cache est expiré (doit être revalidé même en background)
   */
  const isExpired = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp > SWR_CONFIG.MAX_AGE_MS
  }, [])

  /**
   * Vérifie si on peut dédupliquer une requête (requête récente en cours)
   */
  const shouldDedupe = useCallback((key: string): boolean => {
    const lastFetch = lastFetchRef.current[key]
    if (!lastFetch) return false
    return Date.now() - lastFetch < SWR_CONFIG.DEDUPE_INTERVAL_MS
  }, [])

  /**
   * Revalide les données d'un mois en arrière-plan
   */
  const revalidate = useCallback(async (date: Date): Promise<void> => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    // Skip si déjà en cours de revalidation ou requête récente
    if (cached && !(cached instanceof Promise) && cached.isRevalidating) {
      return
    }
    if (shouldDedupe(key)) {
      return
    }

    // Marquer comme "en cours de revalidation"
    if (cached && !(cached instanceof Promise)) {
      cacheRef.current[key] = { ...cached, isRevalidating: true }
    }

    lastFetchRef.current[key] = Date.now()

    try {
      const newData = await fetchMonthData(date)

      cacheRef.current[key] = {
        data: newData,
        timestamp: Date.now(),
        isRevalidating: false,
      }

      // Forcer le re-render pour mettre à jour les composants
      forceUpdate({})
    } catch (error) {
      console.error("Erreur lors de la revalidation du calendrier:", error)

      // En cas d'erreur, garder les anciennes données mais arrêter le flag revalidating
      if (cached && !(cached instanceof Promise)) {
        cacheRef.current[key] = { ...cached, isRevalidating: false }
      }
    }
  }, [getCacheKey, fetchMonthData, shouldDedupe])

  /**
   * Obtient les données d'un mois avec le pattern SWR:
   * - Retourne immédiatement les données stale si disponibles
   * - Lance une revalidation en arrière-plan si nécessaire
   * - Retourne les nouvelles données une fois disponibles
   */
  const getMonthData = useCallback(async (
    date: Date,
    options?: { forceRevalidate?: boolean }
  ): Promise<{ data: CalendarSWRData; isStale: boolean; isRevalidating: boolean }> => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    // Cas 1: Données en cache (pas une Promise)
    if (cached && !(cached instanceof Promise)) {
      const needsRevalidation = !isFresh(cached) || options?.forceRevalidate
      const expired = isExpired(cached)

      // Si les données sont expirées, on attend la revalidation
      if (expired || options?.forceRevalidate) {
        // Mais on retourne quand même les données stale immédiatement
        // et on lance la revalidation en parallèle
        void revalidate(date)

        return {
          data: cached.data,
          isStale: true,
          isRevalidating: true,
        }
      }

      // Données fresh ou stale mais pas expirées
      if (needsRevalidation && !cached.isRevalidating) {
        // Lancer revalidation en arrière-plan (non-bloquant)
        void revalidate(date)
      }

      return {
        data: cached.data,
        isStale: !isFresh(cached),
        isRevalidating: cached.isRevalidating,
      }
    }

    // Cas 2: Promise en cours (requête déjà lancée)
    if (cached instanceof Promise) {
      const data = await cached
      return {
        data,
        isStale: false,
        isRevalidating: false,
      }
    }

    // Cas 3: Pas de cache, faire le fetch initial
    lastFetchRef.current[key] = Date.now()

    const promise = fetchMonthData(date)
    cacheRef.current[key] = promise

    try {
      const data = await promise
      cacheRef.current[key] = {
        data,
        timestamp: Date.now(),
        isRevalidating: false,
      }
      return {
        data,
        isStale: false,
        isRevalidating: false,
      }
    } catch (error) {
      delete cacheRef.current[key]
      throw error
    }
  }, [getCacheKey, fetchMonthData, isFresh, isExpired, revalidate])

  /**
   * Obtient les données du cache de manière synchrone (pour affichage instantané)
   */
  const getCachedData = useCallback((date: Date): CalendarSWRData | null => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    if (cached && !(cached instanceof Promise)) {
      return cached.data
    }

    return null
  }, [getCacheKey])

  /**
   * Vérifie si les données d'un mois sont en cours de revalidation
   */
  const isRevalidating = useCallback((date: Date): boolean => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    if (cached && !(cached instanceof Promise)) {
      return cached.isRevalidating
    }

    return cached instanceof Promise
  }, [getCacheKey])

  /**
   * Vérifie si les données d'un mois sont stale
   */
  const isStale = useCallback((date: Date): boolean => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    if (cached && !(cached instanceof Promise)) {
      return !isFresh(cached)
    }

    return true
  }, [getCacheKey, isFresh])

  /**
   * Met à jour le cache manuellement (utile après une mutation)
   */
  const setCache = useCallback((date: Date, data: CalendarSWRData): void => {
    const key = getCacheKey(date)
    cacheRef.current[key] = {
      data,
      timestamp: Date.now(),
      isRevalidating: false,
    }
    forceUpdate({})
  }, [getCacheKey])

  /**
   * Invalide le cache d'un mois spécifique (force revalidation au prochain accès)
   */
  const invalidate = useCallback((date: Date): void => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    if (cached && !(cached instanceof Promise)) {
      // Mettre timestamp à 0 pour forcer la revalidation
      cacheRef.current[key] = {
        ...cached,
        timestamp: 0,
      }
    }
  }, [getCacheKey])

  /**
   * Invalide tout le cache
   */
  const invalidateAll = useCallback((): void => {
    Object.keys(cacheRef.current).forEach(key => {
      const cached = cacheRef.current[key]
      if (cached && !(cached instanceof Promise)) {
        cacheRef.current[key] = {
          ...cached,
          timestamp: 0,
        }
      }
    })
  }, [])

  /**
   * Vide complètement le cache
   */
  const clearCache = useCallback((): void => {
    cacheRef.current = {}
    lastFetchRef.current = {}
  }, [])

  /**
   * Prefetch un mois (sans bloquer, sans retourner de données)
   */
  const prefetch = useCallback((date: Date): void => {
    const key = getCacheKey(date)
    const cached = cacheRef.current[key]

    // Skip si déjà en cache ou en cours
    if (cached) return

    // Lancer le fetch en arrière-plan
    void getMonthData(date)
  }, [getCacheKey, getMonthData])

  // Revalidation automatique sur focus/reconnect
  useEffect(() => {
    const handleFocus = () => {
      if (!SWR_CONFIG.REVALIDATE_ON_FOCUS) return

      // Revalider toutes les entrées stale en cache
      Object.keys(cacheRef.current).forEach(key => {
        const cached = cacheRef.current[key]
        if (cached && !(cached instanceof Promise) && !isFresh(cached)) {
          const parts = key.split("-")
          const year = parseInt(parts[0] ?? "0", 10)
          const month = parseInt(parts[1] ?? "0", 10)
          if (!isNaN(year) && !isNaN(month) && year > 0 && month > 0) {
            const date = new Date(year, month - 1, 1)
            void revalidate(date)
          }
        }
      })
    }

    const handleOnline = () => {
      if (!SWR_CONFIG.REVALIDATE_ON_RECONNECT) return

      // Revalider toutes les entrées en cache
      Object.keys(cacheRef.current).forEach(key => {
        const cached = cacheRef.current[key]
        if (cached && !(cached instanceof Promise)) {
          const parts = key.split("-")
          const year = parseInt(parts[0] ?? "0", 10)
          const month = parseInt(parts[1] ?? "0", 10)
          if (!isNaN(year) && !isNaN(month) && year > 0 && month > 0) {
            const date = new Date(year, month - 1, 1)
            void revalidate(date)
          }
        }
      })
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("online", handleOnline)
    }
  }, [isFresh, revalidate])

  return {
    // Méthodes principales
    getMonthData,
    getCachedData,
    prefetch,
    revalidate,

    // Méthodes de mutation du cache
    setCache,
    invalidate,
    invalidateAll,
    clearCache,

    // État
    isRevalidating,
    isStale,
  }
}

/**
 * Hook utilitaire pour les mutations calendrier avec revalidation automatique
 */
export function useCalendarMutation(swr: ReturnType<typeof useCalendarSWR>) {
  const mutate = useCallback(async <T>(
    mutationFn: () => Promise<T>,
    options?: {
      // Dates à invalider après la mutation
      invalidateDates?: Date[]
      // Optimistic update data
      optimisticData?: { date: Date; data: CalendarSWRData }
    }
  ): Promise<T> => {
    // Appliquer l'optimistic update si fourni
    if (options?.optimisticData) {
      swr.setCache(options.optimisticData.date, options.optimisticData.data)
    }

    try {
      const result = await mutationFn()

      // Invalider les dates spécifiées après succès
      if (options?.invalidateDates) {
        options.invalidateDates.forEach(date => {
          void swr.revalidate(date)
        })
      }

      return result
    } catch (error) {
      // En cas d'erreur, revalider pour annuler l'optimistic update
      if (options?.optimisticData) {
        void swr.revalidate(options.optimisticData.date)
      }
      throw error
    }
  }, [swr])

  return { mutate }
}
