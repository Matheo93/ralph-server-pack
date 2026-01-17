'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { LeaderboardEntry } from '@/types/database'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentChildId: string
}

const rankEmojis: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

const avatarColors = [
  'bg-gradient-to-br from-pink-400 to-rose-500',
  'bg-gradient-to-br from-orange-400 to-amber-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-violet-400 to-purple-500',
]

export function Leaderboard({ entries, currentChildId }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🏆</div>
        <p className="text-gray-500">Pas encore de classement</p>
      </div>
    )
  }

  // Si un seul enfant, pas de classement
  if (entries.length === 1) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">⭐</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Tu es unique !
        </h3>
        <p className="text-gray-500">
          Pas de frère ou sœur à battre... pour l&apos;instant !
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const isCurrentChild = entry.child_id === currentChildId
        const rankNum = Number(entry.rank)
        const rankEmoji = rankEmojis[rankNum]

        return (
          <motion.div
            key={entry.child_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-2xl ${
              isCurrentChild
                ? 'bg-gradient-to-r from-pink-100 to-orange-100 border-2 border-pink-300'
                : 'bg-white/70 backdrop-blur-sm'
            } shadow`}
          >
            {/* Rang */}
            <div className="w-10 text-center">
              {rankEmoji ? (
                <span className="text-2xl">{rankEmoji}</span>
              ) : (
                <span className="text-lg font-bold text-gray-400">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className="w-12 h-12 border-2 border-white shadow">
              {entry.avatar_url ? (
                <AvatarImage src={entry.avatar_url} alt={entry.first_name} />
              ) : null}
              <AvatarFallback
                className={`${
                  avatarColors[index % avatarColors.length]
                } text-white font-bold`}
              >
                {entry.first_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold truncate ${isCurrentChild ? 'text-pink-700' : 'text-gray-800'}`}>
                  {entry.first_name}
                </h4>
                {isCurrentChild && (
                  <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">
                    Toi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{entry.level_icon}</span>
                <span>{entry.level_name}</span>
                {entry.streak_current > 0 && (
                  <>
                    <span>•</span>
                    <span>🔥 {entry.streak_current}</span>
                  </>
                )}
              </div>
            </div>

            {/* XP */}
            <div className="text-right">
              <div className="font-bold text-gray-800">{entry.current_xp}</div>
              <div className="text-xs text-gray-500">XP</div>
            </div>
          </motion.div>
        )
      })}

      {/* Encouragement */}
      <div className="text-center pt-4">
        <p className="text-sm text-gray-500">
          Continue à compléter des missions pour gagner des XP ! 💪
        </p>
      </div>
    </div>
  )
}
