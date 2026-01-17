'use client'

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'

interface AnimatedXpBarProps {
  currentXp: number
  requiredXp: number
  level: number
  levelName: string
  levelIcon: string
  className?: string
}

export function AnimatedXpBar({
  currentXp,
  requiredXp,
  level,
  levelName,
  levelIcon,
  className = '',
}: AnimatedXpBarProps) {
  const [prevXp, setPrevXp] = useState(currentXp)
  const [showPulse, setShowPulse] = useState(false)

  const progress = Math.min((currentXp / requiredXp) * 100, 100)

  // Animated progress value
  const springProgress = useSpring(progress, {
    damping: 30,
    stiffness: 200,
  })

  // Detect XP changes
  useEffect(() => {
    if (currentXp > prevXp) {
      setShowPulse(true)
      setTimeout(() => setShowPulse(false), 500)
    }
    setPrevXp(currentXp)
  }, [currentXp, prevXp])

  return (
    <div className={`relative ${className}`}>
      {/* Level indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.span
            animate={showPulse ? { scale: [1, 1.2, 1] } : {}}
            className="text-xl"
          >
            {levelIcon}
          </motion.span>
          <span className="font-semibold text-gray-700">{levelName}</span>
        </div>
        <span className="text-sm text-gray-500">Niv. {level}</span>
      </div>

      {/* Progress bar container */}
      <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
        {/* Animated progress fill */}
        <motion.div
          style={{ width: useTransform(springProgress, (v) => `${v}%`) }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 rounded-full"
        >
          {/* Shine effect */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>

        {/* Pulse on XP gain */}
        {showPulse && (
          <motion.div
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-yellow-400 rounded-full"
          />
        )}
      </div>

      {/* XP counter */}
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <motion.span
          key={currentXp}
          initial={{ scale: 1.2, color: '#EC4899' }}
          animate={{ scale: 1, color: '#6B7280' }}
          transition={{ duration: 0.3 }}
          className="font-medium"
        >
          {currentXp} XP
        </motion.span>
        <span>{requiredXp} XP</span>
      </div>
    </div>
  )
}
