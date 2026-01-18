'use client'

import { motion } from 'framer-motion'

interface StarBurstProps {
  /** Whether to show the animation */
  show: boolean
  /** Size of the burst */
  size?: 'sm' | 'md' | 'lg'
  /** Color theme */
  theme?: 'gold' | 'rainbow' | 'pink'
}

const sizeClasses = {
  sm: 'w-24 h-24',
  md: 'w-40 h-40',
  lg: 'w-56 h-56',
}

const themeColors = {
  gold: ['#FFD700', '#FFA500', '#FF8C00', '#FFB347', '#FFCC00'],
  rainbow: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
  pink: ['#FF69B4', '#FFB6C1', '#FF1493', '#FF85A2', '#FFC0CB'],
}

export function StarBurst({ show, size = 'md', theme = 'gold' }: StarBurstProps) {
  const colors = themeColors[theme]

  if (!show) return null

  return (
    <div className={`relative ${sizeClasses[size]} pointer-events-none`}>
      {/* Central star */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: [0, 1.2, 1], rotate: [0, 360] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <span className="text-5xl drop-shadow-lg">&#11088;</span>
      </motion.div>

      {/* Radiating stars */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * 360
        const rad = (angle * Math.PI) / 180
        const distance = size === 'sm' ? 35 : size === 'md' ? 55 : 75
        const x = Math.cos(rad) * distance
        const y = Math.sin(rad) * distance

        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ originX: 0.5, originY: 0.5 }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: [0, x],
              y: [0, y],
              scale: [0, 1, 0.5],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.8,
              delay: 0.1 + i * 0.05,
              ease: 'easeOut',
            }}
          >
            <span
              className="text-xl"
              style={{ color: colors[i % colors.length] }}
            >
              &#9733;
            </span>
          </motion.div>
        )
      })}

      {/* Sparkle particles */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * 360 + 15
        const rad = (angle * Math.PI) / 180
        const distance = size === 'sm' ? 45 : size === 'md' ? 70 : 95
        const x = Math.cos(rad) * distance
        const y = Math.sin(rad) * distance

        return (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
            style={{ backgroundColor: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: [0, x * 0.5, x],
              y: [0, y * 0.5, y],
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1,
              delay: 0.2 + i * 0.03,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Animated "+XP" text that floats up
 */
interface XpFloatTextProps {
  xp: number
  show: boolean
  onComplete?: () => void
}

export function XpFloatText({ xp, show, onComplete }: XpFloatTextProps) {
  if (!show) return null

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 pointer-events-none z-50"
      initial={{ y: 0, opacity: 0, scale: 0.5 }}
      animate={{
        y: [-20, -60],
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.8],
      }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-black text-2xl px-4 py-2 rounded-full shadow-xl whitespace-nowrap">
        +{xp} XP &#10024;
      </div>
    </motion.div>
  )
}
