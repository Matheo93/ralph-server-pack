'use client'

import { motion } from 'framer-motion'

interface StreakFlameProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
} as const

export function StreakFlame({ streak, size = 'md', animated = true }: StreakFlameProps) {
  // Calculate intensity based on streak
  const intensity = Math.min(streak / 30, 1) // Max intensity at 30 days
  const scale = 1 + intensity * 0.3 // Scale up to 1.3x

  // Color gradient based on streak
  const getColor = () => {
    if (streak >= 30) return 'from-yellow-400 via-orange-500 to-red-600' // Ultra hot
    if (streak >= 14) return 'from-orange-400 to-red-500' // Very hot
    if (streak >= 7) return 'from-orange-300 to-orange-500' // Hot
    if (streak >= 3) return 'from-yellow-400 to-orange-400' // Warm
    return 'from-yellow-300 to-orange-300' // Starting
  }

  const content = (
    <span className={`${sizeClasses[size]} inline-block`}>
      🔥
    </span>
  )

  if (!animated) {
    return (
      <div className="inline-flex items-center gap-1">
        {content}
        <span className="font-bold">{streak}</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      <motion.div
        animate={{
          scale: [scale, scale * 1.1, scale],
          rotate: [-3, 3, -3],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        {/* Glow effect */}
        <motion.div
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute inset-0 rounded-full bg-gradient-to-t ${getColor()} blur-md`}
        />
        {content}
      </motion.div>
      <motion.span
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 1,
        }}
        className="font-bold text-orange-600 dark:text-orange-400"
      >
        {streak}
      </motion.span>
    </div>
  )
}
