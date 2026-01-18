"use client"

/**
 * UpdatePrompt - Service worker update notification and graceful reload
 * Handles SW updates, cache invalidation, and user-friendly update flow
 */

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { X, RefreshCw, Download, Bell, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ============================================================================
// Types
// ============================================================================

interface UpdatePromptProps {
  className?: string
  autoHideDuration?: number
  position?: "top" | "bottom"
}

interface ServiceWorkerState {
  isUpdateAvailable: boolean
  isInstalling: boolean
  isControlled: boolean
  registration: ServiceWorkerRegistration | null
}

// ============================================================================
// Hook: useServiceWorker
// ============================================================================

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    isInstalling: false,
    isControlled: false,
    registration: null,
  })

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const handleControllerChange = () => {
      setState((prev) => ({ ...prev, isControlled: true }))
    }

    const handleStateChange = (worker: ServiceWorker) => {
      if (worker.state === "installed") {
        setState((prev) => ({ ...prev, isUpdateAvailable: true }))
      }
      if (worker.state === "activating") {
        setState((prev) => ({ ...prev, isInstalling: true }))
      }
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })

        setState((prev) => ({
          ...prev,
          registration,
          isControlled: !!navigator.serviceWorker.controller,
        }))

        // Check for waiting worker (update available)
        if (registration.waiting) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }))
        }

        // Listen for new updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              handleStateChange(newWorker)
            })
          }
        })
      } catch (error) {
        console.error("Service worker registration failed:", error)
      }
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)
    registerSW()

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
    }
  }, [])

  const skipWaiting = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" })
    }
  }, [state.registration])

  const checkForUpdates = useCallback(async () => {
    if (state.registration) {
      await state.registration.update()
    }
  }, [state.registration])

  const clearCaches = useCallback(async () => {
    if (typeof window === "undefined") return

    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
  }, [])

  return {
    ...state,
    skipWaiting,
    checkForUpdates,
    clearCaches,
    reload: () => window.location.reload(),
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function UpdatePrompt({
  className,
  autoHideDuration,
  position = "bottom",
}: UpdatePromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const { isUpdateAvailable, isInstalling, skipWaiting, reload, clearCaches } = useServiceWorker()

  // Show prompt when update is available
  useEffect(() => {
    if (isUpdateAvailable && !isDismissed) {
      setIsVisible(true)
    }
  }, [isUpdateAvailable, isDismissed])

  // Auto-hide if configured
  useEffect(() => {
    if (!autoHideDuration || !isVisible) return

    const timer = setTimeout(() => {
      setIsVisible(false)
    }, autoHideDuration)

    return () => clearTimeout(timer)
  }, [autoHideDuration, isVisible])

  const handleUpdate = useCallback(async () => {
    await clearCaches()
    skipWaiting()
    // Give the new SW time to activate
    setTimeout(reload, 100)
  }, [clearCaches, skipWaiting, reload])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setIsDismissed(true)
  }, [])

  const positionClasses = {
    top: "top-4 left-4 right-4",
    bottom: "bottom-4 left-4 right-4",
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed z-50 mx-auto max-w-md",
            positionClasses[position],
            className
          )}
        >
          <div className="bg-card border rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">
                  Mise à jour disponible
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Une nouvelle version de FamilyLoad est prête. Rechargez pour profiter des améliorations.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={isInstalling}
                    className="gap-2"
                  >
                    {isInstalling ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Installation...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Mettre à jour
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Install Prompt Component
// ============================================================================

interface InstallPromptProps {
  className?: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setIsVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (isInstalled || !isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed bottom-4 left-4 right-4 mx-auto max-w-md z-50",
        className
      )}
    >
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Image
              src="/icons/icon-72.png"
              alt="FamilyLoad"
              width={48}
              height={48}
              className="rounded-xl"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              Installer FamilyLoad
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez l&apos;application à votre écran d&apos;accueil pour un accès rapide.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall}>
                Installer
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Non merci
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Notification Permission Prompt
// ============================================================================

interface NotificationPromptProps {
  onGranted?: () => void
  onDenied?: () => void
  className?: string
}

export function NotificationPrompt({
  onGranted,
  onDenied,
  className,
}: NotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (!("Notification" in window)) return

    setPermission(Notification.permission)

    // Show prompt if permission not yet requested
    if (Notification.permission === "default") {
      // Delay to not overwhelm user immediately
      const timer = setTimeout(() => setIsVisible(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAllow = async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
    setIsVisible(false)

    if (result === "granted") {
      onGranted?.()
    } else {
      onDenied?.()
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDenied?.()
  }

  if (!isVisible || permission !== "default") return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed bottom-4 left-4 right-4 mx-auto max-w-md z-50",
        className
      )}
    >
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              Activer les notifications
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recevez des rappels pour vos tâches et les mises à jour de votre famille.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow}>
                Autoriser
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                <BellOff className="w-4 h-4 mr-1" />
                Pas maintenant
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
