'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import type { Child, ChildAccount, XpLevel } from '@/types/database'

interface ProfileCardProps {
  child: Pick<Child, 'id' | 'first_name' | 'avatar_url' | 'birthdate'>
  account: ChildAccount
  level: XpLevel
  nextLevel: XpLevel | null
  xpProgress: number
  badgesUnlocked: number
  badgesTotal: number
  rank: number
  totalSiblings: number
}

export function ProfileCard({
  child,
  account,
  level,
  nextLevel,
  xpProgress,
  badgesUnlocked,
  badgesTotal,
  rank,
  totalSiblings,
}: ProfileCardProps) {
  // Calculer l'âge
  const age = child.birthdate
    ? Math.floor((Date.now() - new Date(child.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-pink-50 dark:from-slate-800 dark:to-purple-900/50 rounded-3xl p-6 shadow-xl transition-colors duration-300"
    >
      {/* Avatar et infos principales */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <Avatar className="w-28 h-28 border-4 border-white dark:border-slate-700 shadow-lg">
            {child.avatar_url ? (
              <AvatarImage src={child.avatar_url} alt={child.first_name} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-500 text-white text-4xl font-bold">
              {child.first_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Badge niveau */}
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 rounded-full p-2 shadow-lg">
            <span className="text-2xl">{level.icon}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{child.first_name}</h1>
        {age && (
          <p className="text-gray-600 dark:text-gray-400">{age} ans</p>
        )}
      </div>

      {/* Niveau et XP */}
      <div className="bg-white/70 dark:bg-slate-800/70 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{level.icon}</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{level.name}</span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Niv. {account.current_level}</span>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1">
          <Progress value={xpProgress} className="h-3" />
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{account.current_xp} XP</span>
            {nextLevel && (
              <span>{nextLevel.xp_required} XP pour {nextLevel.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🔥</div>
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {account.streak_current}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Streak</div>
        </div>

        {/* Badges */}
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {badgesUnlocked}/{badgesTotal}
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Badges</div>
        </div>

        {/* Rang */}
        {totalSiblings > 1 && (
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '📊'}
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              #{rank}
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Rang</div>
          </div>
        )}

        {totalSiblings === 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {account.current_xp}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total XP</div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
