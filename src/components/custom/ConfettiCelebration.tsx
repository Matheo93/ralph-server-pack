"use client"

/**
 * ConfettiCelebration - Celebration animations for achievements
 * Used for streak milestones, task completion, and weekly goals
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface Particle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  shape: "circle" | "square" | "star"
  velocityX: number
  velocityY: number
}

interface ConfettiCelebrationProps {
  trigger: boolean
  type?: "streak" | "task" | "weekly" | "custom"
  duration?: number
  particleCount?: number
  colors?: string[]
  onComplete?: () => void
  className?: string
}

interface StarfallProps {
  trigger: boolean
  count?: number
  duration?: number
  onComplete?: () => void
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#FFE66D", // Yellow
  "#95E1D3", // Mint
  "#F38181", // Coral
  "#AA96DA", // Purple
  "#7ED321", // Green
  "#F8B500", // Gold
]

const STREAK_COLORS = [
  "#FF6B6B",
  "#FF8E53",
  "#FFA726",
  "#FFD54F",
]

const CELEBRATION_CONFIGS = {
  streak: {
    particleCount: 100,
    duration: 3000,
    colors: STREAK_COLORS,
  },
  task: {
    particleCount: 30,
    duration: 1500,
    colors: ["#4ECDC4", "#95E1D3", "#7ED321"],
  },
  weekly: {
    particleCount: 150,
    duration: 4000,
    colors: DEFAULT_COLORS,
  },
  custom: {
    particleCount: 50,
    duration: 2000,
    colors: DEFAULT_COLORS,
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

function createParticle(
  id: number,
  containerWidth: number,
  containerHeight: number,
  colors: string[]
): Particle {
  const shapes: Array<"circle" | "square" | "star"> = ["circle", "square", "star"]
  const colorIndex = Math.floor(Math.random() * colors.length)
  const shapeIndex = Math.floor(Math.random() * shapes.length)
  return {
    id,
    x: Math.random() * containerWidth,
    y: -20,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5,
    color: colors[colorIndex] ?? "#FF6B6B",
    shape: shapes[shapeIndex] ?? "circle",
    velocityX: (Math.random() - 0.5) * 10,
    velocityY: 2 + Math.random() * 5,
  }
}

// ============================================================================
// Particle Component
// ============================================================================

function ConfettiParticle({ particle }: { particle: Particle }) {
  const renderShape = () => {
    switch (particle.shape) {
      case "circle":
        return (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: particle.color }}
          />
        )
      case "square":
        return (
          <div
            className="w-2 h-2"
            style={{ backgroundColor: particle.color }}
          />
        )
      case "star":
        return (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill={particle.color}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
    }
  }

  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{
        x: particle.x,
        y: particle.y,
        scale: 0,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: particle.x + particle.velocityX * 100,
        y: particle.y + particle.velocityY * 150,
        scale: particle.scale,
        rotate: particle.rotation + 720,
        opacity: 0,
      }}
      transition={{
        duration: 2 + Math.random(),
        ease: "easeOut",
      }}
    >
      {renderShape()}
    </motion.div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfettiCelebration({
  trigger,
  type = "custom",
  duration,
  particleCount,
  colors,
  onComplete,
  className,
}: ConfettiCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [isActive, setIsActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const config = CELEBRATION_CONFIGS[type]
  const finalParticleCount = particleCount ?? config.particleCount
  const finalDuration = duration ?? config.duration
  const finalColors = colors ?? config.colors

  const startCelebration = useCallback(() => {
    if (!containerRef.current) return

    const { width, height } = containerRef.current.getBoundingClientRect()
    const newParticles = Array.from({ length: finalParticleCount }, (_, i) =>
      createParticle(i, width, height, finalColors)
    )

    setParticles(newParticles)
    setIsActive(true)

    // Clear particles after duration
    setTimeout(() => {
      setParticles([])
      setIsActive(false)
      onComplete?.()
    }, finalDuration)
  }, [finalParticleCount, finalDuration, finalColors, onComplete])

  useEffect(() => {
    if (trigger && !isActive) {
      startCelebration()
    }
  }, [trigger, isActive, startCelebration])

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 pointer-events-none overflow-hidden z-50",
        className
      )}
    >
      <AnimatePresence>
        {particles.map((particle) => (
          <ConfettiParticle key={particle.id} particle={particle} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Starfall Animation (for streak milestones)
// ============================================================================

export function Starfall({
  trigger,
  count = 20,
  duration = 2000,
  onComplete,
}: StarfallProps) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; delay: number }>>([])
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (trigger && !isActive) {
      const newStars = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
      }))
      setStars(newStars)
      setIsActive(true)

      setTimeout(() => {
        setStars([])
        setIsActive(false)
        onComplete?.()
      }, duration)
    }
  }, [trigger, isActive, count, duration, onComplete])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute top-0"
            style={{ left: `${star.x}%` }}
            initial={{ y: -20, opacity: 0, scale: 0 }}
            animate={{ y: "100vh", opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.5] }}
            transition={{
              duration: 1.5,
              delay: star.delay,
              ease: "easeIn",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#FFD700"
              className="drop-shadow-lg"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Success Burst (for task completion)
// ============================================================================

export function SuccessBurst({
  trigger,
  x = "50%",
  y = "50%",
  onComplete,
}: {
  trigger: boolean
  x?: string | number
  y?: string | number
  onComplete?: () => void
}) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true)
      setTimeout(() => {
        setIsActive(false)
        onComplete?.()
      }, 600)
    }
  }, [trigger, isActive, onComplete])

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed pointer-events-none z-50"
          style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Hook for easy usage
// ============================================================================

export function useCelebration() {
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [starfallTrigger, setStarfallTrigger] = useState(false)
  const [burstTrigger, setBurstTrigger] = useState(false)

  const triggerConfetti = useCallback(() => {
    setConfettiTrigger(true)
    setTimeout(() => setConfettiTrigger(false), 100)
  }, [])

  const triggerStarfall = useCallback(() => {
    setStarfallTrigger(true)
    setTimeout(() => setStarfallTrigger(false), 100)
  }, [])

  const triggerBurst = useCallback(() => {
    setBurstTrigger(true)
    setTimeout(() => setBurstTrigger(false), 100)
  }, [])

  return {
    confettiTrigger,
    starfallTrigger,
    burstTrigger,
    triggerConfetti,
    triggerStarfall,
    triggerBurst,
  }
}
