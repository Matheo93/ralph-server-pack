"use client"

import { useEffect, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface IntroAnimationProps {
  children: ReactNode
}

const STORAGE_KEY = "familyload_intro_seen"

export function IntroAnimation({ children }: IntroAnimationProps) {
  const [showIntro, setShowIntro] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<"logo" | "text" | "fadeout" | "done">("logo")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // Check if user has already seen the intro
    const hasSeen = localStorage.getItem(STORAGE_KEY)
    if (!hasSeen) {
      setShowIntro(true)
      localStorage.setItem(STORAGE_KEY, "true")

      // Animation timeline
      // Phase 1: Logo appears (0-800ms)
      setTimeout(() => setAnimationPhase("text"), 800)
      // Phase 2: Text appears (800-2000ms)
      setTimeout(() => setAnimationPhase("fadeout"), 2000)
      // Phase 3: Fadeout (2000-3000ms)
      setTimeout(() => setAnimationPhase("done"), 3000)
    } else {
      setAnimationPhase("done")
    }
  }, [])

  // Don't show anything until mounted (avoid hydration mismatch)
  if (!isMounted) {
    return <>{children}</>
  }

  // If animation is done or user has already seen it, just show children
  if (animationPhase === "done" || !showIntro) {
    return <>{children}</>
  }

  // At this point, animationPhase is "logo" | "text" | "fadeout" (always active)
  const isActive = true

  return (
    <>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: animationPhase === "fadeout" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[100] bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center overflow-hidden"
          >
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Floating circles */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="absolute top-20 left-20 w-64 h-64 rounded-full bg-rose-400 blur-3xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-orange-400 blur-3xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.05, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary blur-3xl"
              />
            </div>

            {/* Main content */}
            <div className="relative z-10 text-center px-4">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  duration: 0.8
                }}
                className="inline-flex items-center justify-center mb-8"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl scale-150"
                  />

                  {/* Logo container */}
                  <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30">
                    <span className="text-primary-foreground font-bold text-5xl md:text-6xl">F</span>
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: animationPhase !== "logo" ? 1 : 0,
                  y: animationPhase !== "logo" ? 0 : 30
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent mb-4"
              >
                FamilyLoad
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: animationPhase !== "logo" ? 1 : 0,
                  y: animationPhase !== "logo" ? 0 : 20
                }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="text-xl md:text-2xl text-gray-600 font-medium"
              >
                Liberez votre charge mentale
              </motion.p>

              {/* Animated dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: animationPhase !== "logo" ? 1 : 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-2 mt-8"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-3 h-3 rounded-full bg-primary"
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Children are rendered behind the animation */}
      <div className={isActive ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        {children}
      </div>
    </>
  )
}
