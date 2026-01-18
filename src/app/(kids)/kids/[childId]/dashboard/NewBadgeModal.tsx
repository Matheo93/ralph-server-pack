'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { markBadgeSeen } from '@/lib/actions/kids-tasks'
import { useGameSound } from '@/hooks/useGameSound'
import type { Badge } from '@/types/database'

interface NewBadgeModalProps {
  badges: Array<Badge & { unlocked_at: string }>
}

export function NewBadgeModal({ badges }: NewBadgeModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const { play } = useGameSound()

  const currentBadge = badges[currentIndex]

  useEffect(() => {
    // Lancer les confettis et jouer le son au montage
    if (currentBadge) {
      play('badge-unlock')
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F97316', '#FBBF24', '#10B981'],
      })
    }
  }, [currentIndex, currentBadge, play])

  const handleNext = async () => {
    play('click')
    
    if (currentBadge) {
      // Marquer le badge comme vu
      await markBadgeSeen(currentBadge.id)
    }

    if (currentIndex < badges.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setIsVisible(false)
    }
  }

  if (!isVisible || !currentBadge) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
        className="bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 dark:from-yellow-900/80 dark:via-orange-900/80 dark:to-pink-900/80 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl"
      >
        {/* Indicateur de progression */}
        {badges.length > 1 && (
          <div className="flex justify-center gap-2 mb-4">
            {badges.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-pink-500 dark:bg-pink-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}

        {/* Titre */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2"
        >
          Nouveau badge débloqué !
        </motion.h2>

        {/* Icône du badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
          className="text-8xl mb-4"
        >
          {currentBadge.icon}
        </motion.div>

        {/* Nom du badge */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2"
        >
          {currentBadge.name}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600 dark:text-gray-300 mb-6"
        >
          {currentBadge.description}
        </motion.p>

        {/* Récompense XP */}
        {currentBadge.xp_reward > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/80 dark:bg-slate-800/80 rounded-2xl py-3 px-6 inline-block mb-6"
          >
            <span className="text-pink-600 dark:text-pink-400 font-bold text-lg">
              +{currentBadge.xp_reward} XP bonus !
            </span>
          </motion.div>
        )}

        {/* Bouton continuer */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
        >
          {currentIndex < badges.length - 1 ? 'Voir le suivant ✨' : 'Super ! 🎉'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
