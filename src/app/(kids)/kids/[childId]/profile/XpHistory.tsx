'use client'

import { motion } from 'framer-motion'

interface XpHistoryEntry {
  id: string
  amount: number
  reason: string
  task_title?: string | null
  badge_name?: string | null
  created_at: string
}

interface XpHistoryProps {
  history: XpHistoryEntry[]
}

const reasonIcons: Record<string, string> = {
  task_completed: '✅',
  badge_earned: '🏆',
  bonus_streak: '🔥',
  reward_spent: '🎁',
}

const reasonLabels: Record<string, string> = {
  task_completed: 'Mission complétée',
  badge_earned: 'Badge débloqué',
  bonus_streak: 'Bonus streak',
  reward_spent: 'Récompense échangée',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function XpHistory({ history }: XpHistoryProps) {
  return (
    <div className="space-y-2">
      {history.map((entry, index) => {
        const icon = reasonIcons[entry.reason] ?? '⭐'
        const label = entry.task_title ?? entry.badge_name ?? (reasonLabels[entry.reason] ?? entry.reason)
        const isNegative = entry.amount < 0

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-sm"
          >
            <div className="text-2xl">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{label}</p>
              <p className="text-xs text-gray-500">{formatRelativeTime(entry.created_at)}</p>
            </div>
            <div className={`font-bold ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
              {isNegative ? '' : '+'}{entry.amount} XP
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
