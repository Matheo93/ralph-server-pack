'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface XpGain {
  id: string
  amount: number
  x: number
  y: number
}

interface XpGainAnimationProps {
  trigger: { amount: number; timestamp: number } | null
}

export function XpGainAnimation({ trigger }: XpGainAnimationProps) {
  const [gains, setGains] = useState<XpGain[]>([])

  useEffect(() => {
    if (trigger && trigger.amount > 0) {
      const id = `${trigger.timestamp}-${Math.random()}`
      const x = 50 + (Math.random() - 0.5) * 30 // Random horizontal position around center
      const y = 40 + (Math.random() - 0.5) * 10 // Random vertical position

      setGains((prev) => [...prev, { id, amount: trigger.amount, x, y }])

      // Remove after animation
      setTimeout(() => {
        setGains((prev) => prev.filter((g) => g.id !== id))
      }, 1500)
    }
  }, [trigger])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {gains.map((gain) => (
          <motion.div
            key={gain.id}
            initial={{
              opacity: 0,
              scale: 0.5,
              x: `${gain.x}%`,
              y: `${gain.y}%`,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1, 0.8],
              y: [`${gain.y}%`, `${gain.y - 20}%`],
            }}
            transition={{
              duration: 1.5,
              ease: 'easeOut',
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex items-center gap-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-lg">
              <span className="text-xl">✨</span>
              +{gain.amount} XP
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Hook to trigger XP gain animations
 */
export function useXpGainAnimation() {
  const [trigger, setTrigger] = useState<{ amount: number; timestamp: number } | null>(null)

  const showXpGain = (amount: number) => {
    setTrigger({ amount, timestamp: Date.now() })
  }

  return { trigger, showXpGain }
}
