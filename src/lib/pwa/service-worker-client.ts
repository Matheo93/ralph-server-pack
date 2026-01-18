/**
 * Service Worker Client - Communication utilities for the main thread
 * Provides typed messaging to the service worker for offline operations
 */

// ============================================================================
// Types
// ============================================================================

export interface OfflineTask {
  id?: string
  title: string
  description?: string
  priority?: string
  category?: string
  due_date?: string
  household_id: string
}

export interface SyncMessage {
  type: "SYNC_COMPLETE" | "TASK_SYNCED"
  item?: unknown
  offlineId?: string
  serverData?: unknown
}

// ============================================================================
// Feature Detection
// ============================================================================

export function isServiceWorkerSupported(): boolean {
  if (typeof window === "undefined") return false
  return "serviceWorker" in navigator
}

export async function isServiceWorkerReady(): Promise<boolean> {
  if (!isServiceWorkerSupported()) return false

  try {
    await navigator.serviceWorker.ready
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Message Passing
// ============================================================================

/**
 * Send a message to the service worker and optionally wait for a response
 */
export async function sendToServiceWorker<T = void>(
  message: Record<string, unknown>,
  expectResponse = false
): Promise<T | undefined> {
  if (!isServiceWorkerSupported()) return undefined

  const registration = await navigator.serviceWorker.ready
  const controller = registration.active

  if (!controller) return undefined

  if (expectResponse) {
    return new Promise((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => {
        resolve(event.data as T)
      }
      controller.postMessage(message, [channel.port2])
    })
  }

  controller.postMessage(message)
  return undefined
}

// ============================================================================
// Offline Task Operations
// ============================================================================

/**
 * Save a task to IndexedDB via the service worker for offline access
 */
export async function saveOfflineTask(task: OfflineTask): Promise<boolean> {
  const response = await sendToServiceWorker<{ success: boolean }>(
    { type: "SAVE_OFFLINE_TASK", task },
    true
  )
  return response?.success ?? false
}

/**
 * Get all offline tasks from IndexedDB via the service worker
 */
export async function getOfflineTasks(): Promise<OfflineTask[]> {
  const response = await sendToServiceWorker<{ tasks: OfflineTask[] }>(
    { type: "GET_OFFLINE_TASKS" },
    true
  )
  return response?.tasks ?? []
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Clear all caches via the service worker
 */
export async function clearAllCaches(): Promise<void> {
  await sendToServiceWorker({ type: "CLEAR_CACHE" })
}

/**
 * Trigger a skip waiting to activate the new service worker
 */
export async function skipWaiting(): Promise<void> {
  await sendToServiceWorker({ type: "SKIP_WAITING" })
}

// ============================================================================
// Sync Listeners
// ============================================================================

type SyncCallback = (message: SyncMessage) => void

const syncListeners: Set<SyncCallback> = new Set()

/**
 * Subscribe to sync completion events from the service worker
 */
export function onSyncComplete(callback: SyncCallback): () => void {
  syncListeners.add(callback)
  return () => syncListeners.delete(callback)
}

// Initialize listener for service worker messages
if (typeof window !== "undefined" && isServiceWorkerSupported()) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as SyncMessage
    if (data.type === "SYNC_COMPLETE" || data.type === "TASK_SYNCED") {
      syncListeners.forEach((callback) => callback(data))
    }
  })
}

// ============================================================================
// Background Sync
// ============================================================================

/**
 * Register for background sync
 */
export async function registerBackgroundSync(tag = "background-sync"): Promise<boolean> {
  if (!isServiceWorkerSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready

    // Type assertion for SyncManager which is not in standard types
    interface SyncableRegistration extends ServiceWorkerRegistration {
      sync?: {
        register: (tag: string) => Promise<void>
      }
    }

    const syncReg = registration as SyncableRegistration
    if (syncReg.sync) {
      await syncReg.sync.register(tag)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Register for periodic background sync
 */
export async function registerPeriodicSync(
  tag: string,
  minInterval: number
): Promise<boolean> {
  if (!isServiceWorkerSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready

    // Type assertion for PeriodicSyncManager
    interface PeriodicSyncableRegistration extends ServiceWorkerRegistration {
      periodicSync?: {
        register: (tag: string, options: { minInterval: number }) => Promise<void>
      }
    }

    const syncReg = registration as PeriodicSyncableRegistration
    if (syncReg.periodicSync) {
      await syncReg.periodicSync.register(tag, { minInterval })
      return true
    }
    return false
  } catch {
    return false
  }
}

// ============================================================================
// Hook: useOfflineSync
// ============================================================================

import { useState, useEffect, useCallback } from "react"

export interface UseOfflineSyncReturn {
  isOnline: boolean
  offlineTasks: OfflineTask[]
  pendingSyncCount: number
  saveTask: (task: OfflineTask) => Promise<boolean>
  refreshOfflineTasks: () => Promise<void>
  triggerSync: () => Promise<boolean>
}

export function useOfflineSync(autoRefresh = true): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  )
  const [offlineTasks, setOfflineTasks] = useState<OfflineTask[]>([])

  // Track online status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Refresh offline tasks
  const refreshOfflineTasks = useCallback(async () => {
    const tasks = await getOfflineTasks()
    setOfflineTasks(tasks)
  }, [])

  // Auto-refresh on mount and when coming online
  useEffect(() => {
    if (!autoRefresh) return

    refreshOfflineTasks()

    if (isOnline) {
      // Refresh when coming online to show synced status
      refreshOfflineTasks()
    }
  }, [autoRefresh, isOnline, refreshOfflineTasks])

  // Listen for sync completions
  useEffect(() => {
    const unsubscribe = onSyncComplete(() => {
      refreshOfflineTasks()
    })
    return unsubscribe
  }, [refreshOfflineTasks])

  // Save task handler
  const saveTask = useCallback(async (task: OfflineTask): Promise<boolean> => {
    const success = await saveOfflineTask(task)
    if (success) {
      await refreshOfflineTasks()
    }
    return success
  }, [refreshOfflineTasks])

  // Trigger sync manually
  const triggerSync = useCallback(async (): Promise<boolean> => {
    return registerBackgroundSync()
  }, [])

  // Count pending (unsynced) tasks
  const pendingSyncCount = offlineTasks.filter(
    (task) => !(task as unknown as { synced?: boolean }).synced
  ).length

  return {
    isOnline,
    offlineTasks,
    pendingSyncCount,
    saveTask,
    refreshOfflineTasks,
    triggerSync,
  }
}
