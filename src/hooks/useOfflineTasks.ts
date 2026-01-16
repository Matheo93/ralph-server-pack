"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getLocalTasks,
  getLocalTask,
  createLocalTask,
  updateLocalTask,
  completeLocalTask,
  deleteLocalTask,
  syncWithServer,
  fetchAndMergeTasks,
  getOfflineStats,
  type OfflineTask,
  type SyncResult,
} from "@/lib/offline/task-store"

/**
 * Hook for offline-first task management
 *
 * Features:
 * - Local-first reads (instant)
 * - Background sync with server
 * - Optimistic updates
 * - Conflict resolution
 * - Network status awareness
 */

export interface UseOfflineTasksOptions {
  /** Household ID to filter tasks */
  householdId?: string
  /** API endpoint for syncing tasks */
  syncEndpoint?: string
  /** API endpoint for fetching tasks */
  fetchEndpoint?: string
  /** Auth token for API calls */
  authToken?: string
  /** Auto-sync interval in ms (0 = disabled) */
  autoSyncInterval?: number
  /** Sync when coming back online */
  syncOnReconnect?: boolean
}

export interface UseOfflineTasksResult {
  /** Tasks (local-first) */
  tasks: OfflineTask[]
  /** Loading state */
  isLoading: boolean
  /** Syncing state */
  isSyncing: boolean
  /** Online status */
  isOnline: boolean
  /** Has pending changes */
  hasPendingChanges: boolean
  /** Last sync timestamp */
  lastSync: string | undefined
  /** Sync error */
  syncError: string | null
  /** Get a single task */
  getTask: (taskId: string) => Promise<OfflineTask | undefined>
  /** Create a task */
  createTask: (task: Omit<OfflineTask, "id" | "created_at" | "updated_at">) => Promise<OfflineTask>
  /** Update a task */
  updateTask: (taskId: string, updates: Partial<OfflineTask>) => Promise<OfflineTask | undefined>
  /** Complete a task */
  completeTask: (taskId: string) => Promise<OfflineTask | undefined>
  /** Delete a task */
  deleteTask: (taskId: string) => Promise<void>
  /** Manually trigger sync */
  sync: () => Promise<SyncResult>
  /** Refresh tasks from server */
  refresh: () => Promise<void>
  /** Get offline stats */
  getStats: () => Promise<{ taskCount: number; pendingMutations: number; lastSync: string | undefined }>
}

export function useOfflineTasks(options: UseOfflineTasksOptions = {}): UseOfflineTasksResult {
  const {
    householdId,
    syncEndpoint = "/api/v2/tasks/sync",
    fetchEndpoint = "/api/v2/tasks",
    authToken,
    autoSyncInterval = 60000, // 1 minute
    syncOnReconnect = true,
  } = options

  const [tasks, setTasks] = useState<OfflineTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [lastSync, setLastSync] = useState<string | undefined>()
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    updateOnlineStatus()

    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])

  // Load tasks from local store
  const loadTasks = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      setIsLoading(true)
      const localTasks = await getLocalTasks(householdId)
      setTasks(localTasks)

      // Check for pending changes
      const pending = localTasks.some((t) => t._sync_pending || t._offline_created)
      setHasPendingChanges(pending)

      // Get last sync
      const stats = await getOfflineStats()
      setLastSync(stats.lastSync)
    } catch (error) {
      console.error("[useOfflineTasks] Failed to load tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  // Sync with server
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: ["Offline"],
      }
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await syncWithServer(syncEndpoint, authToken)

      if (!result.success && result.errors.length > 0) {
        setSyncError(result.errors[0] ?? "Sync failed")
      }

      // Reload tasks after sync
      await loadTasks()

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed"
      setSyncError(errorMessage)
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: [errorMessage],
      }
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, syncEndpoint, authToken, loadTasks])

  // Refresh tasks from server
  const refresh = useCallback(async (): Promise<void> => {
    if (!isOnline || !householdId) return

    setIsLoading(true)

    try {
      const mergedTasks = await fetchAndMergeTasks(fetchEndpoint, householdId, authToken)
      setTasks(mergedTasks)

      const stats = await getOfflineStats()
      setLastSync(stats.lastSync)
      setHasPendingChanges(stats.pendingMutations > 0)
    } catch (error) {
      console.error("[useOfflineTasks] Failed to refresh:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, householdId, fetchEndpoint, authToken])

  // Initial load
  useEffect(() => {
    isMountedRef.current = true
    loadTasks()

    return () => {
      isMountedRef.current = false
    }
  }, [loadTasks])

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncInterval <= 0 || !isOnline) return

    const scheduleSync = () => {
      syncTimeoutRef.current = setTimeout(async () => {
        if (hasPendingChanges) {
          await sync()
        }
        scheduleSync()
      }, autoSyncInterval)
    }

    scheduleSync()

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [autoSyncInterval, isOnline, hasPendingChanges, sync])

  // Sync on reconnect
  useEffect(() => {
    if (syncOnReconnect && isOnline && hasPendingChanges) {
      sync()
    }
  }, [syncOnReconnect, isOnline, hasPendingChanges, sync])

  // Get single task
  const getTask = useCallback(async (taskId: string): Promise<OfflineTask | undefined> => {
    return getLocalTask(taskId)
  }, [])

  // Create task
  const createTask = useCallback(
    async (task: Omit<OfflineTask, "id" | "created_at" | "updated_at">): Promise<OfflineTask> => {
      const newTask = await createLocalTask(task)

      // Optimistic update
      setTasks((prev) => [...prev, newTask])
      setHasPendingChanges(true)

      // Trigger background sync if online
      if (isOnline) {
        sync().catch(() => {
          // Sync error already handled
        })
      }

      return newTask
    },
    [isOnline, sync]
  )

  // Update task
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<OfflineTask>): Promise<OfflineTask | undefined> => {
      const updatedTask = await updateLocalTask(taskId, updates)

      if (updatedTask) {
        // Optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t))
        )
        setHasPendingChanges(true)

        // Trigger background sync if online
        if (isOnline) {
          sync().catch(() => {
            // Sync error already handled
          })
        }
      }

      return updatedTask
    },
    [isOnline, sync]
  )

  // Complete task
  const completeTaskFn = useCallback(
    async (taskId: string): Promise<OfflineTask | undefined> => {
      const completedTask = await completeLocalTask(taskId)

      if (completedTask) {
        // Optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? completedTask : t))
        )
        setHasPendingChanges(true)

        // Trigger background sync if online
        if (isOnline) {
          sync().catch(() => {
            // Sync error already handled
          })
        }
      }

      return completedTask
    },
    [isOnline, sync]
  )

  // Delete task
  const deleteTaskFn = useCallback(
    async (taskId: string): Promise<void> => {
      await deleteLocalTask(taskId)

      // Optimistic update
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setHasPendingChanges(true)

      // Trigger background sync if online
      if (isOnline) {
        sync().catch(() => {
          // Sync error already handled
        })
      }
    },
    [isOnline, sync]
  )

  // Get stats
  const getStats = useCallback(async () => {
    return getOfflineStats()
  }, [])

  return {
    tasks,
    isLoading,
    isSyncing,
    isOnline,
    hasPendingChanges,
    lastSync,
    syncError,
    getTask,
    createTask,
    updateTask,
    completeTask: completeTaskFn,
    deleteTask: deleteTaskFn,
    sync,
    refresh,
    getStats,
  }
}

/**
 * Hook to check network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine)

    updateStatus()

    window.addEventListener("online", updateStatus)
    window.addEventListener("offline", updateStatus)

    return () => {
      window.removeEventListener("online", updateStatus)
      window.removeEventListener("offline", updateStatus)
    }
  }, [])

  return isOnline
}

/**
 * Hook for offline detection with debounce
 */
export function useOfflineDetection(debounceMs = 1000) {
  const [isOffline, setIsOffline] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleOffline = () => {
      // Debounce to avoid flashing on brief disconnections
      timeoutRef.current = setTimeout(() => {
        setIsOffline(true)
      }, debounceMs)
    }

    const handleOnline = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsOffline(false)
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    // Initial check
    if (!navigator.onLine) {
      handleOffline()
    }

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [debounceMs])

  return isOffline
}
