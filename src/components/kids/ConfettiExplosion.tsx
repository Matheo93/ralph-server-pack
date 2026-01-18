'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  shape: 'circle' | 'square' | 'star' | 'heart'
  delay: number
}

interface ConfettiExplosionProps {
  /** Trigger the confetti animation */
  trigger: boolean
  /** Number of confetti pieces */
  count?: number
  /** Duration in milliseconds */
  duration?: number
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom colors array */
  colors?: string[]
}

const defaultColors = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // sky blue
  '#96CEB4', // mint
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // seafoam
  '#F7DC6F', // gold
  '#BB8FCE', // lavender
  '#85C1E9', // light blue
  '#F8B500', // orange
  '#00D4AA', // turquoise
]

const shapes = ['circle', 'square', 'star', 'heart'] as const

function generateConfetti(count: number, colors: string[]): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // percentage
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 1,
    color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0] ?? '#FF6B6B',
    shape: shapes[Math.floor(Math.random() * shapes.length)] ?? 'circle',
    delay: Math.random() * 0.3,
  }))
}

function ConfettiShape({ shape, color }: { shape: ConfettiPiece['shape']; color: string }) {
  switch (shape) {
    case 'circle':
      return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
    case 'square':
      return <div className="w-3 h-3 rotate-45" style={{ backgroundColor: color }} />
    case 'star':
      return <span className="text-lg" style={{ color }}>&#9733;</span>
    case 'heart':
      return <span className="text-lg" style={{ color }}>&#10084;</span>
    default:
      return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
  }
}

export function ConfettiExplosion({
  trigger,
  count = 50,
  duration = 3000,
  onComplete,
  colors = defaultColors,
}: ConfettiExplosionProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isActive, setIsActive] = useState(false)

  const startAnimation = useCallback(() => {
    setConfetti(generateConfetti(count, colors))
    setIsActive(true)
  }, [count, colors])

  useEffect(() => {
    if (trigger && !isActive) {
      startAnimation()
      const timeout = setTimeout(() => {
        setIsActive(false)
        setConfetti([])
        onComplete?.()
      }, duration)
      return () => clearTimeout(timeout)
    }
  }, [trigger, isActive, duration, onComplete, startAnimation])

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute"
              style={{ left: `${piece.x}%` }}
              initial={{
                y: piece.y,
                rotate: piece.rotation,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: piece.rotation + 720,
                scale: piece.scale,
                opacity: [1, 1, 1, 0],
                x: [0, Math.random() * 100 - 50, Math.random() * 150 - 75],
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: piece.delay,
                ease: 'easeOut',
              }}
            >
              <ConfettiShape shape={piece.shape} color={piece.color} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to control confetti animation
 */
export function useConfetti() {
  const [showConfetti, setShowConfetti] = useState(false)

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true)
  }, [])

  const resetConfetti = useCallback(() => {
    setShowConfetti(false)
  }, [])

  return {
    showConfetti,
    triggerConfetti,
    resetConfetti,
  }
}
