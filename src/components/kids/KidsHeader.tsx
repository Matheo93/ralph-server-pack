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
    <header className="bg-gradient-to-br from-white/90 via-pink-50/80 to-orange-50/80 dark:from-slate-800/90 dark:via-purple-900/80 dark:to-indigo-900/80 backdrop-blur-lg rounded-b-[2rem] shadow-xl px-4 py-5 mb-4 border-b-4 border-pink-200/50 dark:border-purple-600/50 relative overflow-hidden transition-colors duration-300">
      {/* Decorative sparkles */}
      <div className="absolute top-2 right-16 text-xl opacity-40 animate-pulse">✨</div>
      <div className="absolute bottom-2 left-4 text-lg opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}>⭐</div>

      <div className="flex items-center justify-between relative z-10">
        {/* Avatar et nom */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Avatar className="w-16 h-16 border-4 border-white dark:border-slate-700 shadow-lg ring-2 ring-pink-200 dark:ring-purple-500">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={`Avatar de ${firstName}`} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 text-white text-2xl font-black" aria-hidden="true">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div>
            <motion.h1
              className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-orange-500 dark:from-pink-400 dark:to-orange-400"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              Coucou {firstName} ! 👋
            </motion.h1>
            <motion.div
              className="flex items-center gap-1.5 text-sm"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-lg">{levelIcon}</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{levelName}</span>
              <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs font-bold">Niv. {currentLevel}</span>
            </motion.div>
          </div>
        </div>

        {/* Streak avec animation feu */}
        {streakCurrent > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 text-white rounded-2xl px-4 py-2.5 shadow-xl border-2 border-orange-300/50"
          >
            <motion.span
              className="text-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🔥
            </motion.span>
            <span className="text-base font-black">{streakCurrent} jour{streakCurrent > 1 ? 's' : ''}</span>
          </motion.div>
        )}
      </div>

      {/* Barre de progression XP - Style game */}
      <motion.div
        className="mt-5 bg-white/60 dark:bg-slate-800/60 rounded-2xl p-3 shadow-inner"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
            <span className="text-lg">💎</span> {currentXp} XP
          </span>
          {xpForNextLevel && (
            <span className="text-orange-700 dark:text-orange-400 font-semibold text-xs">
              🎯 {xpForNextLevel - currentXp} XP restants
            </span>
          )}
        </div>
        <div
          className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner"
          role="progressbar"
          aria-label="Progression vers le niveau suivant"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full relative"
          >
            {/* Sparkle effect on progress bar */}
            <motion.div
              className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          </motion.div>
        </div>
      </motion.div>
    </header>
  )
}
