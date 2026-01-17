'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface CelebrationOverlayProps {
  isVisible: boolean
  type: 'xp' | 'levelUp' | 'badge' | 'streak' | 'purchase'
  value?: string | number
  title?: string
  subtitle?: string
  icon?: string
  onComplete?: () => void
  duration?: number
}

const celebrationConfig: Record<string, {
  colors: string[]
  particleCount: number
  spread: number
  startVelocity: number
}> = {
  xp: {
    colors: ['#EC4899', '#F97316', '#FBBF24'],
    particleCount: 50,
    spread: 60,
    startVelocity: 30,
  },
  levelUp: {
    colors: ['#8B5CF6', '#6366F1', '#EC4899'],
    particleCount: 100,
    spread: 100,
    startVelocity: 45,
  },
  badge: {
    colors: ['#FBBF24', '#F97316', '#EAB308'],
    particleCount: 80,
    spread: 80,
    startVelocity: 35,
  },
  streak: {
    colors: ['#F97316', '#EF4444', '#FBBF24'],
    particleCount: 60,
    spread: 70,
    startVelocity: 30,
  },
  purchase: {
    colors: ['#EC4899', '#8B5CF6', '#06B6D4'],
    particleCount: 70,
    spread: 75,
    startVelocity: 35,
  },
}

const defaultIcons = {
  xp: '✨',
  levelUp: '🚀',
  badge: '🏆',
  streak: '🔥',
  purchase: '🎉',
} as const

export function CelebrationOverlay({
  isVisible,
  type,
  value,
  title,
  subtitle,
  icon,
  onComplete,
  duration = 2500,
}: CelebrationOverlayProps) {
  useEffect(() => {
    if (isVisible) {
      const config = celebrationConfig[type] ?? celebrationConfig['xp']!

      // Fire confetti
      confetti({
        particleCount: config.particleCount,
        spread: config.spread,
        startVelocity: config.startVelocity,
        origin: { y: 0.6 },
        colors: config.colors,
        disableForReducedMotion: true,
      })

      // Second burst for level up
      if (type === 'levelUp') {
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: config.colors,
          })
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: config.colors,
          })
        }, 250)
      }

      // Auto-close
      const timer = setTimeout(() => {
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, type, duration, onComplete])

  const displayIcon = icon ?? defaultIcons[type]
  const defaultTitles = {
    xp: `+${value} XP`,
    levelUp: 'Level Up!',
    badge: 'Nouveau Badge!',
    streak: `${value} jours!`,
    purchase: 'Bravo!',
  }
  const displayTitle = title ?? defaultTitles[type]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [0, 10, 0],
            }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 300,
            }}
            className="text-center p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon with pulse animation */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className="text-8xl mb-4 drop-shadow-lg"
            >
              {displayIcon}
            </motion.div>

            {/* Title with bounce */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black text-white drop-shadow-lg mb-2"
            >
              {displayTitle}
            </motion.h2>

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-white/90 font-medium drop-shadow"
              >
                {subtitle}
              </motion.p>
            )}

            {/* Sparkle decorations */}
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0 pointer-events-none"
            >
              {[...Array(6)].map((_, i) => (
                <motion.span
                  key={i}
                  animate={{
                    scale: [0.5, 1, 0.5],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="absolute text-2xl"
                  style={{
                    top: `${20 + Math.sin(i * 60 * Math.PI / 180) * 35}%`,
                    left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 35}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  ✨
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
