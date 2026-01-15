"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
  initAnalytics,
  trackPageView,
  identifyUser,
  setAnalyticsConsent,
  hasAnalyticsConsent,
} from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, BarChart3 } from "lucide-react"

interface AnalyticsProviderProps {
  children: React.ReactNode
  userId?: string
  userEmail?: string
  householdId?: string
}

const CONSENT_ASKED_KEY = "analytics-consent-asked"

export function AnalyticsProvider({
  children,
  userId,
  userEmail,
  householdId,
}: AnalyticsProviderProps) {
  const pathname = usePathname()
  const [showConsentBanner, setShowConsentBanner] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics({
      customEndpoint: "/api/analytics",
      debug: process.env.NODE_ENV === "development",
    })
    setInitialized(true)

    // Check if we need to show consent banner
    const consentAsked = localStorage.getItem(CONSENT_ASKED_KEY)
    if (!consentAsked && !hasAnalyticsConsent()) {
      // Wait a bit before showing the banner
      const timer = setTimeout(() => {
        setShowConsentBanner(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Identify user when userId changes
  useEffect(() => {
    if (!initialized || !userId) return

    identifyUser({
      userId,
      email: userEmail,
      householdId,
    })
  }, [initialized, userId, userEmail, householdId])

  // Track page views on route change
  useEffect(() => {
    if (!initialized) return
    trackPageView(pathname)
  }, [pathname, initialized])

  const handleAcceptAll = useCallback(() => {
    setAnalyticsConsent(true)
    localStorage.setItem(CONSENT_ASKED_KEY, "true")
    setShowConsentBanner(false)
  }, [])

  const handleRejectAll = useCallback(() => {
    setAnalyticsConsent(false)
    localStorage.setItem(CONSENT_ASKED_KEY, "true")
    setShowConsentBanner(false)
  }, [])

  const handleDismiss = useCallback(() => {
    // Dismiss without setting consent - will ask again later
    setShowConsentBanner(false)
  }, [])

  return (
    <>
      {children}
      {showConsentBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Cookies et analyse</CardTitle>
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
              <CardDescription className="text-sm">
                Nous utilisons des cookies pour ameliorer votre experience et analyser
                l&apos;utilisation de l&apos;application de maniere anonyme.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button onClick={handleAcceptAll} className="flex-1" size="sm">
                  Accepter
                </Button>
                <Button variant="outline" onClick={handleRejectAll} size="sm">
                  Refuser
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Aucune donnee personnelle n&apos;est partagee avec des tiers. Voir notre{" "}
                <a href="/privacy" className="underline">
                  politique de confidentialite
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
