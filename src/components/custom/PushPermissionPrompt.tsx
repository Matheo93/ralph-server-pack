"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils/index"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { usePopupCoordinator } from "@/lib/providers/PopupCoordinator"

type PermissionState = "default" | "granted" | "denied" | "unsupported"

interface PushPermissionPromptProps {
  className?: string
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
  showAfterMs?: number
  compact?: boolean
}

const VAPID_PUBLIC_KEY = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"] ?? ""

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

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

async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer,
    })
    return subscription
  } catch {
    return null
  }
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    })
    return response.ok
  } catch {
    return false
  }
}

export function PushPermissionPrompt({
  className,
  onPermissionGranted,
  onPermissionDenied,
  showAfterMs = 5000,
  compact = false,
}: PushPermissionPromptProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>("default")
  const [isLoading, setIsLoading] = useState(false)
  const haptic = useHapticFeedback()

  // Use popup coordinator for visibility - ALWAYS use coordinator, no fallback
  const popupCoordinator = usePopupCoordinator()
  const isVisible = popupCoordinator.isPopupAllowed("push-notification")

  // Check initial permission state
  useEffect(() => {
    if (typeof window === "undefined") return

    // Check if notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermissionState("unsupported")
      return
    }

    // Check current permission
    const permission = Notification.permission
    setPermissionState(permission as PermissionState)

    // Request to show popup after short delay if permission not set
    // Coordinator handles the 90s initial delay and 45s between popups
    // We just register our intent quickly - coordinator handles all timing
    if (permission === "default") {
      const timer = setTimeout(() => {
        popupCoordinator.requestPopup("push-notification")
      }, 3000) // 3 seconds - just register intent, coordinator handles actual display timing
      return () => clearTimeout(timer)
    }
  }, [showAfterMs, popupCoordinator])

  const handleRequestPermission = useCallback(async () => {
    setIsLoading(true)
    haptic.mediumTap()

    try {
      const permission = await Notification.requestPermission()
      setPermissionState(permission as PermissionState)

      if (permission === "granted") {
        // Register service worker and subscribe
        const registration = await navigator.serviceWorker.ready
        const subscription = await subscribeToPush(registration)

        if (subscription) {
          await sendSubscriptionToServer(subscription)
        }

        haptic.success()
        onPermissionGranted?.()
        popupCoordinator.dismissPopup("push-notification")
      } else {
        haptic.error()
        onPermissionDenied?.()
      }
    } catch {
      setPermissionState("denied")
      haptic.error()
      onPermissionDenied?.()
    } finally {
      setIsLoading(false)
    }
  }, [haptic, onPermissionGranted, onPermissionDenied])

  const handleDismiss = useCallback(() => {
    popupCoordinator.dismissPopup("push-notification")
    haptic.lightTap()
  }, [haptic, popupCoordinator])

  // Don't render if already granted, denied, unsupported, or not visible
  if (
    permissionState === "granted" ||
    permissionState === "denied" ||
    permissionState === "unsupported" ||
    !isVisible
  ) {
    return null
  }

  if (compact) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            "fixed bottom-24 left-4 right-4 z-50 lg:left-auto lg:right-6 lg:w-80",
            className
          )}
        >
          <div className="bg-gradient-to-r from-sky-600 to-teal-600 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <BellIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Activer les notifications
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  Rappels de tâches et streak
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded"
              >
                <XIcon className="w-4 h-4 text-white/70" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                Plus tard
              </Button>
              <Button
                size="sm"
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="flex-1 bg-white hover:bg-white/90 text-sky-600"
              >
                {isLoading ? "..." : "Activer"}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className={cn("w-full max-w-md", className)}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mb-4">
                <BellIcon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Restez informé !</CardTitle>
              <CardDescription className="text-base">
                Recevez des rappels pour ne jamais oublier vos tâches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-lg">🔥</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Rappels de streak</p>
                    <p className="text-xs text-muted-foreground">
                      Ne perdez pas votre série
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">📋</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Rappels de tâches</p>
                    <p className="text-xs text-muted-foreground">
                      Avant chaque deadline
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-lg">🎉</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Encouragements</p>
                    <p className="text-xs text-muted-foreground">
                      Bravo quand vous progressez
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex-1"
                >
                  Plus tard
                </Button>
                <Button
                  onClick={handleRequestPermission}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activation...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4" />
                      Activer
                    </span>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Vous pourrez désactiver les notifications à tout moment dans les paramètres
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook to check push notification status
export function usePushNotificationStatus() {
  const [status, setStatus] = useState<{
    supported: boolean
    permission: PermissionState
    subscribed: boolean
  }>({
    supported: false,
    permission: "default",
    subscribed: false,
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const checkStatus = async () => {
      const supported = "Notification" in window && "serviceWorker" in navigator

      if (!supported) {
        setStatus({ supported: false, permission: "unsupported", subscribed: false })
        return
      }

      const permission = Notification.permission as PermissionState

      let subscribed = false
      if (permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          subscribed = subscription !== null
        } catch {
          subscribed = false
        }
      }

      setStatus({ supported, permission, subscribed })
    }

    checkStatus()
  }, [])

  return status
}

// Function to manually trigger permission request
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await subscribeToPush(registration)
    if (!subscription) return false

    return await sendSubscriptionToServer(subscription)
  } catch {
    return false
  }
}

// Function to unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!("serviceWorker" in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true

    await subscription.unsubscribe()

    // Notify server
    await fetch("/api/notifications/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })

    return true
  } catch {
    return false
  }
}
