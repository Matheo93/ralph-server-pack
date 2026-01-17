"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"

// Coach marks steps configuration
export interface CoachStep {
  id: string
  target: string // CSS selector
  title: string
  description: string
  position?: "top" | "bottom" | "left" | "right"
  highlight?: boolean
}

interface CoachMarksContextType {
  isActive: boolean
  currentStep: number
  steps: CoachStep[]
  startTour: (steps: CoachStep[]) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
}

const CoachMarksContext = createContext<CoachMarksContextType | null>(null)

export function useCoachMarks() {
  const context = useContext(CoachMarksContext)
  if (!context) {
    throw new Error("useCoachMarks must be used within CoachMarksProvider")
  }
  return context
}

const STORAGE_KEY = "familyload_coach_completed"

interface CoachMarksProviderProps {
  children: React.ReactNode
}

export function CoachMarksProvider({ children }: CoachMarksProviderProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<CoachStep[]>([])

  const startTour = useCallback((tourSteps: CoachStep[]) => {
    // Check if tour was already completed
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (completed) {
        const completedTours = JSON.parse(completed) as string[]
        const tourId = tourSteps.map(s => s.id).join("-")
        if (completedTours.includes(tourId)) {
          return // Tour already completed
        }
      }
    }
    setSteps(tourSteps)
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const endTour = useCallback(() => {
    // Mark tour as completed
    if (typeof window !== "undefined" && steps.length > 0) {
      const tourId = steps.map(s => s.id).join("-")
      const completed = localStorage.getItem(STORAGE_KEY)
      const completedTours = completed ? JSON.parse(completed) as string[] : []
      if (!completedTours.includes(tourId)) {
        completedTours.push(tourId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completedTours))
      }
    }
    setIsActive(false)
    setSteps([])
    setCurrentStep(0)
  }, [steps])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }, [currentStep, steps.length, endTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const skipTour = useCallback(() => {
    endTour()
  }, [endTour])

  return (
    <CoachMarksContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipTour,
      }}
    >
      {children}
      <CoachMarksOverlay />
    </CoachMarksContext.Provider>
  )
}

function CoachMarksOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTour } = useCoachMarks()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const step = steps[currentStep]

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !step) return

    const target = document.querySelector(step.target)
    if (!target) return

    const rect = target.getBoundingClientRect()
    setTargetRect(rect)

    // Calculate tooltip position
    const padding = 16
    let x = rect.left + rect.width / 2
    let y = rect.bottom + padding

    switch (step.position) {
      case "top":
        y = rect.top - padding
        break
      case "left":
        x = rect.left - padding
        y = rect.top + rect.height / 2
        break
      case "right":
        x = rect.right + padding
        y = rect.top + rect.height / 2
        break
      default: // bottom
        y = rect.bottom + padding
    }

    setTooltipPosition({ x, y })

    // Scroll element into view
    target.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [isActive, step, currentStep])

  if (!isActive || !step) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        {/* Backdrop with cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="coach-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#coach-mask)"
          />
        </svg>

        {/* Highlight ring */}
        {targetRect && step.highlight !== false && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          >
            <div className="absolute inset-0 rounded-lg border-2 border-sky-500 animate-pulse" />
            <div className="absolute inset-0 rounded-lg bg-sky-500/10" />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute z-[101] bg-white dark:bg-gray-900 rounded-xl shadow-2xl",
            "border border-gray-200 dark:border-gray-700",
            "p-4 max-w-[320px]",
            step.position === "top" && "-translate-x-1/2 -translate-y-full",
            step.position === "bottom" && "-translate-x-1/2",
            step.position === "left" && "-translate-x-full -translate-y-1/2",
            step.position === "right" && "-translate-y-1/2"
          )}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-3 h-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rotate-45",
              step.position === "top" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b",
              step.position === "bottom" && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t",
              step.position === "left" && "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-t border-r",
              step.position === "right" && "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-l"
            )}
          />

          {/* Content */}
          <div className="relative">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTour}
                className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                Passer
              </Button>
            </div>

            <h3 className="font-semibold text-base mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1"
              >
                Precedent
              </Button>
              <Button
                size="sm"
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-sky-500 to-pink-500 text-white"
              >
                {currentStep === steps.length - 1 ? "Terminer" : "Suivant"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Progress dots */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentStep
                  ? "bg-sky-500"
                  : index < currentStep
                    ? "bg-sky-300"
                    : "bg-gray-300"
              )}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Predefined tour steps for the dashboard
export const dashboardTourSteps: CoachStep[] = [
  {
    id: "stats",
    target: ".grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4",
    title: "Vos statistiques",
    description: "Voyez en un coup d'œil vos tâches du jour, les retards, et la situation de votre famille.",
    position: "bottom",
  },
  {
    id: "magic-notepad",
    target: "[aria-label='Ouvrir le carnet magique']",
    title: "Le Carnet Magique",
    description: "Dictez ou écrivez vos notes - l'IA les transforme automatiquement en tâches classées !",
    position: "left",
  },
  {
    id: "today-tasks",
    target: "[data-coach='today-tasks']",
    title: "Tâches du jour",
    description: "Votre liste de tâches prioritaires. Cochez-les pour maintenir votre streak !",
    position: "right",
  },
  {
    id: "streak",
    target: "[data-coach='streak']",
    title: "Votre Streak",
    description: "Complétez vos tâches critiques chaque jour pour augmenter votre streak !",
    position: "left",
  },
]

// Hook to trigger dashboard tour on first visit
export function useDashboardTour() {
  const { startTour } = useCoachMarks()

  useEffect(() => {
    // Check if this is first visit
    const hasVisited = localStorage.getItem("familyload_dashboard_visited")
    if (!hasVisited) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour(dashboardTourSteps)
        localStorage.setItem("familyload_dashboard_visited", "true")
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [startTour])
}

// Button to manually trigger tour
export function TourTriggerButton({ className }: { className?: string }) {
  const { startTour, isActive } = useCoachMarks()

  if (isActive) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startTour(dashboardTourSteps)}
      className={cn("gap-2", className)}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Guide</span>
    </Button>
  )
}

// Reset tour progress (for testing)
export function resetTourProgress() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem("familyload_dashboard_visited")
}
