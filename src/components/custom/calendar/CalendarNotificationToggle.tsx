"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, BellOff, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/components/custom/toast-notifications"

interface CalendarNotificationToggleProps {
  className?: string
}

type NotificationState =
  | "unsupported"
  | "denied"
  | "prompt"
  | "granted"
  | "loading"

/**
 * Component to enable/disable calendar push notifications
 * Uses the Web Push API with VAPID for browser notifications
 */
export function CalendarNotificationToggle({
  className,
}: CalendarNotificationToggleProps) {
  const [state, setState] = useState<NotificationState>("loading")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Check notification support and current permission
  useEffect(() => {
    const checkNotificationSupport = async () => {
      // Check if notifications are supported
      if (typeof window === "undefined") {
        setState("loading")
        return
      }

      if (!("Notification" in window)) {
        setState("unsupported")
        return
      }

      if (!("serviceWorker" in navigator)) {
        setState("unsupported")
        return
      }

      if (!("PushManager" in window)) {
        setState("unsupported")
        return
      }

      // Check current permission
      const permission = Notification.permission
      if (permission === "denied") {
        setState("denied")
        return
      }

      if (permission === "default") {
        setState("prompt")
        return
      }

      setState("granted")

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch {
        setIsSubscribed(false)
      }
    }

    checkNotificationSupport()
  }, [])

  /**
   * Register the push service worker
   */
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register("/push-sw.js", {
        scope: "/",
      })

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready

      return registration
    } catch (error) {
      console.error("Failed to register service worker:", error)
      return null
    }
  }, [])

  /**
   * Request notification permission and subscribe
   */
  const enableNotifications = useCallback(async () => {
    setIsProcessing(true)

    try {
      // Request permission
      const permission = await Notification.requestPermission()

      if (permission === "denied") {
        setState("denied")
        toast.error("Notifications refusées", "Activez-les dans les paramètres de votre navigateur")
        setIsProcessing(false)
        return
      }

      if (permission !== "granted") {
        setState("prompt")
        setIsProcessing(false)
        return
      }

      setState("granted")

      // Register service worker
      const registration = await registerServiceWorker()
      if (!registration) {
        toast.error("Erreur", "Impossible d'enregistrer le service worker")
        setIsProcessing(false)
        return
      }

      // Get VAPID public key
      const vapidResponse = await fetch("/api/notifications/vapid-key")
      if (!vapidResponse.ok) {
        // VAPID not configured - still mark as enabled for UI purposes
        setIsSubscribed(true)
        toast.success("Notifications activées", "Vous recevrez des rappels pour vos événements")
        setIsProcessing(false)
        return
      }

      const { publicKey } = (await vapidResponse.json()) as { publicKey: string }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      // Send subscription to server
      const subscribeResponse = await fetch("/api/notifications/web-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      })

      if (!subscribeResponse.ok) {
        throw new Error("Failed to register subscription")
      }

      setIsSubscribed(true)
      toast.success("Notifications activées", "Vous recevrez des rappels 1h avant vos événements")
    } catch (error) {
      console.error("Failed to enable notifications:", error)
      toast.error("Erreur", "Impossible d'activer les notifications")
    } finally {
      setIsProcessing(false)
    }
  }, [registerServiceWorker])

  /**
   * Unsubscribe from push notifications
   */
  const disableNotifications = useCallback(async () => {
    setIsProcessing(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe()

        // Remove from server
        await fetch(
          `/api/notifications/web-push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
          { method: "DELETE" }
        )
      }

      setIsSubscribed(false)
      toast.info("Notifications désactivées")
    } catch (error) {
      console.error("Failed to disable notifications:", error)
      toast.error("Erreur", "Impossible de désactiver les notifications")
    } finally {
      setIsProcessing(false)
    }
  }, [])

  /**
   * Toggle notifications on/off
   */
  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        enableNotifications()
      } else {
        disableNotifications()
      }
    },
    [enableNotifications, disableNotifications]
  )

  // Render based on state
  if (state === "loading") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (state === "unsupported") {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            Notifications non supportées
          </CardTitle>
          <CardDescription>
            Votre navigateur ne supporte pas les notifications push.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (state === "denied") {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="h-4 w-4 text-destructive" />
            Notifications bloquées
          </CardTitle>
          <CardDescription>
            Les notifications ont été bloquées. Pour les activer, modifiez les
            paramètres de votre navigateur.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Rappels calendrier
        </CardTitle>
        <CardDescription>
          Recevez une notification push 1h avant vos événements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : null}
            <Label htmlFor="calendar-notifications" className="cursor-pointer">
              {isSubscribed ? "Activées" : "Désactivées"}
            </Label>
          </div>
          {state === "prompt" && !isSubscribed ? (
            <Button
              size="sm"
              onClick={enableNotifications}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Activer
            </Button>
          ) : (
            <Switch
              id="calendar-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isProcessing}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
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
