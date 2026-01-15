/**
 * Push Subscription - Web Push notification management
 * Permission flow, subscription handling, and token refresh
 */

import { useState, useEffect, useCallback } from "react"

// ============================================================================
// Types
// ============================================================================

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported"

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  expirationTime: number | null
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  renotify?: boolean
  silent?: boolean
  timestamp?: number
}

// ============================================================================
// Constants
// ============================================================================

export const PUSH_SUBSCRIPTION_KEY = "familyload_push_subscription"
export const VAPID_PUBLIC_KEY = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"] ?? ""

// ============================================================================
// Feature Detection
// ============================================================================

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false
  return "serviceWorker" in navigator && "PushManager" in window
}

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false
  return "Notification" in window
}

// ============================================================================
// Permission Management
// ============================================================================

export function getPermissionState(): PushPermissionState {
  if (!isNotificationSupported()) return "unsupported"
  return Notification.permission as PushPermissionState
}

export async function requestPermission(): Promise<PushPermissionState> {
  if (!isNotificationSupported()) return "unsupported"

  try {
    const result = await Notification.requestPermission()
    return result as PushPermissionState
  } catch {
    return "denied"
  }
}

// ============================================================================
// Subscription Management
// ============================================================================

export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) return null

  const permission = await requestPermission()
  if (permission !== "granted") return null

  try {
    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
    }

    return formatSubscription(subscription)
  } catch (error) {
    console.error("Push subscription failed:", error)
    return null
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      localStorage.removeItem(PUSH_SUBSCRIPTION_KEY)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function getSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return null
    return formatSubscription(subscription)
  } catch {
    return null
  }
}

// ============================================================================
// Token Refresh
// ============================================================================

export async function refreshSubscription(): Promise<PushSubscriptionData | null> {
  // Unsubscribe and resubscribe to get a fresh token
  await unsubscribeFromPush()
  return subscribeToPush()
}

export async function shouldRefreshSubscription(
  subscription: PushSubscriptionData
): Promise<boolean> {
  // Check if subscription is about to expire
  if (!subscription.expirationTime) return false

  const now = Date.now()
  const expiresIn = subscription.expirationTime - now
  const oneDay = 24 * 60 * 60 * 1000

  return expiresIn < oneDay
}

// ============================================================================
// Server Communication
// ============================================================================

export async function sendSubscriptionToServer(
  subscription: PushSubscriptionData,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        userId,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function removeSubscriptionFromServer(
  endpoint: string,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        userId,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

// ============================================================================
// Local Notifications
// ============================================================================

export async function showLocalNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (getPermissionState() !== "granted") return false

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? "/icons/icon-192.png",
      badge: payload.badge ?? "/icons/badge-72.png",
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      renotify: payload.renotify,
      silent: payload.silent,
      timestamp: payload.timestamp ?? Date.now(),
    })
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Notification Click Handler
// ============================================================================

export function handleNotificationClick(
  callback: (data: Record<string, unknown>, action?: string) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "notification-click") {
      callback(event.data.data ?? {}, event.data.action)
    }
  }

  navigator.serviceWorker.addEventListener("message", handler)
  return () => navigator.serviceWorker.removeEventListener("message", handler)
}

// ============================================================================
// Helper Functions
// ============================================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function formatSubscription(subscription: PushSubscription): PushSubscriptionData {
  const key = subscription.getKey("p256dh")
  const auth = subscription.getKey("auth")

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
      auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
    },
    expirationTime: subscription.expirationTime,
  }
}

// ============================================================================
// Storage
// ============================================================================

export function saveSubscriptionLocally(subscription: PushSubscriptionData): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription))
  } catch {
    // Storage unavailable
  }
}

export function getLocalSubscription(): PushSubscriptionData | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(PUSH_SUBSCRIPTION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// ============================================================================
// Hook: usePushNotifications
// ============================================================================

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<PushPermissionState>("default")
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize
  useEffect(() => {
    setPermission(getPermissionState())

    const loadSubscription = async () => {
      const sub = await getSubscription()
      setSubscription(sub)
    }

    if (isPushSupported()) {
      loadSubscription()
    }
  }, [])

  // Subscribe handler
  const subscribe = useCallback(async () => {
    if (!isPushSupported()) {
      setError("Push notifications not supported")
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const sub = await subscribeToPush()
      if (!sub) {
        setError("Failed to subscribe to push notifications")
        setIsLoading(false)
        return false
      }

      setSubscription(sub)
      setPermission("granted")
      saveSubscriptionLocally(sub)

      // Send to server if userId provided
      if (userId) {
        await sendSubscriptionToServer(sub, userId)
      }

      setIsLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed")
      setIsLoading(false)
      return false
    }
  }, [userId])

  // Unsubscribe handler
  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const success = await unsubscribeFromPush()
      if (success) {
        // Remove from server if userId provided
        if (userId && subscription) {
          await removeSubscriptionFromServer(subscription.endpoint, userId)
        }
        setSubscription(null)
      }
      setIsLoading(false)
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unsubscribe failed")
      setIsLoading(false)
      return false
    }
  }, [userId, subscription])

  // Request permission only
  const requestNotificationPermission = useCallback(async () => {
    const result = await requestPermission()
    setPermission(result)
    return result
  }, [])

  return {
    permission,
    subscription,
    isLoading,
    error,
    isSupported: isPushSupported(),
    isSubscribed: !!subscription,
    subscribe,
    unsubscribe,
    requestPermission: requestNotificationPermission,
    showNotification: showLocalNotification,
  }
}
