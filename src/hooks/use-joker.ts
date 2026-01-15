"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getJokerStatus,
  useJoker as useJokerAction,
  type ActionResult,
} from "@/lib/actions/streak"

interface JokerStatus {
  available: boolean
  usedThisMonth: boolean
  isPremium: boolean
  currentStreak: number
  streakAtRisk: boolean
  lastStreakUpdate: string | null
}

interface UseJokerReturn {
  status: JokerStatus | null
  isLoading: boolean
  error: string | null
  useJokerAction: () => Promise<ActionResult<{ streakSaved: number }>>
  refreshStatus: () => void
}

export function useJoker(): UseJokerReturn {
  const [status, setStatus] = useState<JokerStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await getJokerStatus()
      if (result.success && result.data) {
        setStatus(result.data)
      } else {
        setError(result.error ?? "Erreur lors du chargement")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleUseJoker = useCallback(async () => {
    return useJokerAction()
  }, [])

  return {
    status,
    isLoading,
    error,
    useJokerAction: handleUseJoker,
    refreshStatus: fetchStatus,
  }
}
