/**
 * Streak Animation Component
 *
 * Animated celebration for streak milestones.
 */

"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Flame, Star, Sparkles, Trophy, Zap } from "lucide-react"

interface StreakAnimationProps {
  streak: number
  milestone?: number
  show: boolean
  onComplete?: () => void
  className?: string
}

export function StreakAnimation({
  streak,
  milestone,
  show,
  onComplete,
  className,
}: StreakAnimationProps) {
  const [visible, setVisible] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<"enter" | "display" | "exit">("enter")

  useEffect(() => {
    if (show) {
      setVisible(true)
      setAnimationPhase("enter")

      // Enter phase
      const enterTimer = setTimeout(() => {
        setAnimationPhase("display")
      }, 300)

      // Exit phase
      const displayTimer = setTimeout(() => {
        setAnimationPhase("exit")
      }, 2500)

      // Complete
      const exitTimer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 3000)

      return () => {
        clearTimeout(enterTimer)
        clearTimeout(displayTimer)
        clearTimeout(exitTimer)
      }
    } else {
      setVisible(false)
    }
  }, [show, onComplete])

  if (!visible) return null

  const isMilestone = milestone !== undefined

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
        animationPhase === "enter" && "animate-fade-in",
        animationPhase === "exit" && "animate-fade-out",
        className
      )}
      data-testid="streak-animation"
    >
      {/* Background particles */}
      <ParticleEffect show={animationPhase === "display"} />

      {/* Main content */}
      <div
        className={cn(
          "relative flex flex-col items-center gap-4 p-8 rounded-2xl",
          "bg-gradient-to-b from-orange-500 to-red-600",
          "text-white shadow-2xl",
          animationPhase === "enter" && "animate-scale-in",
          animationPhase === "exit" && "animate-scale-out"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "relative",
            animationPhase === "display" && "animate-bounce"
          )}
        >
          {isMilestone ? (
            <Trophy className="h-20 w-20 text-yellow-300" />
          ) : (
            <Flame className="h-20 w-20 text-yellow-300" />
          )}

          {/* Sparkles around icon */}
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-200 animate-pulse" />
          <Star className="absolute -bottom-1 -left-1 h-5 w-5 text-yellow-200 animate-pulse" />
        </div>

        {/* Streak number */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-6xl font-bold animate-pulse">{streak}</span>
            <Zap className="h-8 w-8 text-yellow-300" />
          </div>
          <p className="text-lg font-medium text-orange-100">
            jour{streak !== 1 ? "s" : ""} de streak !
          </p>
        </div>

        {/* Milestone message */}
        {isMilestone && (
          <div className="mt-2 px-4 py-2 bg-yellow-500/30 rounded-full">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4" />
              Jalon {milestone} jours atteint !
            </p>
          </div>
        )}

        {/* Subtitle */}
        <p className="text-sm text-orange-200">
          {isMilestone
            ? "Félicitations pour cet accomplissement !"
            : "Continuez comme ça !"}
        </p>
      </div>
    </div>
  )
}

// Particle effect for celebration
interface ParticleEffectProps {
  show: boolean
}

function ParticleEffect({ show }: ParticleEffectProps) {
  if (!show) return null

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 0.5}s`,
    animationDuration: `${1 + Math.random() * 1}s`,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 w-3 h-3 rounded-full animate-float-up"
          style={{
            left: particle.left,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
            backgroundColor: ["#fbbf24", "#f59e0b", "#ef4444", "#f97316"][
              Math.floor(Math.random() * 4)
            ],
          }}
        />
      ))}
    </div>
  )
}

// Inline streak increment animation
interface StreakIncrementProps {
  show: boolean
  className?: string
}

export function StreakIncrement({ show, className }: StreakIncrementProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!visible) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-green-500 font-bold animate-bounce",
        className
      )}
    >
      <span>+1</span>
      <Flame className="h-4 w-4" />
    </span>
  )
}

// Daily streak reminder
interface StreakReminderProps {
  hoursRemaining: number
  className?: string
  onDismiss?: () => void
}

export function StreakReminder({
  hoursRemaining,
  className,
  onDismiss,
}: StreakReminderProps) {
  const isUrgent = hoursRemaining <= 4

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        isUrgent
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-orange-50 border-orange-200 text-orange-700",
        className
      )}
      data-testid="streak-reminder"
    >
      <Flame className={cn("h-5 w-5", isUrgent && "animate-pulse")} />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {isUrgent ? "⚠️ Votre streak expire bientôt !" : "N'oubliez pas votre streak !"}
        </p>
        <p className="text-xs opacity-80">
          Plus que {hoursRemaining}h pour compléter une tâche
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs underline hover:no-underline"
        >
          Plus tard
        </button>
      )}
    </div>
  )
}

// Add custom animations to tailwind config would include:
// animate-fade-in: opacity 0 to 1
// animate-fade-out: opacity 1 to 0
// animate-scale-in: scale 0.8 to 1
// animate-scale-out: scale 1 to 0.8
// animate-float-up: translateY 0 to -100vh
