"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getCachedItems,
  getCachedList,
  saveCachedItems,
  saveCachedList,
  addCachedItem,
  checkCachedItem,
  deleteCachedItem,
  clearCheckedCachedItems,
  uncheckAllCachedItems,
  reorderCachedItems,
  getPendingMutations,
  removeMutation,
  incrementMutationRetry,
  mergeWithServerItems,
  replaceOfflineId,
  getShoppingCacheStats,
  type CachedShoppingItem,
  type CachedShoppingList,
  type ShoppingMutation,
} from "@/lib/offline/shopping-cache"
import {
  quickAddShoppingItem,
  checkShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  uncheckAllItems,
  reorderShoppingItems,
  type ShoppingItem,
  type ShoppingList,
} from "@/lib/actions/shopping"

/**
 * Hook for offline-first shopping list management
 *
 * Features:
 * - Local-first reads (instant from localStorage)
 * - Optimistic updates for immediate UI feedback
 * - Background sync with server when online
 * - Auto-sync when coming back online
 * - Pending changes indicator
 */

export interface UseOfflineShoppingOptions {
  /** Initial list from server */
  initialList: ShoppingList
  /** Initial items from server */
  initialItems: ShoppingItem[]
  /** Current user ID for tracking who checked items */
  userId?: string
  /** Current user name for display */
  userName?: string
  /** Auto-sync interval in ms (0 = disabled) */
  autoSyncInterval?: number
}

export interface UseOfflineShoppingResult {
  /** Shopping list metadata */
  list: CachedShoppingList
  /** Shopping items (local-first) */
  items: CachedShoppingItem[]
  /** Online status */
  isOnline: boolean
  /** Currently syncing */
  isSyncing: boolean
  /** Has pending changes to sync */
  hasPendingChanges: boolean
  /** Last sync timestamp */
  lastSync: string | null
  /** Quick add an item */
  quickAdd: (name: string) => Promise<void>
  /** Toggle item checked state */
  toggleCheck: (itemId: string) => Promise<void>
  /** Delete an item */
  deleteItem: (itemId: string) => Promise<void>
  /** Clear all checked items */
  clearChecked: () => Promise<void>
  /** Uncheck all items */
  uncheckAll: () => Promise<void>
  /** Reorder items (drag & drop) */
  reorderItems: (itemIds: string[]) => Promise<void>
  /** Manually trigger sync */
  sync: () => Promise<void>
  /** Force refresh from server */
  refresh: (serverItems: ShoppingItem[]) => void
}

export function useOfflineShopping(options: UseOfflineShoppingOptions): UseOfflineShoppingResult {
  const {
    initialList,
    initialItems,
    userId,
    userName,
    autoSyncInterval = 30000, // 30 seconds
  } = options

  // Convert to cached format
  const toCachedList = useCallback((list: ShoppingList): CachedShoppingList => ({
    id: list.id,
    household_id: list.household_id,
    name: list.name,
    is_active: list.is_active,
    created_by: list.created_by,
    created_at: list.created_at,
    updated_at: list.updated_at,
    item_count: list.item_count,
    checked_count: list.checked_count,
  }), [])

  const toCachedItem = useCallback((item: ShoppingItem): CachedShoppingItem => ({
    id: item.id,
    list_id: item.list_id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    is_checked: item.is_checked,
    checked_by: item.checked_by,
    checked_by_name: item.checked_by_name,
    checked_at: item.checked_at,
    added_by: item.added_by,
    added_by_name: item.added_by_name,
    note: item.note,
    priority: item.priority,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }), [])

  // State
  const [list, setList] = useState<CachedShoppingList>(() => {
    // Try to get from cache first, fall back to initial
    const cached = getCachedList()
    if (cached && cached.id === initialList.id) {
      return cached
    }
    const newList = toCachedList(initialList)
    saveCachedList(newList)
    return newList
  })

  const [items, setItems] = useState<CachedShoppingItem[]>(() => {
    // Try to get from cache first
    const cached = getCachedItems()
    if (cached.length > 0 && cached[0]?.list_id === initialList.id) {
      // Merge with server items
      return mergeWithServerItems(initialItems.map(toCachedItem))
    }
    // Use server items
    const serverItems = initialItems.map(toCachedItem)
    saveCachedItems(serverItems)
    return serverItems
  })

  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(() => {
    const stats = getShoppingCacheStats()
    return stats.pendingMutations > 0
  })
  const [lastSync, setLastSync] = useState<string | null>(() => {
    const stats = getShoppingCacheStats()
    return stats.lastSync
  })

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

  // Process pending mutations
  const processMutations = useCallback(async (): Promise<void> => {
    const mutations = getPendingMutations()
    if (mutations.length === 0) return

    setIsSyncing(true)

    for (const mutation of mutations) {
      try {
        await processSingleMutation(mutation)
        removeMutation(mutation.id)
      } catch (error) {
        console.error("[OfflineShopping] Mutation failed:", error)
        const shouldRetry = incrementMutationRetry(mutation.id)
        if (!shouldRetry) {
          console.warn("[OfflineShopping] Max retries exceeded, removing mutation:", mutation.id)
        }
      }
    }

    // Update state
    const stats = getShoppingCacheStats()
    setHasPendingChanges(stats.pendingMutations > 0)
    setLastSync(new Date().toISOString())
    setIsSyncing(false)
  }, [])

  // Process a single mutation
  const processSingleMutation = async (mutation: ShoppingMutation): Promise<void> => {
    switch (mutation.type) {
      case "add": {
        if (mutation.data && mutation.itemId) {
          const result = await quickAddShoppingItem({
            list_id: mutation.listId,
            name: mutation.data['name'] as string,
          })
          if (result.success && result.data?.itemId) {
            // Replace offline ID with server ID
            replaceOfflineId(mutation.itemId, result.data.itemId)
            // Update local state
            setItems(prev => prev.map(item =>
              item.id === mutation.itemId
                ? { ...item, id: result.data!.itemId, _offline_created: false, _sync_pending: false }
                : item
            ))
          }
        }
        break
      }
      case "check":
        if (mutation.itemId) {
          await checkShoppingItem({ id: mutation.itemId, is_checked: true })
        }
        break
      case "uncheck":
        if (mutation.itemId) {
          await checkShoppingItem({ id: mutation.itemId, is_checked: false })
        }
        break
      case "delete":
        if (mutation.itemId) {
          await deleteShoppingItem(mutation.itemId)
        }
        break
      case "clear_checked":
        await clearCheckedItems(mutation.listId)
        break
      case "uncheck_all":
        await uncheckAllItems(mutation.listId)
        break
      case "reorder":
        if (mutation.data && Array.isArray(mutation.data['item_ids'])) {
          await reorderShoppingItems({
            list_id: mutation.listId,
            item_ids: mutation.data['item_ids'] as string[],
          })
        }
        break
    }
  }

  // Sync with server
  const sync = useCallback(async (): Promise<void> => {
    if (!isOnline) return
    await processMutations()
  }, [isOnline, processMutations])

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && hasPendingChanges) {
      sync()
    }
  }, [isOnline, hasPendingChanges, sync])

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncInterval <= 0 || !isOnline) return

    const scheduleSync = () => {
      syncTimeoutRef.current = setTimeout(async () => {
        if (hasPendingChanges && isMountedRef.current) {
          await sync()
        }
        if (isMountedRef.current) {
          scheduleSync()
        }
      }, autoSyncInterval)
    }

    scheduleSync()

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [autoSyncInterval, isOnline, hasPendingChanges, sync])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Quick add item
  const quickAdd = useCallback(async (name: string): Promise<void> => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    // Optimistic update
    const newItem = addCachedItem({
      list_id: list.id,
      name: trimmedName,
      quantity: 1,
      unit: null,
      category: "Autres",
      is_checked: false,
      checked_by: null,
      checked_by_name: null,
      checked_at: null,
      added_by: userId ?? "",
      added_by_name: userName ?? null,
      note: null,
      priority: 0,
    })

    setItems(prev => [...prev, newItem])
    setHasPendingChanges(true)

    // Sync immediately if online
    if (isOnline) {
      try {
        const result = await quickAddShoppingItem({
          list_id: list.id,
          name: trimmedName,
        })
        if (result.success && result.data?.itemId) {
          // Update with server ID
          replaceOfflineId(newItem.id, result.data.itemId)
          setItems(prev => prev.map(item =>
            item.id === newItem.id
              ? { ...item, id: result.data!.itemId, _offline_created: false, _sync_pending: false }
              : item
          ))
          removeMutation(getPendingMutations().find(m => m.itemId === newItem.id)?.id ?? "")
          setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
        }
      } catch (error) {
        console.error("[OfflineShopping] Quick add sync failed:", error)
        // Item already added locally, will sync later
      }
    }
  }, [list.id, userId, userName, isOnline])

  // Toggle check
  const toggleCheck = useCallback(async (itemId: string): Promise<void> => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newChecked = !item.is_checked

    // Optimistic update
    const updatedItem = checkCachedItem(itemId, newChecked, userId, userName)
    if (updatedItem) {
      setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i))
      setHasPendingChanges(true)
    }

    // Sync immediately if online and not an offline-created item
    if (isOnline && !item._offline_created) {
      try {
        await checkShoppingItem({ id: itemId, is_checked: newChecked })
        // Remove mutation on success
        const mutation = getPendingMutations().find(m => m.itemId === itemId && (m.type === "check" || m.type === "uncheck"))
        if (mutation) {
          removeMutation(mutation.id)
          setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
        }
      } catch (error) {
        console.error("[OfflineShopping] Toggle check sync failed:", error)
      }
    }
  }, [items, userId, userName, isOnline])

  // Delete item
  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    // Optimistic update
    deleteCachedItem(itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
    setHasPendingChanges(true)

    // Sync immediately if online and not an offline-created item
    if (isOnline && !item._offline_created) {
      try {
        await deleteShoppingItem(itemId)
        const mutation = getPendingMutations().find(m => m.itemId === itemId && m.type === "delete")
        if (mutation) {
          removeMutation(mutation.id)
          setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
        }
      } catch (error) {
        console.error("[OfflineShopping] Delete sync failed:", error)
      }
    }
  }, [items, isOnline])

  // Clear checked
  const clearChecked = useCallback(async (): Promise<void> => {
    // Optimistic update
    clearCheckedCachedItems(list.id)
    setItems(prev => prev.filter(i => !i.is_checked))
    setHasPendingChanges(true)

    // Sync immediately if online
    if (isOnline) {
      try {
        await clearCheckedItems(list.id)
        const mutation = getPendingMutations().find(m => m.type === "clear_checked" && m.listId === list.id)
        if (mutation) {
          removeMutation(mutation.id)
          setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
        }
      } catch (error) {
        console.error("[OfflineShopping] Clear checked sync failed:", error)
      }
    }
  }, [list.id, isOnline])

  // Uncheck all
  const uncheckAll = useCallback(async (): Promise<void> => {
    // Optimistic update
    uncheckAllCachedItems(list.id)
    setItems(prev => prev.map(i => ({
      ...i,
      is_checked: false,
      checked_by: null,
      checked_by_name: null,
      checked_at: null,
    })))
    setHasPendingChanges(true)

    // Sync immediately if online
    if (isOnline) {
      try {
        await uncheckAllItems(list.id)
        const mutation = getPendingMutations().find(m => m.type === "uncheck_all" && m.listId === list.id)
        if (mutation) {
          removeMutation(mutation.id)
          setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
        }
      } catch (error) {
        console.error("[OfflineShopping] Uncheck all sync failed:", error)
      }
    }
  }, [list.id, isOnline])

  // Reorder items (drag & drop)
  const reorderItems = useCallback(async (itemIds: string[]): Promise<void> => {
    // Optimistic update
    const updatedItems = reorderCachedItems(list.id, itemIds)
    setItems(updatedItems)
    setHasPendingChanges(true)

    // Sync immediately if online
    if (isOnline) {
      try {
        await reorderShoppingItems({
          list_id: list.id,
          item_ids: itemIds,
        })
        const mutation = getPendingMutations().find(m => m.type === "reorder" && m.listId === list.id)
        if (mutation) {
          removeMutation(mutation.id)
          setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
        }
      } catch (error) {
        console.error("[OfflineShopping] Reorder sync failed:", error)
      }
    }
  }, [list.id, isOnline])

  // Refresh from server
  const refresh = useCallback((serverItems: ShoppingItem[]): void => {
    const cachedServerItems = serverItems.map(toCachedItem)
    const merged = mergeWithServerItems(cachedServerItems)
    setItems(merged)
    setHasPendingChanges(getShoppingCacheStats().pendingMutations > 0)
    setLastSync(new Date().toISOString())
  }, [toCachedItem])

  return {
    list,
    items,
    isOnline,
    isSyncing,
    hasPendingChanges,
    lastSync,
    quickAdd,
    toggleCheck,
    deleteItem,
    clearChecked,
    uncheckAll,
    reorderItems,
    sync,
    refresh,
  }
}

/**
 * Hook to check if we're offline
 */
export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine)
    updateStatus()

    window.addEventListener("online", updateStatus)
    window.addEventListener("offline", updateStatus)

    return () => {
      window.removeEventListener("online", updateStatus)
      window.removeEventListener("offline", updateStatus)
    }
  }, [])

  return isOffline
}
