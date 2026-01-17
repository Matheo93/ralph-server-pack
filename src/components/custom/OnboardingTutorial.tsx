"use client"

/**
 * OnboardingTutorial - Interactive tutorial for new users
 * Simple custom implementation for React 19 compatibility
 */

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WelcomeAnimation } from "./WelcomeAnimation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const STORAGE_KEY = "familyload_onboarding_completed"
const FIRST_LOGIN_KEY = "familyload_is_first_login"

interface OnboardingTutorialProps {
  userName?: string
  isFirstLogin?: boolean
}

interface TutorialStep {
  title: string
  content: string
  target?: string
}

// Tutorial steps
const tutorialSteps: TutorialStep[] = [
  {
    title: "Tableau de bord",
    content: "Voici votre tableau de bord. Vous y trouverez un apercu de toutes vos taches et de votre charge mentale.",
  },
  {
    title: "Vos enfants",
    content: "Ajoutez vos enfants depuis le menu lateral pour personnaliser les taches selon leur age et leurs activites.",
    target: '[data-tour="nav-children"]',
  },
  {
    title: "Ajouter une tache",
    content: "Creez facilement de nouvelles taches avec le bouton + en bas a droite. Vous pouvez aussi utiliser la commande vocale !",
    target: '[data-tour="fab-button"]',
  },
  {
    title: "Charge mentale",
    content: "Analysez la repartition de la charge mentale entre les parents pour un meilleur equilibre.",
    target: '[data-tour="nav-charge"]',
  },
  {
    title: "Votre serie",
    content: "Maintenez votre serie en completant vos taches chaque jour. Plus la serie est longue, plus vous progressez !",
    target: '[data-tour="header-streak"]',
  },
]

export function OnboardingTutorial({ userName, isFirstLogin }: OnboardingTutorialProps) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [runTutorial, setRunTutorial] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  // Check if this is first login and onboarding hasn't been completed
  useEffect(() => {
    setIsMounted(true)

    const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY)
    const isFirstLoginFlag = localStorage.getItem(FIRST_LOGIN_KEY)

    // Show welcome only if:
    // 1. Onboarding hasn't been completed
    // 2. Either isFirstLogin prop is true OR the flag is set
    if (!hasCompletedOnboarding && (isFirstLogin || isFirstLoginFlag === "true")) {
      setShowWelcome(true)
      // Clear the flag after showing
      localStorage.removeItem(FIRST_LOGIN_KEY)
    }
  }, [isFirstLogin])

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false)
    setRunTutorial(true)
  }, [])

  const handleWelcomeSkip = useCallback(() => {
    setShowWelcome(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }, [])

  const handleNext = useCallback(() => {
    if (stepIndex < tutorialSteps.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      setRunTutorial(false)
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }, [stepIndex])

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    }
  }, [stepIndex])

  const handleSkip = useCallback(() => {
    setRunTutorial(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }, [])

  // Don't render until mounted (avoid hydration issues)
  if (!isMounted) {
    return null
  }

  const currentStep = tutorialSteps[stepIndex]

  return (
    <>
      {/* Welcome Animation */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeAnimation
            userName={userName}
            onComplete={handleWelcomeComplete}
            onSkip={handleWelcomeSkip}
          />
        )}
      </AnimatePresence>

      {/* Tutorial Dialog */}
      <AnimatePresence>
        {runTutorial && currentStep && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[9999]"
              onClick={handleSkip}
            />

            {/* Tutorial Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90vw] max-w-md"
            >
              <Card className="shadow-2xl">
                <CardHeader className="relative pb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={handleSkip}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{currentStep.content}</p>

                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-1.5 py-2">
                    {tutorialSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          idx === stepIndex
                            ? "bg-primary"
                            : idx < stepIndex
                            ? "bg-primary/50"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      disabled={stepIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Retour
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {stepIndex + 1} / {tutorialSteps.length}
                    </span>
                    <Button onClick={handleNext}>
                      {stepIndex === tutorialSteps.length - 1 ? "Terminer" : "Suivant"}
                      {stepIndex < tutorialSteps.length - 1 && (
                        <ChevronRight className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Hook to trigger onboarding manually
export function useOnboarding() {
  const startOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(FIRST_LOGIN_KEY, "true")
    window.location.reload()
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(FIRST_LOGIN_KEY)
  }, [])

  const hasCompletedOnboarding = useCallback(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem(STORAGE_KEY) === "true"
  }, [])

  return {
    startOnboarding,
    resetOnboarding,
    hasCompletedOnboarding,
  }
}

// Mark first login from server-side (call after signup/first auth)
export function markFirstLogin() {
  if (typeof window !== "undefined") {
    localStorage.setItem(FIRST_LOGIN_KEY, "true")
  }
}
