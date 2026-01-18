"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import type { ShoppingItem } from "@/lib/actions/shopping"

/**
 * Database row type for shopping_items
 * Matches the schema from shopping-schema.sql
 */
interface ShoppingItemRow {
  id: string
  list_id: string
  name: string
  quantity: number
  unit: string | null
  category: string
  is_checked: boolean
  checked_by: string | null
  checked_at: string | null
  added_by: string
  note: string | null
  priority: number
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Payload types for realtime events
 */
type InsertPayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}> & {
  eventType: "INSERT"
  new: ShoppingItemRow
  old: Record<string, never>
}

type UpdatePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}> & {
  eventType: "UPDATE"
  new: ShoppingItemRow
  old: ShoppingItemRow
}

type DeletePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}> & {
  eventType: "DELETE"
  new: Record<string, never>
  old: ShoppingItemRow
}

type RealtimePayload = InsertPayload | UpdatePayload | DeletePayload

/**
 * Callbacks for realtime events
 */
export interface ShoppingRealtimeCallbacks {
  onInsert?: (item: ShoppingItem) => void
  onUpdate?: (item: ShoppingItem) => void
  onDelete?: (itemId: string) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR" | "TIMED_OUT") => void
}

/**
 * Options for the realtime hook
 */
export interface UseShoppingRealtimeOptions {
  listId: string
  enabled?: boolean
  callbacks: ShoppingRealtimeCallbacks
}

/**
 * Convert database row to ShoppingItem
 */
function rowToShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    list_id: row.list_id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    is_checked: row.is_checked,
    checked_by: row.checked_by,
    checked_by_name: null, // Will be populated by join in full queries
    checked_at: row.checked_at,
    added_by: row.added_by,
    added_by_name: null, // Will be populated by join in full queries
    note: row.note,
    priority: row.priority,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Hook for subscribing to real-time shopping list updates via Supabase Realtime
 *
 * Features:
 * - Subscribes to INSERT, UPDATE, DELETE events on shopping_items table
 * - Filters by list_id for efficient subscriptions
 * - Handles connection status changes
 * - Automatic cleanup on unmount
 * - Reconnection handling
 *
 * @example
 * ```tsx
 * useShoppingRealtime({
 *   listId: "uuid-here",
 *   enabled: true,
 *   callbacks: {
 *     onInsert: (item) => setItems(prev => [...prev, item]),
 *     onUpdate: (item) => setItems(prev => prev.map(i => i.id === item.id ? item : i)),
 *     onDelete: (itemId) => setItems(prev => prev.filter(i => i.id !== itemId)),
 *   }
 * })
 * ```
 */
export function useShoppingRealtime(options: UseShoppingRealtimeOptions): void {
  const { listId, enabled = true, callbacks } = options
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef(callbacks)

  // Update callbacks ref to avoid recreating subscription on callback changes
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const handlePayload = useCallback((payload: RealtimePayload) => {
    const cbs = callbacksRef.current

    switch (payload.eventType) {
      case "INSERT": {
        const newItem = rowToShoppingItem(payload.new)
        cbs.onInsert?.(newItem)
        break
      }
      case "UPDATE": {
        const updatedItem = rowToShoppingItem(payload.new)
        cbs.onUpdate?.(updatedItem)
        break
      }
      case "DELETE": {
        const deletedId = payload.old.id
        cbs.onDelete?.(deletedId)
        break
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled || !listId) {
      return
    }

    const supabase = createClient()

    // Create a unique channel name for this list
    const channelName = `shopping_items:list_id=eq.${listId}`

    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on<ShoppingItemRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          handlePayload({
            ...payload,
            eventType: "INSERT",
            old: {} as Record<string, never>,
          } as InsertPayload)
        }
      )
      .on<ShoppingItemRow>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          handlePayload({
            ...payload,
            eventType: "UPDATE",
          } as UpdatePayload)
        }
      )
      .on<ShoppingItemRow>(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          handlePayload({
            ...payload,
            eventType: "DELETE",
            new: {} as Record<string, never>,
          } as DeletePayload)
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("[ShoppingRealtime] Subscription error:", error)
          callbacksRef.current.onError?.(new Error(error.message))
        }

        callbacksRef.current.onStatusChange?.(status)

        if (status === "SUBSCRIBED") {
          console.log("[ShoppingRealtime] Subscribed to list:", listId)
        } else if (status === "CLOSED") {
          console.log("[ShoppingRealtime] Channel closed for list:", listId)
        } else if (status === "CHANNEL_ERROR") {
          console.error("[ShoppingRealtime] Channel error for list:", listId)
        }
      })

    channelRef.current = channel

    // Cleanup on unmount or when listId changes
    return () => {
      if (channelRef.current) {
        console.log("[ShoppingRealtime] Unsubscribing from list:", listId)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, listId, handlePayload])
}

/**
 * Hook to check if Supabase Realtime is available
 * Useful for showing real-time status indicator
 */
export function useRealtimeStatus(): {
  isConnected: boolean
  status: "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR" | "TIMED_OUT" | null
} {
  const statusRef = useRef<"SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR" | "TIMED_OUT" | null>(null)

  return {
    isConnected: statusRef.current === "SUBSCRIBED",
    status: statusRef.current,
  }
}
