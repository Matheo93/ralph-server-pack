/**
 * Real-time Updates Hook
 *
 * Provides real-time synchronization of household data
 * using Server-Sent Events (SSE).
 */

"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useRouter } from "next/navigation"

// =============================================================================
// TYPES
// =============================================================================

export type RealtimeEventType =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted"
  | "notification_new"
  | "notification_read"
  | "balance_updated"
  | "streak_updated"
  | "child_updated"
  | "member_joined"
  | "member_left"
  | "household_updated"
  | "ping"

export interface RealtimeEvent {
  id: string
  type: RealtimeEventType
  householdId: string
  userId?: string
  data: Record<string, unknown>
  timestamp: string
}

export interface RealtimeOptions {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number
  /** Event handlers for specific event types */
  onEvent?: (event: RealtimeEvent) => void
  onTaskEvent?: (event: RealtimeEvent) => void
  onNotificationEvent?: (event: RealtimeEvent) => void
  onBalanceEvent?: (event: RealtimeEvent) => void
  onStreakEvent?: (event: RealtimeEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

export interface RealtimeState {
  isConnected: boolean
  isConnecting: boolean
  reconnectAttempts: number
  lastEventAt: Date | null
  error: Error | null
}

// =============================================================================
// HOOK
// =============================================================================

export function useRealtimeUpdates(options: RealtimeOptions = {}) {
  const {
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
    onEvent,
    onTaskEvent,
    onNotificationEvent,
    onBalanceEvent,
    onStreakEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options

  const router = useRouter()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastEventAt: null,
    error: null,
  })

  // Handle incoming events
  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      setState((prev) => ({
        ...prev,
        lastEventAt: new Date(),
      }))

      // Call generic handler
      onEvent?.(event)

      // Call specific handlers
      switch (event.type) {
        case "task_created":
        case "task_updated":
        case "task_completed":
        case "task_deleted":
          onTaskEvent?.(event)
          break
        case "notification_new":
        case "notification_read":
          onNotificationEvent?.(event)
          break
        case "balance_updated":
          onBalanceEvent?.(event)
          break
        case "streak_updated":
          onStreakEvent?.(event)
          break
      }
    },
    [onEvent, onTaskEvent, onNotificationEvent, onBalanceEvent, onStreakEvent]
  )

  // Connect to SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }))

    try {
      const eventSource = new EventSource("/api/realtime/subscribe")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnectAttempts: 0,
          error: null,
        }))
        onConnect?.()
      }

      eventSource.onerror = () => {
        const error = new Error("SSE connection error")
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error,
        }))

        eventSource.close()
        eventSourceRef.current = null
        onDisconnect?.()
        onError?.(error)

        // Auto reconnect
        if (autoReconnect && state.reconnectAttempts < maxReconnectAttempts) {
          setState((prev) => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }))

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      }

      // Listen for all event types
      const eventTypes: RealtimeEventType[] = [
        "task_created",
        "task_updated",
        "task_completed",
        "task_deleted",
        "notification_new",
        "notification_read",
        "balance_updated",
        "streak_updated",
        "child_updated",
        "member_joined",
        "member_left",
        "household_updated",
        "ping",
      ]

      for (const eventType of eventTypes) {
        eventSource.addEventListener(eventType, (e) => {
          try {
            const data = JSON.parse(e.data) as RealtimeEvent
            handleEvent(data)
          } catch {
            // Ignore parse errors
          }
        })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Connection failed")
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err,
      }))
      onError?.(err)
    }
  }, [
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    state.reconnectAttempts,
    handleEvent,
    onConnect,
    onDisconnect,
    onError,
  ])

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }))

    onDisconnect?.()
  }, [onDisconnect])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh router on task events for server components
  const refreshOnTaskChange = useCallback(() => {
    router.refresh()
  }, [router])

  return {
    ...state,
    connect,
    disconnect,
    refreshOnTaskChange,
  }
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook for auto-refreshing on task changes
 */
export function useRealtimeTaskRefresh() {
  const router = useRouter()
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useRealtimeUpdates({
    onTaskEvent: (event) => {
      setLastUpdate(new Date())
      // Refresh the page data
      router.refresh()
    },
  })

  return { lastUpdate }
}

/**
 * Hook for real-time notification count
 */
export function useRealtimeNotifications(
  onNewNotification?: (notification: unknown) => void
) {
  const [unreadCount, setUnreadCount] = useState(0)

  useRealtimeUpdates({
    onNotificationEvent: (event) => {
      if (event.type === "notification_new") {
        setUnreadCount((prev) => prev + 1)
        onNewNotification?.(event.data.notification)
      } else if (event.type === "notification_read") {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    },
  })

  return { unreadCount, setUnreadCount }
}

/**
 * Hook for real-time balance updates
 */
export function useRealtimeBalance(initialBalance?: unknown[]) {
  const [balance, setBalance] = useState<unknown[]>(initialBalance ?? [])

  useRealtimeUpdates({
    onBalanceEvent: (event) => {
      if (event.type === "balance_updated" && Array.isArray(event.data.balance)) {
        setBalance(event.data.balance)
      }
    },
  })

  return { balance, setBalance }
}

/**
 * Hook for real-time streak updates
 */
export function useRealtimeStreak(initialStreak?: {
  current: number
  best: number
}) {
  const [streak, setStreak] = useState(initialStreak ?? { current: 0, best: 0 })

  useRealtimeUpdates({
    onStreakEvent: (event) => {
      if (event.type === "streak_updated" && event.data.streak) {
        const s = event.data.streak as { streak_current?: number; streak_best?: number }
        setStreak({
          current: s.streak_current ?? 0,
          best: s.streak_best ?? 0,
        })
      }
    },
  })

  return { streak, setStreak }
}
