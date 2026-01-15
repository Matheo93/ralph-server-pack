"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  X,
  ChevronRight,
  ChevronLeft,
  ListTodo,
  Users,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/index"

interface GuideStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  highlight?: string // CSS selector to highlight
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "welcome",
    title: "Bienvenue sur FamilyLoad !",
    description:
      "Gérez la charge mentale de votre foyer en répartissant équitablement les tâches entre les parents.",
    icon: <Sparkles className="w-8 h-8 text-primary" />,
  },
  {
    id: "tasks",
    title: "Vos tâches",
    description:
      "Créez et gérez les tâches quotidiennes de votre famille. Marquez-les comme faites pour suivre votre progression.",
    icon: <ListTodo className="w-8 h-8 text-blue-500" />,
    highlight: "[data-nav='tasks']",
  },
  {
    id: "children",
    title: "Vos enfants",
    description:
      "Ajoutez vos enfants pour associer des tâches spécifiques à chacun et générer automatiquement des rappels adaptés à leur âge.",
    icon: <Users className="w-8 h-8 text-green-500" />,
    highlight: "[data-nav='children']",
  },
  {
    id: "charge",
    title: "Charge mentale",
    description:
      "Visualisez la répartition de la charge entre les parents et identifiez les déséquilibres à corriger.",
    icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
    highlight: "[data-nav='charge']",
  },
  {
    id: "settings",
    title: "Paramètres",
    description:
      "Personnalisez votre expérience, invitez votre co-parent et gérez les notifications.",
    icon: <Settings className="w-8 h-8 text-muted-foreground" />,
    highlight: "[data-nav='settings']",
  },
]

const STORAGE_KEY = "familyload_guide_completed"

interface FirstTimeGuideProps {
  forceShow?: boolean
  onComplete?: () => void
}

export function FirstTimeGuide({ forceShow = false, onComplete }: FirstTimeGuideProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true)
      return
    }

    // Check if guide was already completed
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed) {
      // Show guide after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [forceShow])

  const handleNext = useCallback(() => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    handleComplete()
  }, [])

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true")
    setIsVisible(false)
    onComplete?.()
  }, [onComplete])

  const step = GUIDE_STEPS[currentStep]

  if (!step) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Guide card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md"
          >
            <Card className="shadow-2xl">
              <CardHeader className="relative pb-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-2 top-2"
                  onClick={handleSkip}
                  aria-label="Passer le guide"
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="flex justify-center mb-4">{step.icon}</div>
                <CardTitle className="text-center text-xl">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center text-muted-foreground">{step.description}</p>

                {/* Step indicators */}
                <div className="flex justify-center gap-2">
                  {GUIDE_STEPS.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === currentStep
                          ? "bg-primary w-6"
                          : index < currentStep
                            ? "bg-primary/50"
                            : "bg-muted"
                      )}
                      onClick={() => setCurrentStep(index)}
                      aria-label={`Étape ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between gap-4">
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    {currentStep === GUIDE_STEPS.length - 1 ? (
                      "Commencer"
                    ) : (
                      <>
                        Suivant
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Skip button */}
                {currentStep < GUIDE_STEPS.length - 1 && (
                  <button
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground text-center w-full"
                  >
                    Passer le guide
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Hook to reset guide (for testing or settings)
export function useResetGuide() {
  return useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])
}
