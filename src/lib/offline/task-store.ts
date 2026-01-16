/**
 * Offline Task Store - IndexedDB-based task storage for offline support
 *
 * Features:
 * - Store tasks locally in IndexedDB
 * - Queue offline mutations for sync
 * - Merge server/local changes
 * - Handle conflicts with last-write-wins
 */

import { z } from "zod"

// =============================================================================
// Types & Schemas
// =============================================================================

export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const TaskPrioritySchema = z.enum(["low", "normal", "high", "urgent"])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

export const OfflineTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  category_code: z.string().nullable(),
  child_id: z.string().nullable(),
  child_name: z.string().nullable(),
  assigned_to_id: z.string().nullable(),
  assigned_to_name: z.string().nullable(),
  deadline: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullable(),
  household_id: z.string(),
  is_recurring: z.boolean(),
  // Offline metadata
  _offline_created: z.boolean().optional(),
  _offline_modified: z.boolean().optional(),
  _sync_pending: z.boolean().optional(),
  _last_synced: z.string().nullable().optional(),
})

export type OfflineTask = z.infer<typeof OfflineTaskSchema>

export const OfflineMutationSchema = z.object({
  id: z.string(),
  type: z.enum(["create", "update", "delete", "complete"]),
  taskId: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  retryCount: z.number(),
  status: z.enum(["pending", "syncing", "failed", "synced"]),
})

export type OfflineMutation = z.infer<typeof OfflineMutationSchema>

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  conflicts: string[]
  errors: string[]
}

// =============================================================================
// Database Constants
// =============================================================================

const DB_NAME = "familyload-offline"
const DB_VERSION = 1
const TASKS_STORE = "tasks"
const MUTATIONS_STORE = "mutations"
const METADATA_STORE = "metadata"

// =============================================================================
// Database Initialization
// =============================================================================

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Tasks store
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const tasksStore = db.createObjectStore(TASKS_STORE, { keyPath: "id" })
        tasksStore.createIndex("household_id", "household_id", { unique: false })
        tasksStore.createIndex("status", "status", { unique: false })
        tasksStore.createIndex("deadline", "deadline", { unique: false })
        tasksStore.createIndex("child_id", "child_id", { unique: false })
        tasksStore.createIndex("_sync_pending", "_sync_pending", { unique: false })
      }

      // Mutations queue store
      if (!db.objectStoreNames.contains(MUTATIONS_STORE)) {
        const mutationsStore = db.createObjectStore(MUTATIONS_STORE, { keyPath: "id" })
        mutationsStore.createIndex("status", "status", { unique: false })
        mutationsStore.createIndex("timestamp", "timestamp", { unique: false })
      }

      // Metadata store
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: "key" })
      }
    }
  })

  return dbPromise
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

async function getStore(
  storeName: string,
  mode: IDBTransactionMode = "readonly"
): Promise<IDBObjectStore> {
  const db = await openDatabase()
  const transaction = db.transaction(storeName, mode)
  return transaction.objectStore(storeName)
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// =============================================================================
// Task Operations
// =============================================================================

/**
 * Get all tasks from local store
 */
export async function getLocalTasks(householdId?: string): Promise<OfflineTask[]> {
  try {
    const store = await getStore(TASKS_STORE)

    if (householdId) {
      const index = store.index("household_id")
      return wrapRequest(index.getAll(householdId))
    }

    return wrapRequest(store.getAll())
  } catch (error) {
    console.error("[OfflineStore] Failed to get tasks:", error)
    return []
  }
}

/**
 * Get a single task by ID
 */
export async function getLocalTask(taskId: string): Promise<OfflineTask | undefined> {
  try {
    const store = await getStore(TASKS_STORE)
    return wrapRequest(store.get(taskId))
  } catch (error) {
    console.error("[OfflineStore] Failed to get task:", error)
    return undefined
  }
}

/**
 * Save tasks to local store (bulk)
 */
export async function saveLocalTasks(tasks: OfflineTask[]): Promise<void> {
  try {
    const store = await getStore(TASKS_STORE, "readwrite")

    for (const task of tasks) {
      const validatedTask = OfflineTaskSchema.parse({
        ...task,
        _last_synced: new Date().toISOString(),
      })
      store.put(validatedTask)
    }
  } catch (error) {
    console.error("[OfflineStore] Failed to save tasks:", error)
    throw error
  }
}

/**
 * Create a task locally (offline)
 */
export async function createLocalTask(
  task: Omit<OfflineTask, "id" | "created_at" | "updated_at">
): Promise<OfflineTask> {
  const now = new Date().toISOString()
  const newTask: OfflineTask = {
    ...task,
    id: generateId(),
    created_at: now,
    updated_at: now,
    _offline_created: true,
    _sync_pending: true,
    _last_synced: null,
  }

  try {
    const store = await getStore(TASKS_STORE, "readwrite")
    await wrapRequest(store.add(newTask))

    // Queue mutation for sync
    await queueMutation({
      type: "create",
      taskId: newTask.id,
      data: newTask,
    })

    return newTask
  } catch (error) {
    console.error("[OfflineStore] Failed to create task:", error)
    throw error
  }
}

/**
 * Update a task locally
 */
export async function updateLocalTask(
  taskId: string,
  updates: Partial<OfflineTask>
): Promise<OfflineTask | undefined> {
  try {
    const store = await getStore(TASKS_STORE, "readwrite")
    const existingTask = await wrapRequest(store.get(taskId))

    if (!existingTask) {
      console.warn("[OfflineStore] Task not found:", taskId)
      return undefined
    }

    const updatedTask: OfflineTask = {
      ...existingTask,
      ...updates,
      updated_at: new Date().toISOString(),
      _offline_modified: true,
      _sync_pending: true,
    }

    await wrapRequest(store.put(updatedTask))

    // Queue mutation for sync
    await queueMutation({
      type: "update",
      taskId,
      data: updates,
    })

    return updatedTask
  } catch (error) {
    console.error("[OfflineStore] Failed to update task:", error)
    throw error
  }
}

/**
 * Complete a task locally
 */
export async function completeLocalTask(taskId: string): Promise<OfflineTask | undefined> {
  return updateLocalTask(taskId, {
    status: "completed",
    completed_at: new Date().toISOString(),
  })
}

/**
 * Delete a task locally
 */
export async function deleteLocalTask(taskId: string): Promise<void> {
  try {
    const store = await getStore(TASKS_STORE, "readwrite")
    const existingTask = await wrapRequest(store.get(taskId))

    if (existingTask) {
      await wrapRequest(store.delete(taskId))

      // Only queue mutation if task was already synced
      if (!existingTask._offline_created) {
        await queueMutation({
          type: "delete",
          taskId,
        })
      }
    }
  } catch (error) {
    console.error("[OfflineStore] Failed to delete task:", error)
    throw error
  }
}

/**
 * Get tasks pending sync
 */
export async function getPendingSyncTasks(): Promise<OfflineTask[]> {
  try {
    const tasks = await getLocalTasks()
    return tasks.filter((t) => t._sync_pending === true)
  } catch (error) {
    console.error("[OfflineStore] Failed to get pending tasks:", error)
    return []
  }
}

/**
 * Mark tasks as synced
 */
export async function markTasksSynced(taskIds: string[]): Promise<void> {
  try {
    const store = await getStore(TASKS_STORE, "readwrite")

    for (const taskId of taskIds) {
      const task = await wrapRequest(store.get(taskId))
      if (task) {
        task._sync_pending = false
        task._offline_created = false
        task._offline_modified = false
        task._last_synced = new Date().toISOString()
        store.put(task)
      }
    }
  } catch (error) {
    console.error("[OfflineStore] Failed to mark tasks synced:", error)
  }
}

// =============================================================================
// Mutation Queue
// =============================================================================

/**
 * Queue a mutation for sync
 */
export async function queueMutation(
  mutation: Omit<OfflineMutation, "id" | "timestamp" | "retryCount" | "status">
): Promise<void> {
  try {
    const store = await getStore(MUTATIONS_STORE, "readwrite")

    const fullMutation: OfflineMutation = {
      ...mutation,
      id: generateId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
    }

    await wrapRequest(store.add(fullMutation))
  } catch (error) {
    console.error("[OfflineStore] Failed to queue mutation:", error)
  }
}

/**
 * Get pending mutations
 */
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  try {
    const store = await getStore(MUTATIONS_STORE)
    const index = store.index("status")
    const pending = await wrapRequest(index.getAll("pending"))
    const failed = await wrapRequest(index.getAll("failed"))
    return [...pending, ...failed].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    )
  } catch (error) {
    console.error("[OfflineStore] Failed to get mutations:", error)
    return []
  }
}

/**
 * Update mutation status
 */
export async function updateMutationStatus(
  mutationId: string,
  status: OfflineMutation["status"],
  incrementRetry = false
): Promise<void> {
  try {
    const store = await getStore(MUTATIONS_STORE, "readwrite")
    const mutation = await wrapRequest(store.get(mutationId))

    if (mutation) {
      mutation.status = status
      if (incrementRetry) {
        mutation.retryCount++
      }
      store.put(mutation)
    }
  } catch (error) {
    console.error("[OfflineStore] Failed to update mutation:", error)
  }
}

/**
 * Remove synced mutations
 */
export async function removeSyncedMutations(): Promise<void> {
  try {
    const store = await getStore(MUTATIONS_STORE, "readwrite")
    const index = store.index("status")
    const synced = await wrapRequest(index.getAllKeys("synced"))

    for (const key of synced) {
      store.delete(key)
    }
  } catch (error) {
    console.error("[OfflineStore] Failed to remove synced mutations:", error)
  }
}

// =============================================================================
// Metadata
// =============================================================================

/**
 * Get metadata value
 */
export async function getMetadata<T>(key: string): Promise<T | undefined> {
  try {
    const store = await getStore(METADATA_STORE)
    const result = await wrapRequest(store.get(key))
    return result?.value
  } catch (error) {
    console.error("[OfflineStore] Failed to get metadata:", error)
    return undefined
  }
}

/**
 * Set metadata value
 */
export async function setMetadata<T>(key: string, value: T): Promise<void> {
  try {
    const store = await getStore(METADATA_STORE, "readwrite")
    await wrapRequest(store.put({ key, value }))
  } catch (error) {
    console.error("[OfflineStore] Failed to set metadata:", error)
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTimestamp(): Promise<string | undefined> {
  return getMetadata("lastSync")
}

/**
 * Set last sync timestamp
 */
export async function setLastSyncTimestamp(timestamp: string): Promise<void> {
  return setMetadata("lastSync", timestamp)
}

// =============================================================================
// Sync Operations
// =============================================================================

/**
 * Sync local changes with server
 */
export async function syncWithServer(
  syncEndpoint: string,
  authToken?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: [],
    errors: [],
  }

  try {
    const mutations = await getPendingMutations()

    if (mutations.length === 0) {
      result.success = true
      return result
    }

    // Process mutations in order
    for (const mutation of mutations) {
      try {
        await updateMutationStatus(mutation.id, "syncing")

        const response = await fetch(syncEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            type: mutation.type,
            taskId: mutation.taskId,
            data: mutation.data,
            timestamp: mutation.timestamp,
          }),
        })

        if (response.ok) {
          const serverData = await response.json()

          await updateMutationStatus(mutation.id, "synced")
          result.synced++

          // Update local task with server response
          if (serverData.task) {
            const store = await getStore(TASKS_STORE, "readwrite")

            // Handle ID mapping for offline-created tasks
            if (mutation.type === "create" && serverData.task.id !== mutation.taskId) {
              await wrapRequest(store.delete(mutation.taskId))
            }

            await wrapRequest(store.put({
              ...serverData.task,
              _sync_pending: false,
              _offline_created: false,
              _offline_modified: false,
              _last_synced: new Date().toISOString(),
            }))
          }
        } else if (response.status === 409) {
          // Conflict - server has newer version
          result.conflicts.push(mutation.taskId)
          await updateMutationStatus(mutation.id, "failed", true)
          result.failed++
        } else {
          throw new Error(`Sync failed: ${response.status}`)
        }
      } catch (error) {
        result.errors.push(`Task ${mutation.taskId}: ${error instanceof Error ? error.message : "Unknown error"}`)
        await updateMutationStatus(mutation.id, "failed", true)
        result.failed++
      }
    }

    // Clean up synced mutations
    await removeSyncedMutations()

    // Update last sync timestamp
    await setLastSyncTimestamp(new Date().toISOString())

    result.success = result.failed === 0
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : "Sync failed")
  }

  return result
}

/**
 * Fetch tasks from server and merge with local
 */
export async function fetchAndMergeTasks(
  fetchEndpoint: string,
  householdId: string,
  authToken?: string
): Promise<OfflineTask[]> {
  try {
    const response = await fetch(`${fetchEndpoint}?householdId=${householdId}`, {
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    })

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`)
    }

    const serverTasks: OfflineTask[] = await response.json()
    const localTasks = await getLocalTasks(householdId)

    // Build map of local tasks with pending changes
    const pendingLocal = new Map<string, OfflineTask>()
    for (const task of localTasks) {
      if (task._sync_pending || task._offline_created) {
        pendingLocal.set(task.id, task)
      }
    }

    // Merge server tasks with pending local changes
    const mergedTasks: OfflineTask[] = []

    for (const serverTask of serverTasks) {
      const localTask = pendingLocal.get(serverTask.id)

      if (localTask) {
        // Local has pending changes - keep local version
        mergedTasks.push(localTask)
        pendingLocal.delete(serverTask.id)
      } else {
        // Use server version
        mergedTasks.push({
          ...serverTask,
          _sync_pending: false,
          _offline_created: false,
          _offline_modified: false,
          _last_synced: new Date().toISOString(),
        })
      }
    }

    // Add remaining offline-created tasks
    for (const localTask of pendingLocal.values()) {
      if (localTask._offline_created) {
        mergedTasks.push(localTask)
      }
    }

    // Save merged tasks
    await saveLocalTasks(mergedTasks)

    return mergedTasks
  } catch (error) {
    console.error("[OfflineStore] Failed to fetch and merge:", error)

    // Return local tasks as fallback
    return getLocalTasks(householdId)
  }
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction([TASKS_STORE, MUTATIONS_STORE, METADATA_STORE], "readwrite")

    await wrapRequest(transaction.objectStore(TASKS_STORE).clear())
    await wrapRequest(transaction.objectStore(MUTATIONS_STORE).clear())
    await wrapRequest(transaction.objectStore(METADATA_STORE).clear())
  } catch (error) {
    console.error("[OfflineStore] Failed to clear data:", error)
  }
}

/**
 * Get offline store stats
 */
export async function getOfflineStats(): Promise<{
  taskCount: number
  pendingMutations: number
  lastSync: string | undefined
}> {
  const [tasks, mutations, lastSync] = await Promise.all([
    getLocalTasks(),
    getPendingMutations(),
    getLastSyncTimestamp(),
  ])

  return {
    taskCount: tasks.length,
    pendingMutations: mutations.length,
    lastSync,
  }
}
