"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { TaskListItem } from "@/types/task"

interface OptimisticTaskState {
  isOptimistic: boolean
  optimisticStatus: TaskListItem["status"] | null
  error: string | null
}

interface UseOptimisticTaskOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Hook for optimistic task updates
 * Provides immediate UI feedback while the server action is in progress
 */
export function useOptimisticTask(
  task: TaskListItem,
  options: UseOptimisticTaskOptions = {}
) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<OptimisticTaskState>({
    isOptimistic: false,
    optimisticStatus: null,
    error: null,
  })

  const { onSuccess, onError } = options

  // Get the effective status (optimistic or actual)
  const effectiveStatus = state.isOptimistic
    ? state.optimisticStatus ?? task.status
    : task.status

  // Optimistic complete
  const optimisticComplete = useCallback(
    async (action: () => Promise<{ success: boolean; error?: string }>) => {
      // Set optimistic state immediately
      setState({
        isOptimistic: true,
        optimisticStatus: "done",
        error: null,
      })

      startTransition(async () => {
        try {
          const result = await action()

          if (result.success) {
            // Success - keep the optimistic state and refresh
            onSuccess?.()
            router.refresh()
          } else {
            // Rollback on error
            setState({
              isOptimistic: false,
              optimisticStatus: null,
              error: result.error ?? "Une erreur est survenue",
            })
            onError?.(result.error ?? "Une erreur est survenue")
          }
        } catch (err) {
          // Network error - rollback
          const errorMessage =
            err instanceof Error ? err.message : "Erreur de connexion"
          setState({
            isOptimistic: false,
            optimisticStatus: null,
            error: errorMessage,
          })
          onError?.(errorMessage)
        }
      })
    },
    [router, onSuccess, onError]
  )

  // Optimistic cancel
  const optimisticCancel = useCallback(
    async (action: () => Promise<{ success: boolean; error?: string }>) => {
      setState({
        isOptimistic: true,
        optimisticStatus: "cancelled",
        error: null,
      })

      startTransition(async () => {
        try {
          const result = await action()

          if (result.success) {
            onSuccess?.()
            router.refresh()
          } else {
            setState({
              isOptimistic: false,
              optimisticStatus: null,
              error: result.error ?? "Une erreur est survenue",
            })
            onError?.(result.error ?? "Une erreur est survenue")
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Erreur de connexion"
          setState({
            isOptimistic: false,
            optimisticStatus: null,
            error: errorMessage,
          })
          onError?.(errorMessage)
        }
      })
    },
    [router, onSuccess, onError]
  )

  // Optimistic restore
  const optimisticRestore = useCallback(
    async (action: () => Promise<{ success: boolean; error?: string }>) => {
      setState({
        isOptimistic: true,
        optimisticStatus: "pending",
        error: null,
      })

      startTransition(async () => {
        try {
          const result = await action()

          if (result.success) {
            onSuccess?.()
            router.refresh()
          } else {
            setState({
              isOptimistic: false,
              optimisticStatus: null,
              error: result.error ?? "Une erreur est survenue",
            })
            onError?.(result.error ?? "Une erreur est survenue")
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Erreur de connexion"
          setState({
            isOptimistic: false,
            optimisticStatus: null,
            error: errorMessage,
          })
          onError?.(errorMessage)
        }
      })
    },
    [router, onSuccess, onError]
  )

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    isPending,
    isOptimistic: state.isOptimistic,
    effectiveStatus,
    error: state.error,
    optimisticComplete,
    optimisticCancel,
    optimisticRestore,
    clearError,
  }
}

/**
 * Simple hook for tracking action queue when offline
 */
interface QueuedAction {
  id: string
  type: "complete" | "cancel" | "delete" | "restore"
  taskId: string
  timestamp: number
}

export function useOfflineActionQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([])

  const addToQueue = useCallback((action: Omit<QueuedAction, "id" | "timestamp">) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    setQueue((prev) => [...prev, queuedAction])
    // Persist to localStorage for background sync
    try {
      const stored = localStorage.getItem("offlineActionQueue")
      const existing = stored ? JSON.parse(stored) : []
      localStorage.setItem(
        "offlineActionQueue",
        JSON.stringify([...existing, queuedAction])
      )
    } catch {
      // Ignore storage errors
    }
    return queuedAction.id
  }, [])

  const removeFromQueue = useCallback((actionId: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== actionId))
    try {
      const stored = localStorage.getItem("offlineActionQueue")
      if (stored) {
        const existing = JSON.parse(stored)
        localStorage.setItem(
          "offlineActionQueue",
          JSON.stringify(existing.filter((a: QueuedAction) => a.id !== actionId))
        )
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    try {
      localStorage.removeItem("offlineActionQueue")
    } catch {
      // Ignore storage errors
    }
  }, [])

  return {
    queue,
    queueLength: queue.length,
    addToQueue,
    removeFromQueue,
    clearQueue,
  }
}
