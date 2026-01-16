"use client"

/**
 * OnboardingTutorial - Interactive tutorial for new users
 * Uses react-joyride to guide users through the app features
 */

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { WelcomeAnimation } from "./WelcomeAnimation"
import type { CallBackProps, Step, Styles } from "react-joyride"

// Dynamic import to avoid SSR issues
const Joyride = dynamic(() => import("react-joyride"), { ssr: false })

const STORAGE_KEY = "familyload_onboarding_completed"
const FIRST_LOGIN_KEY = "familyload_is_first_login"

interface OnboardingTutorialProps {
  userName?: string
  isFirstLogin?: boolean
}

// Tutorial steps
const tutorialSteps: Step[] = [
  {
    target: "#main-content",
    content: "Voici votre tableau de bord. Vous y trouverez un aperçu de toutes vos tâches et de votre charge mentale.",
    placement: "center",
    disableBeacon: true,
    title: "Tableau de bord",
  },
  {
    target: '[data-tour="nav-children"]',
    content: "Ajoutez vos enfants ici pour personnaliser les tâches selon leur âge et leurs activités.",
    placement: "right",
    title: "Vos enfants",
  },
  {
    target: '[data-tour="fab-button"]',
    content: "Créez facilement de nouvelles tâches en cliquant sur ce bouton. Vous pouvez aussi utiliser la commande vocale !",
    placement: "top",
    title: "Ajouter une tâche",
  },
  {
    target: '[data-tour="nav-charge"]',
    content: "Analysez la répartition de la charge mentale entre les parents pour un meilleur équilibre.",
    placement: "right",
    title: "Charge mentale",
  },
  {
    target: '[data-tour="header-streak"]',
    content: "Maintenez votre série en complétant vos tâches chaque jour. Plus la série est longue, plus vous progressez !",
    placement: "bottom",
    title: "Votre série",
  },
]

// Fallback steps if elements not found
const fallbackSteps: Step[] = [
  {
    target: "body",
    content: "Bienvenue dans FamilyLoad ! Cette application vous aide à gérer la charge mentale parentale de manière équilibrée.",
    placement: "center",
    disableBeacon: true,
    title: "Bienvenue !",
  },
  {
    target: "body",
    content: "Commencez par ajouter vos enfants depuis le menu latéral, puis créez vos premières tâches.",
    placement: "center",
    title: "Premiers pas",
  },
  {
    target: "body",
    content: "Utilisez le bouton + en bas à droite pour créer rapidement des tâches, ou utilisez la commande vocale.",
    placement: "center",
    title: "Créer des tâches",
  },
]

// Custom styles for the tutorial
const joyrideStyles: Partial<Styles> = {
  options: {
    primaryColor: "hsl(var(--primary))",
    zIndex: 10000,
    arrowColor: "hsl(var(--card))",
    backgroundColor: "hsl(var(--card))",
    textColor: "hsl(var(--card-foreground))",
    overlayColor: "rgba(0, 0, 0, 0.5)",
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  buttonNext: {
    backgroundColor: "hsl(var(--primary))",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
  },
  buttonBack: {
    color: "hsl(var(--muted-foreground))",
    marginRight: 10,
  },
  buttonSkip: {
    color: "hsl(var(--muted-foreground))",
  },
  spotlight: {
    borderRadius: 8,
  },
}

export function OnboardingTutorial({ userName, isFirstLogin }: OnboardingTutorialProps) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [runTutorial, setRunTutorial] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
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

  // Check which elements exist and create appropriate steps
  useEffect(() => {
    if (!runTutorial) return

    const checkElements = () => {
      const availableSteps: Step[] = []

      tutorialSteps.forEach((step) => {
        if (step.target === "body" || step.target === "#main-content") {
          availableSteps.push(step)
        } else {
          const element = document.querySelector(step.target as string)
          if (element) {
            availableSteps.push(step)
          }
        }
      })

      // If no specific elements found, use fallback
      if (availableSteps.length <= 1) {
        setSteps(fallbackSteps)
      } else {
        setSteps(availableSteps)
      }
    }

    // Wait a bit for DOM to be ready
    const timer = setTimeout(checkElements, 500)
    return () => clearTimeout(timer)
  }, [runTutorial])

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false)
    setRunTutorial(true)
  }, [])

  const handleWelcomeSkip = useCallback(() => {
    setShowWelcome(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }, [])

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, index, type } = data

    if (type === "step:after") {
      setStepIndex(index + 1)
    }

    // Tutorial finished or skipped
    if (status === "finished" || status === "skipped") {
      setRunTutorial(false)
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }, [])

  // Don't render until mounted (avoid hydration issues)
  if (!isMounted) {
    return null
  }

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

      {/* Joyride Tutorial */}
      {runTutorial && steps.length > 0 && (
        <Joyride
          steps={steps}
          stepIndex={stepIndex}
          run={runTutorial}
          continuous
          showSkipButton
          showProgress
          callback={handleJoyrideCallback}
          styles={joyrideStyles}
          locale={{
            back: "Retour",
            close: "Fermer",
            last: "Terminer",
            next: "Suivant",
            skip: "Passer",
          }}
          floaterProps={{
            disableAnimation: false,
          }}
        />
      )}
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
