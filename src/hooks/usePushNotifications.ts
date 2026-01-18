"use client"

import { useState, useEffect, useCallback } from "react"

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | "unknown"
  isRegistered: boolean
  error: string | null
}

interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>
  registerToken: () => Promise<boolean>
}

/**
 * Hook for managing push notification permissions and registration
 * Works with Firebase Cloud Messaging via service worker
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "unknown",
    isRegistered: false,
    error: null,
  })

  // Check support and current permission on mount
  useEffect(() => {
    const checkSupport = () => {
      const isSupported =
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window

      const permission: NotificationPermission | "unknown" =
        typeof Notification !== "undefined" ? Notification.permission : "unknown"

      // Check if already registered (token in localStorage)
      const isRegistered = typeof localStorage !== "undefined" &&
        localStorage.getItem("fcm_token_registered") === "true"

      setState((prev) => ({
        ...prev,
        isSupported,
        permission,
        isRegistered,
      }))
    }

    checkSupport()
  }, [])

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Les notifications push ne sont pas supportées sur cet appareil",
      }))
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setState((prev) => ({
        ...prev,
        permission,
        error: permission === "denied"
          ? "Vous avez refusé les notifications. Activez-les dans les paramètres de votre navigateur."
          : null,
      }))

      return permission === "granted"
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Erreur lors de la demande de permission",
      }))
      return false
    }
  }, [state.isSupported])

  /**
   * Register device token with the server
   * This uses the browser's Push API to get a subscription
   */
  const registerToken = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false
    }

    if (Notification.permission !== "granted") {
      const granted = await requestPermission()
      if (!granted) return false
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from server
      const vapidResponse = await fetch("/api/notifications/vapid-key")
      if (!vapidResponse.ok) {
        // VAPID not configured - fall back to basic notification support
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          error: null,
        }))
        localStorage.setItem("fcm_token_registered", "true")
        return true
      }

      const { publicKey } = await vapidResponse.json() as { publicKey: string }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      // Send subscription to server
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          platform: "web",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to register subscription with server")
      }

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        error: null,
      }))
      localStorage.setItem("fcm_token_registered", "true")

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur d'inscription"
      setState((prev) => ({
        ...prev,
        error: message,
      }))
      return false
    }
  }, [state.isSupported, requestPermission])

  return {
    ...state,
    requestPermission,
    registerToken,
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Hook to check if push notifications are available
 * Simpler hook for components that just need to know the status
 */
export function usePushNotificationStatus(): {
  isEnabled: boolean
  canEnable: boolean
} {
  const [status, setStatus] = useState({ isEnabled: false, canEnable: false })

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator

    const isEnabled =
      isSupported && Notification.permission === "granted"

    const canEnable =
      isSupported && Notification.permission !== "denied"

    setStatus({ isEnabled, canEnable })
  }, [])

  return status
}
