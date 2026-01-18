'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Download } from 'lucide-react'
import type { BadgeWithStatus } from '@/lib/actions/kids-gamification'
import { markBadgeSeen } from '@/lib/actions/kids-tasks'
import { useGameSound } from '@/hooks/useGameSound'

interface BadgesGridProps {
  badges: BadgeWithStatus[]
  initialTab: 'badges' | 'leaderboard'
  childId: string
  children: React.ReactNode // Pour le leaderboard
}

export function BadgesGrid({ badges, initialTab, childId, children }: BadgesGridProps) {
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>(initialTab)
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithStatus | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const { play } = useGameSound()

  const handleBadgeClick = async (badge: BadgeWithStatus) => {
    play('click')
    setSelectedBadge(badge)

    // Marquer comme vu si débloqué et pas encore vu
    if (badge.unlocked && !badge.seen) {
      await markBadgeSeen(badge.id)
    }
  }

  const handleTabChange = (tab: 'badges' | 'leaderboard') => {
    play('click')
    setActiveTab(tab)
  }

  const handleShare = async () => {
    if (!selectedBadge) return

    setIsSharing(true)
    play('success')

    const imageUrl = `/api/badges/${selectedBadge.id}/image?childId=${childId}`

    try {
      if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ url: window.location.href })) {
        // Mobile native share
        await navigator.share({
          title: `J'ai débloqué: ${selectedBadge.name}!`,
          text: `J'ai obtenu le badge "${selectedBadge.name}" sur FamilyLoad! 🏆`,
          url: window.location.origin + imageUrl,
        })
      } else {
        // Desktop: download image
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `badge-${selectedBadge.slug || selectedBadge.id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      // User cancelled or error
      console.log('Share cancelled or failed', error)
    } finally {
      setIsSharing(false)
    }
  }

  const unlockedBadges = badges.filter(b => b.unlocked)
  const lockedBadges = badges.filter(b => !b.unlocked)

  return (
    <>
      {/* Tabs */}
      <div className="flex bg-white/50 rounded-2xl p-1 mb-6">
        <button
          onClick={() => handleTabChange('badges')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
            activeTab === 'badges'
              ? 'bg-white text-gray-800 shadow'
              : 'text-gray-500'
          }`}
        >
          🏆 Mes badges
        </button>
        <button
          onClick={() => handleTabChange('leaderboard')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-white text-gray-800 shadow'
              : 'text-gray-500'
          }`}
        >
          📊 Classement
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'badges' ? (
          <motion.div
            key="badges"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Badges débloqués */}
            {unlockedBadges.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Débloqués ({unlockedBadges.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {unlockedBadges.map((badge, index) => (
                    <motion.button
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBadgeClick(badge)}
                      className="relative bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {badge.name}
                      </p>
                      {!badge.seen && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Badges verrouillés */}
            {lockedBadges.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  À débloquer ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {lockedBadges.map((badge, index) => (
                    <motion.button
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBadgeClick(badge)}
                      className="bg-gray-100 rounded-2xl p-4 opacity-50"
                    >
                      <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                      <p className="text-xs font-medium text-gray-400 truncate">
                        ???
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal détail badge */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl ${
                selectedBadge.unlocked
                  ? 'bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100'
                  : 'bg-gray-100'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`text-6xl mb-4 ${!selectedBadge.unlocked && 'grayscale opacity-50'}`}>
                {selectedBadge.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {selectedBadge.unlocked ? selectedBadge.name : '???'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedBadge.description}
              </p>

              {selectedBadge.xp_reward > 0 && (
                <div className={`inline-block px-4 py-2 rounded-full mb-4 ${
                  selectedBadge.unlocked
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  +{selectedBadge.xp_reward} XP
                </div>
              )}

              {selectedBadge.unlocked && selectedBadge.unlocked_at && (
                <p className="text-sm text-gray-500">
                  Débloqué le {new Date(selectedBadge.unlocked_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}

              {/* Boutons d'action */}
              <div className="mt-4 space-y-2">
                {/* Bouton partager - seulement pour badges débloqués */}
                {selectedBadge.unlocked && (
                  <motion.button
                    onClick={handleShare}
                    disabled={isSharing}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSharing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Partage...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Partager mon badge! 🎉
                      </>
                    )}
                  </motion.button>
                )}

                <button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
