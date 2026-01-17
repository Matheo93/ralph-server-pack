'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface KidsHeaderProps {
  firstName: string
  avatarUrl?: string | null
  currentXp: number
  currentLevel: number
  levelName: string
  levelIcon: string
  xpForNextLevel: number | null
  streakCurrent: number
}

export function KidsHeader({
  firstName,
  avatarUrl,
  currentXp,
  currentLevel,
  levelName,
  levelIcon,
  xpForNextLevel,
  streakCurrent,
}: KidsHeaderProps) {
  // Calcul de la progression vers le niveau suivant
  const progressPercent = xpForNextLevel
    ? Math.min(100, Math.round((currentXp / xpForNextLevel) * 100))
    : 100

  return (
    <header className="bg-white/80 backdrop-blur-lg rounded-b-3xl shadow-lg px-4 py-4 mb-4">
      <div className="flex items-center justify-between">
        {/* Avatar et nom */}
        <div className="flex items-center gap-3">
          <Avatar className="w-14 h-14 border-3 border-white shadow-md">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={firstName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-500 text-white text-xl font-bold">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              Salut {firstName} !
            </h1>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>{levelIcon}</span>
              <span>{levelName}</span>
              <span className="text-gray-400">• Niv. {currentLevel}</span>
            </div>
          </div>
        </div>

        {/* Streak */}
        {streakCurrent > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-2xl px-3 py-2 shadow-lg"
          >
            <span className="text-2xl">🔥</span>
            <span className="text-sm font-bold">{streakCurrent}</span>
          </motion.div>
        )}
      </div>

      {/* Barre de progression XP */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 font-medium">
            {currentXp} XP
          </span>
          {xpForNextLevel && (
            <span className="text-gray-400">
              {xpForNextLevel} XP pour niveau {currentLevel + 1}
            </span>
          )}
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
          />
        </div>
      </div>
    </header>
  )
}
