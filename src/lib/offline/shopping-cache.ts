/**
 * Shopping List Offline Cache - localStorage-based storage for offline support
 *
 * Features:
 * - Store shopping items locally in localStorage
 * - Queue offline mutations for sync when back online
 * - Optimistic updates for instant UI feedback
 * - Auto-sync when network is restored
 */

import { z } from "zod"

// =============================================================================
// Types & Schemas
// =============================================================================

export const CachedShoppingItemSchema = z.object({
  id: z.string(),
  list_id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string().nullable(),
  category: z.string(),
  is_checked: z.boolean(),
  checked_by: z.string().nullable(),
  checked_by_name: z.string().nullable(),
  checked_at: z.string().nullable(),
  added_by: z.string(),
  added_by_name: z.string().nullable(),
  note: z.string().nullable(),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  // Offline metadata
  _offline_created: z.boolean().optional(),
  _offline_modified: z.boolean().optional(),
  _sync_pending: z.boolean().optional(),
})

export type CachedShoppingItem = z.infer<typeof CachedShoppingItemSchema>

export const CachedShoppingListSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  item_count: z.number().optional(),
  checked_count: z.number().optional(),
})

export type CachedShoppingList = z.infer<typeof CachedShoppingListSchema>

export const ShoppingMutationSchema = z.object({
  id: z.string(),
  type: z.enum(["add", "check", "uncheck", "delete", "update", "clear_checked", "uncheck_all"]),
  itemId: z.string().optional(),
  listId: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  retryCount: z.number(),
})

export type ShoppingMutation = z.infer<typeof ShoppingMutationSchema>

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEYS = {
  ITEMS: "familyload_shopping_items",
  LIST: "familyload_shopping_list",
  MUTATIONS: "familyload_shopping_mutations",
  LAST_SYNC: "familyload_shopping_last_sync",
} as const

const MAX_RETRY_COUNT = 3

// =============================================================================
// Helper Functions
// =============================================================================

function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__"
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

// =============================================================================
// Shopping List Operations
// =============================================================================

/**
 * Get cached shopping list metadata
 */
export function getCachedList(): CachedShoppingList | null {
  if (!isLocalStorageAvailable()) return null
  const data = localStorage.getItem(STORAGE_KEYS.LIST)
  if (!data) return null

  try {
    return CachedShoppingListSchema.parse(JSON.parse(data))
  } catch {
    return null
  }
}

/**
 * Save shopping list metadata to cache
 */
export function saveCachedList(list: CachedShoppingList): void {
  if (!isLocalStorageAvailable()) return
  localStorage.setItem(STORAGE_KEYS.LIST, JSON.stringify(list))
}

// =============================================================================
// Shopping Items Operations
// =============================================================================

/**
 * Get all cached shopping items
 */
export function getCachedItems(): CachedShoppingItem[] {
  if (!isLocalStorageAvailable()) return []
  const data = localStorage.getItem(STORAGE_KEYS.ITEMS)
  return safeJsonParse<CachedShoppingItem[]>(data, [])
}

/**
 * Save all shopping items to cache
 */
export function saveCachedItems(items: CachedShoppingItem[]): void {
  if (!isLocalStorageAvailable()) return
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items))
}

/**
 * Get a single cached item by ID
 */
export function getCachedItem(itemId: string): CachedShoppingItem | undefined {
  const items = getCachedItems()
  return items.find(item => item.id === itemId)
}

/**
 * Add an item to the cache (optimistic)
 */
export function addCachedItem(item: Omit<CachedShoppingItem, "id" | "created_at" | "updated_at">): CachedShoppingItem {
  const now = new Date().toISOString()
  const newItem: CachedShoppingItem = {
    ...item,
    id: generateOfflineId(),
    created_at: now,
    updated_at: now,
    _offline_created: true,
    _sync_pending: true,
  }

  const items = getCachedItems()
  items.push(newItem)
  saveCachedItems(items)

  // Queue mutation
  queueMutation({
    type: "add",
    listId: item.list_id,
    itemId: newItem.id,
    data: { name: item.name, category: item.category, quantity: item.quantity },
  })

  return newItem
}

/**
 * Update a cached item (optimistic)
 */
export function updateCachedItem(itemId: string, updates: Partial<CachedShoppingItem>): CachedShoppingItem | undefined {
  const items = getCachedItems()
  const index = items.findIndex(item => item.id === itemId)

  if (index === -1) return undefined

  const existingItem = items[index]
  if (!existingItem) return undefined

  const updatedItem: CachedShoppingItem = {
    ...existingItem,
    ...updates,
    updated_at: new Date().toISOString(),
    _offline_modified: true,
    _sync_pending: true,
  }

  items[index] = updatedItem
  saveCachedItems(items)

  // Queue mutation only if not an offline-created item
  if (!existingItem._offline_created) {
    queueMutation({
      type: "update",
      listId: updatedItem.list_id,
      itemId,
      data: updates,
    })
  }

  return updatedItem
}

/**
 * Check/uncheck a cached item (optimistic)
 */
export function checkCachedItem(itemId: string, isChecked: boolean, checkedBy?: string, checkedByName?: string): CachedShoppingItem | undefined {
  const items = getCachedItems()
  const index = items.findIndex(item => item.id === itemId)

  if (index === -1) return undefined

  const existingItem = items[index]
  if (!existingItem) return undefined

  const updatedItem: CachedShoppingItem = {
    ...existingItem,
    is_checked: isChecked,
    checked_by: isChecked ? (checkedBy ?? existingItem.checked_by) : null,
    checked_by_name: isChecked ? (checkedByName ?? existingItem.checked_by_name) : null,
    checked_at: isChecked ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    _offline_modified: true,
    _sync_pending: true,
  }

  items[index] = updatedItem
  saveCachedItems(items)

  // Queue mutation only if not an offline-created item
  if (!existingItem._offline_created) {
    queueMutation({
      type: isChecked ? "check" : "uncheck",
      listId: updatedItem.list_id,
      itemId,
    })
  }

  return updatedItem
}

/**
 * Delete a cached item (optimistic)
 */
export function deleteCachedItem(itemId: string): boolean {
  const items = getCachedItems()
  const item = items.find(i => i.id === itemId)

  if (!item) return false

  const filtered = items.filter(i => i.id !== itemId)
  saveCachedItems(filtered)

  // Queue mutation only if not an offline-created item
  if (!item._offline_created) {
    queueMutation({
      type: "delete",
      listId: item.list_id,
      itemId,
    })
  }

  return true
}

/**
 * Clear all checked items from cache (optimistic)
 */
export function clearCheckedCachedItems(listId: string): number {
  const items = getCachedItems()
  const checkedItems = items.filter(i => i.list_id === listId && i.is_checked)
  const remainingItems = items.filter(i => i.list_id !== listId || !i.is_checked)

  saveCachedItems(remainingItems)

  // Queue mutation
  queueMutation({
    type: "clear_checked",
    listId,
  })

  return checkedItems.length
}

/**
 * Uncheck all items in cache (optimistic)
 */
export function uncheckAllCachedItems(listId: string): number {
  const items = getCachedItems()
  let count = 0

  const updatedItems = items.map(item => {
    if (item.list_id === listId && item.is_checked) {
      count++
      return {
        ...item,
        is_checked: false,
        checked_by: null,
        checked_by_name: null,
        checked_at: null,
        updated_at: new Date().toISOString(),
        _offline_modified: true,
        _sync_pending: true,
      }
    }
    return item
  })

  saveCachedItems(updatedItems)

  // Queue mutation
  queueMutation({
    type: "uncheck_all",
    listId,
  })

  return count
}

// =============================================================================
// Mutation Queue
// =============================================================================

/**
 * Get pending mutations
 */
export function getPendingMutations(): ShoppingMutation[] {
  if (!isLocalStorageAvailable()) return []
  const data = localStorage.getItem(STORAGE_KEYS.MUTATIONS)
  return safeJsonParse<ShoppingMutation[]>(data, [])
}

/**
 * Queue a mutation for later sync
 */
export function queueMutation(mutation: Omit<ShoppingMutation, "id" | "timestamp" | "retryCount">): void {
  if (!isLocalStorageAvailable()) return

  const mutations = getPendingMutations()
  const newMutation: ShoppingMutation = {
    ...mutation,
    id: generateOfflineId(),
    timestamp: new Date().toISOString(),
    retryCount: 0,
  }

  mutations.push(newMutation)
  localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(mutations))
}

/**
 * Remove a mutation from the queue
 */
export function removeMutation(mutationId: string): void {
  if (!isLocalStorageAvailable()) return

  const mutations = getPendingMutations()
  const filtered = mutations.filter(m => m.id !== mutationId)
  localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(filtered))
}

/**
 * Increment retry count for a mutation
 */
export function incrementMutationRetry(mutationId: string): boolean {
  if (!isLocalStorageAvailable()) return false

  const mutations = getPendingMutations()
  const index = mutations.findIndex(m => m.id === mutationId)

  if (index === -1) return false

  const mutation = mutations[index]
  if (!mutation) return false

  mutation.retryCount++

  // Remove if max retries exceeded
  if (mutation.retryCount > MAX_RETRY_COUNT) {
    mutations.splice(index, 1)
  }

  localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(mutations))
  return mutation.retryCount <= MAX_RETRY_COUNT
}

/**
 * Clear all mutations
 */
export function clearMutations(): void {
  if (!isLocalStorageAvailable()) return
  localStorage.removeItem(STORAGE_KEYS.MUTATIONS)
}

// =============================================================================
// Sync & Metadata
// =============================================================================

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): string | null {
  if (!isLocalStorageAvailable()) return null
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
}

/**
 * Set last sync timestamp
 */
export function setLastSyncTime(timestamp: string): void {
  if (!isLocalStorageAvailable()) return
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp)
}

/**
 * Check if there are pending changes
 */
export function hasPendingChanges(): boolean {
  return getPendingMutations().length > 0
}

/**
 * Merge server items with cached items
 * Server items take precedence unless there are pending local changes
 */
export function mergeWithServerItems(serverItems: CachedShoppingItem[]): CachedShoppingItem[] {
  const cachedItems = getCachedItems()
  const mutations = getPendingMutations()

  // Build set of item IDs with pending mutations
  const pendingItemIds = new Set<string>()
  for (const mutation of mutations) {
    if (mutation.itemId) {
      pendingItemIds.add(mutation.itemId)
    }
  }

  // Build map of offline-created items
  const offlineCreatedItems = cachedItems.filter(item => item._offline_created)

  // Merge: server items + pending local items + offline-created items
  const mergedMap = new Map<string, CachedShoppingItem>()

  // Add server items
  for (const item of serverItems) {
    if (!pendingItemIds.has(item.id)) {
      mergedMap.set(item.id, item)
    }
  }

  // Add items with pending changes (from cache)
  for (const item of cachedItems) {
    if (pendingItemIds.has(item.id) && !item._offline_created) {
      mergedMap.set(item.id, item)
    }
  }

  // Add offline-created items
  for (const item of offlineCreatedItems) {
    mergedMap.set(item.id, item)
  }

  const mergedItems = Array.from(mergedMap.values())
  saveCachedItems(mergedItems)
  setLastSyncTime(new Date().toISOString())

  return mergedItems
}

/**
 * Replace an offline ID with a server ID after successful sync
 */
export function replaceOfflineId(offlineId: string, serverId: string): void {
  const items = getCachedItems()
  const index = items.findIndex(item => item.id === offlineId)

  if (index !== -1) {
    const item = items[index]
    if (item) {
      items[index] = {
        ...item,
        id: serverId,
        _offline_created: false,
        _sync_pending: false,
      }
      saveCachedItems(items)
    }
  }

  // Also update mutations that reference this ID
  const mutations = getPendingMutations()
  const updatedMutations = mutations.map(m => {
    if (m.itemId === offlineId) {
      return { ...m, itemId: serverId }
    }
    return m
  })
  localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(updatedMutations))
}

/**
 * Clear all shopping cache data
 */
export function clearShoppingCache(): void {
  if (!isLocalStorageAvailable()) return
  localStorage.removeItem(STORAGE_KEYS.ITEMS)
  localStorage.removeItem(STORAGE_KEYS.LIST)
  localStorage.removeItem(STORAGE_KEYS.MUTATIONS)
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC)
}

/**
 * Get cache stats
 */
export function getShoppingCacheStats(): {
  itemCount: number
  pendingMutations: number
  lastSync: string | null
  hasOfflineItems: boolean
} {
  const items = getCachedItems()
  const mutations = getPendingMutations()

  return {
    itemCount: items.length,
    pendingMutations: mutations.length,
    lastSync: getLastSyncTime(),
    hasOfflineItems: items.some(item => item._offline_created),
  }
}
