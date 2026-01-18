"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X, Smartphone } from "lucide-react"
import { usePopupCoordinator } from "@/lib/providers/PopupCoordinator"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

// Register service worker
function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return
  }

  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
    console.error("Service worker registration failed:", error)
  })
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  // Use popup coordinator for visibility - ALWAYS use coordinator, no fallback
  const popupCoordinator = usePopupCoordinator()

  const showPrompt = popupCoordinator.isPopupAllowed("pwa-install")
  const showIOSInstructions = popupCoordinator.isPopupAllowed("pwa-install")

  useEffect(() => {
    // Register service worker
    registerServiceWorker()

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Check if running on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // PWA install is second priority - register after notifications
      // Request after page load, coordinator handles sequencing (30min initial + 60min between)
      setTimeout(() => {
        popupCoordinator.requestPopup("pwa-install")
      }, 60000) // 1 minute after page load - coordinator enforces sequencing
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      popupCoordinator.dismissPopup("pwa-install")
      setDeferredPrompt(null)
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    // Show iOS instructions after a delay if on iOS
    // Request after page load, coordinator handles sequencing (30min initial + 60min between)
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        popupCoordinator.requestPopup("pwa-install")
      }, 60000) // 1 minute after page load - coordinator enforces sequencing
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [popupCoordinator])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        popupCoordinator.dismissPopup("pwa-install")
      }
    } catch {
      // User cancelled or error occurred
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = useCallback(() => {
    popupCoordinator.dismissPopup("pwa-install")
  }, [popupCoordinator])

  // Don't show if already installed
  if (isInstalled) return null

  // iOS instructions
  if (isIOS && showIOSInstructions) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Installer FamilyLoad</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Installez l&apos;app pour un acces rapide
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block w-4 h-4 align-middle">&#x2934;</span></p>
              <p>2. Faites defiler et appuyez sur <strong>&quot;Sur l&apos;ecran d&apos;accueil&quot;</strong></p>
              <p>3. Appuyez sur <strong>Ajouter</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Standard install prompt (Android/Desktop)
  if (!showPrompt || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Installer FamilyLoad</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Installez l&apos;app pour un acces rapide depuis votre ecran d&apos;accueil
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Installer
            </Button>
            <Button variant="outline" onClick={handleDismiss} size="sm">
              Plus tard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
