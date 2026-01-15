/**
 * Background Sync - Offline task creation and sync queue management
 * Handles offline operations with conflict resolution
 */

// ============================================================================
// Types
// ============================================================================

export type SyncOperation = "create" | "update" | "delete"

export interface SyncItem<T = unknown> {
  id: string
  operation: SyncOperation
  entity: string
  data: T
  timestamp: number
  retries: number
  lastError?: string
}

export interface SyncResult {
  success: boolean
  itemId: string
  error?: string
  serverData?: unknown
}

export interface ConflictResolution<T = unknown> {
  strategy: "client-wins" | "server-wins" | "merge" | "manual"
  resolve?: (client: T, server: T) => T
}

// ============================================================================
// Constants
// ============================================================================

export const SYNC_QUEUE_KEY = "familyload_sync_queue"
export const MAX_RETRIES = 3
export const SYNC_TAG = "background-sync"
export const PERIODIC_SYNC_TAG = "periodic-sync"

// ============================================================================
// Feature Detection
// ============================================================================

export function isBackgroundSyncSupported(): boolean {
  if (typeof window === "undefined") return false
  return "serviceWorker" in navigator && "SyncManager" in window
}

export function isPeriodicSyncSupported(): boolean {
  if (typeof window === "undefined") return false
  return "serviceWorker" in navigator && "PeriodicSyncManager" in (window as unknown as { PeriodicSyncManager?: unknown })
}

// ============================================================================
// Sync Queue Management
// ============================================================================

class SyncQueue {
  private queue: SyncItem[] = []
  private isProcessing = false
  private onSync?: (item: SyncItem) => Promise<SyncResult>

  constructor() {
    this.loadQueue()
  }

  // --------------------------------------------------------------------------
  // Queue Operations
  // --------------------------------------------------------------------------

  add<T>(item: Omit<SyncItem<T>, "id" | "timestamp" | "retries">): string {
    const id = this.generateId()
    const syncItem: SyncItem<T> = {
      ...item,
      id,
      timestamp: Date.now(),
      retries: 0,
    }
    this.queue.push(syncItem as SyncItem)
    this.saveQueue()
    this.requestSync()
    return id
  }

  remove(id: string): boolean {
    const initialLength = this.queue.length
    this.queue = this.queue.filter((item) => item.id !== id)
    if (this.queue.length !== initialLength) {
      this.saveQueue()
      return true
    }
    return false
  }

  get(id: string): SyncItem | undefined {
    return this.queue.find((item) => item.id === id)
  }

  getAll(): SyncItem[] {
    return [...this.queue]
  }

  getByEntity(entity: string): SyncItem[] {
    return this.queue.filter((item) => item.entity === entity)
  }

  getPending(): SyncItem[] {
    return this.queue.filter((item) => item.retries < MAX_RETRIES)
  }

  getFailed(): SyncItem[] {
    return this.queue.filter((item) => item.retries >= MAX_RETRIES)
  }

  clear(): void {
    this.queue = []
    this.saveQueue()
  }

  clearFailed(): void {
    this.queue = this.queue.filter((item) => item.retries < MAX_RETRIES)
    this.saveQueue()
  }

  // --------------------------------------------------------------------------
  // Sync Handler
  // --------------------------------------------------------------------------

  setSyncHandler(handler: (item: SyncItem) => Promise<SyncResult>): void {
    this.onSync = handler
  }

  async processQueue(): Promise<SyncResult[]> {
    if (this.isProcessing || !this.onSync) {
      return []
    }

    this.isProcessing = true
    const results: SyncResult[] = []
    const pending = this.getPending()

    for (const item of pending) {
      try {
        const result = await this.onSync(item)
        results.push(result)

        if (result.success) {
          this.remove(item.id)
        } else {
          this.incrementRetries(item.id, result.error)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        this.incrementRetries(item.id, errorMessage)
        results.push({
          success: false,
          itemId: item.id,
          error: errorMessage,
        })
      }
    }

    this.isProcessing = false
    return results
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  private loadQueue(): void {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch {
      this.queue = []
    }
  }

  private saveQueue(): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue))
    } catch {
      // Storage full or unavailable
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  private incrementRetries(id: string, error?: string): void {
    const item = this.queue.find((i) => i.id === id)
    if (item) {
      item.retries++
      item.lastError = error
      this.saveQueue()
    }
  }

  private async requestSync(): Promise<void> {
    if (!isBackgroundSyncSupported()) return

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register(SYNC_TAG)
    } catch {
      // Sync registration failed
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const syncQueue = new SyncQueue()

// ============================================================================
// Conflict Resolution
// ============================================================================

export function resolveConflict<T extends Record<string, unknown>>(
  client: T,
  server: T,
  resolution: ConflictResolution<T>
): T {
  switch (resolution.strategy) {
    case "client-wins":
      return client

    case "server-wins":
      return server

    case "merge":
      // Simple merge: client values override server, except for timestamps
      return {
        ...server,
        ...client,
        updated_at: server["updated_at"] as string | number,
      } as T

    case "manual":
      if (resolution.resolve) {
        return resolution.resolve(client, server)
      }
      return server

    default:
      return server
  }
}

// ============================================================================
// Task Sync Helpers
// ============================================================================

export interface OfflineTask {
  title: string
  description?: string
  priority?: string
  category?: string
  due_date?: string
  household_id: string
}

export function queueTaskCreate(task: OfflineTask): string {
  return syncQueue.add({
    operation: "create",
    entity: "task",
    data: task,
  })
}

export function queueTaskUpdate(taskId: string, updates: Partial<OfflineTask>): string {
  return syncQueue.add({
    operation: "update",
    entity: "task",
    data: { id: taskId, ...updates },
  })
}

export function queueTaskDelete(taskId: string): string {
  return syncQueue.add({
    operation: "delete",
    entity: "task",
    data: { id: taskId },
  })
}

// ============================================================================
// Periodic Sync Registration
// ============================================================================

export async function registerPeriodicSync(
  tag: string,
  minInterval: number
): Promise<boolean> {
  if (!isPeriodicSyncSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const periodicSync = (registration as unknown as { periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } }).periodicSync
    await periodicSync.register(tag, { minInterval })
    return true
  } catch {
    return false
  }
}

export async function unregisterPeriodicSync(tag: string): Promise<boolean> {
  if (!isPeriodicSyncSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const periodicSync = (registration as unknown as { periodicSync: { unregister: (tag: string) => Promise<void> } }).periodicSync
    await periodicSync.unregister(tag)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Online/Offline Detection
// ============================================================================

export function isOnline(): boolean {
  if (typeof window === "undefined") return true
  return navigator.onLine
}

export function onOnline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("online", callback)
  return () => window.removeEventListener("online", callback)
}

export function onOffline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("offline", callback)
  return () => window.removeEventListener("offline", callback)
}

// ============================================================================
// Hook: useSyncQueue
// ============================================================================

import { useState, useEffect, useCallback } from "react"

export function useSyncQueue() {
  const [queue, setQueue] = useState<SyncItem[]>([])
  const [isOnlineState, setIsOnlineState] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setQueue(syncQueue.getAll())
    setIsOnlineState(isOnline())

    const handleOnline = () => {
      setIsOnlineState(true)
      syncQueue.processQueue()
    }

    const handleOffline = () => {
      setIsOnlineState(false)
    }

    const unsubOnline = onOnline(handleOnline)
    const unsubOffline = onOffline(handleOffline)

    return () => {
      unsubOnline()
      unsubOffline()
    }
  }, [])

  const sync = useCallback(async () => {
    if (!isOnlineState) return []

    setIsSyncing(true)
    const results = await syncQueue.processQueue()
    setQueue(syncQueue.getAll())
    setIsSyncing(false)
    return results
  }, [isOnlineState])

  const addToQueue = useCallback(<T>(item: Omit<SyncItem<T>, "id" | "timestamp" | "retries">) => {
    const id = syncQueue.add(item)
    setQueue(syncQueue.getAll())
    return id
  }, [])

  return {
    queue,
    isOnline: isOnlineState,
    isSyncing,
    sync,
    addToQueue,
    pendingCount: queue.filter((i) => i.retries < MAX_RETRIES).length,
    failedCount: queue.filter((i) => i.retries >= MAX_RETRIES).length,
  }
}
