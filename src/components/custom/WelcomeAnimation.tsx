"use client"

/**
 * WelcomeAnimation - Animated welcome screen for first-time users
 * Shows confetti and a welcoming message
 */

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

interface WelcomeAnimationProps {
  userName?: string
  onComplete: () => void
  onSkip?: () => void
}

export function WelcomeAnimation({ userName, onComplete, onSkip }: WelcomeAnimationProps) {
  const [phase, setPhase] = useState<"welcome" | "message" | "action">("welcome")

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3000
    const end = Date.now() + duration

    const colors = ["#f97316", "#fb923c", "#fdba74", "#22c55e", "#4ade80", "#a855f7"]

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    // Start confetti
    frame()

    // Progress through phases
    const timer1 = setTimeout(() => setPhase("message"), 1000)
    const timer2 = setTimeout(() => setPhase("action"), 2500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleStartTutorial = useCallback(() => {
    onComplete()
  }, [onComplete])

  const handleSkipTutorial = useCallback(() => {
    if (onSkip) {
      onSkip()
    } else {
      onComplete()
    }
  }, [onSkip, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-accent blur-3xl"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Logo with glow */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl scale-150"
            />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30">
              <span className="text-primary-foreground font-bold text-4xl">F</span>
            </div>
          </div>
        </motion.div>

        {/* Welcome text */}
        <AnimatePresence mode="wait">
          {phase === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Bienvenue{userName ? `, ${userName}` : ""} !
              </h1>
            </motion.div>
          )}

          {(phase === "message" || phase === "action") && (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Bienvenue sur FamilyLoad !
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Vous allez enfin pouvoir liberer votre charge mentale parentale.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <AnimatePresence>
          {phase === "action" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-4"
            >
              <p className="text-base text-muted-foreground mb-6">
                Voulez-vous une visite guidee de l&apos;application ?
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartTutorial}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
                >
                  Oui, montrez-moi !
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSkipTutorial}
                  className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                  Non merci, je connais
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
