"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WifiOff, Wifi, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fadeInDown } from "@/lib/animations"
import { cn } from "@/lib/utils/index"

interface OfflineIndicatorProps {
  className?: string
  showOnlineStatus?: boolean
}

/**
 * OfflineIndicator - Shows a banner when the user is offline
 * Also optionally shows when coming back online
 */
export function OfflineIndicator({
  className,
  showOnlineStatus = false,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [showOnlineMessage, setShowOnlineMessage] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline && showOnlineStatus) {
        setShowOnlineMessage(true)
        // Auto-hide after 3 seconds
        setTimeout(() => setShowOnlineMessage(false), 3000)
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [wasOffline, showOnlineStatus])

  const handleRetry = useCallback(async () => {
    setIsSyncing(true)
    try {
      // Try to ping the server
      await fetch("/api/health", { method: "HEAD", cache: "no-store" })
      // If successful, trigger a refresh
      window.location.reload()
    } catch {
      // Still offline
      setIsSyncing(false)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2",
            className
          )}
          variants={fadeInDown}
          initial="initial"
          animate="animate"
          exit="exit"
          role="alert"
          aria-live="assertive"
        >
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">
                Vous etes hors ligne. Certaines fonctionnalites peuvent etre limitees.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              disabled={isSyncing}
              className="shrink-0 text-white hover:text-white hover:bg-amber-600"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="ml-2 hidden sm:inline">Reessayer</span>
            </Button>
          </div>
        </motion.div>
      )}

      {showOnlineMessage && (
        <motion.div
          key="online-banner"
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white px-4 py-2",
            className
          )}
          variants={fadeInDown}
          initial="initial"
          animate="animate"
          exit="exit"
          role="status"
          aria-live="polite"
        >
          <div className="container mx-auto flex items-center gap-2">
            <Wifi className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">
              Connexion retablie
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to check online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Offline-aware wrapper that shows content or fallback
 */
interface OfflineAwareProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function OfflineAware({ children, fallback }: OfflineAwareProps) {
  const isOnline = useOnlineStatus()

  if (!isOnline && fallback) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
