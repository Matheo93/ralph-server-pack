'use client'

import { useState, useEffect } from 'react'
import { CelebrationOverlay } from '@/components/kids/CelebrationOverlay'
import { useGameSound } from '@/hooks/useGameSound'
import type { ChallengeForChild, CompletedChallenge } from '@/types/database'

interface ChallengesGridProps {
  activeChallenges: ChallengeForChild[]
  completedChallenges: CompletedChallenge[]
  thisWeekChallenges: ChallengeForChild[]
}

function getRecentlyCompletedChallenge(challenges: CompletedChallenge[]): CompletedChallenge | null {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

  for (const challenge of challenges) {
    if (challenge.progress.completed_at) {
      const completedTime = new Date(challenge.progress.completed_at).getTime()
      if (completedTime > fiveMinutesAgo) {
        const celebratedKey = `challenge_celebrated_${challenge.id}`
        if (typeof window !== 'undefined' && !localStorage.getItem(celebratedKey)) {
          return challenge
        }
      }
    }
  }
  return null
}

export function ChallengesGrid({
  activeChallenges,
  completedChallenges,
  thisWeekChallenges,
}: ChallengesGridProps) {
  const [activeTab, setActiveTab] = useState<'this-week' | 'active' | 'completed'>('this-week')
  const [celebrationChallenge, setCelebrationChallenge] = useState<CompletedChallenge | null>(null)
  const { play } = useGameSound()

  useEffect(() => {
    const recentChallenge = getRecentlyCompletedChallenge(completedChallenges)
    if (recentChallenge) {
      setCelebrationChallenge(recentChallenge)
      play('challenge-complete')
      localStorage.setItem(`challenge_celebrated_${recentChallenge.id}`, 'true')
    }
  }, [completedChallenges, play])

  const handleCelebrationComplete = () => {
    setCelebrationChallenge(null)
  }

  const handleTabChange = (tab: 'this-week' | 'active' | 'completed') => {
    play('click')
    setActiveTab(tab)
  }

  return (
    <div>
      <CelebrationOverlay
        isVisible={celebrationChallenge !== null}
        type="badge"
        icon={celebrationChallenge?.icon ?? '🏆'}
        title="Défi Relevé !"
        subtitle={celebrationChallenge ? `${celebrationChallenge.name} - +${celebrationChallenge.progress.xp_awarded} XP` : undefined}
        onComplete={handleCelebrationComplete}
        duration={3500}
      />

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => handleTabChange('this-week')}
          className={`flex-1 py-3 px-3 rounded-2xl font-bold transition-all transform hover:scale-105 whitespace-nowrap text-sm ${
            activeTab === 'this-week'
              ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-xl scale-105'
              : 'bg-white/70 dark:bg-slate-800/70 text-gray-700 dark:text-gray-200 hover:bg-white/90 dark:hover:bg-slate-700/90'
          }`}
        >
          <span className="mr-1">📅</span> Cette semaine ({thisWeekChallenges.length})
        </button>
        <button
          onClick={() => handleTabChange('active')}
          className={`flex-1 py-3 px-3 rounded-2xl font-bold transition-all transform hover:scale-105 whitespace-nowrap text-sm ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white shadow-xl scale-105'
              : 'bg-white/70 dark:bg-slate-800/70 text-gray-700 dark:text-gray-200 hover:bg-white/90 dark:hover:bg-slate-700/90'
          }`}
        >
          <span className="mr-1">🔥</span> Tous ({activeChallenges.length})
        </button>
        <button
          onClick={() => handleTabChange('completed')}
          className={`flex-1 py-3 px-3 rounded-2xl font-bold transition-all transform hover:scale-105 whitespace-nowrap text-sm ${
            activeTab === 'completed'
              ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white shadow-xl scale-105'
              : 'bg-white/70 dark:bg-slate-800/70 text-gray-700 dark:text-gray-200 hover:bg-white/90 dark:hover:bg-slate-700/90'
          }`}
        >
          <span className="mr-1">✅</span> Terminés ({completedChallenges.length})
        </button>
      </div>

      {activeTab === 'this-week' ? (
        <div className="space-y-4">
          {thisWeekChallenges.length === 0 ? (
            <div className="text-center py-10 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/50 dark:via-indigo-900/50 dark:to-purple-900/50 rounded-3xl shadow-lg border-2 border-blue-200/50 dark:border-blue-700/50 relative overflow-hidden">
              <div className="absolute top-4 left-8 text-2xl opacity-40 animate-bounce">📆</div>
              <div className="absolute bottom-6 right-10 text-xl opacity-40 animate-bounce" style={{ animationDelay: '0.5s' }}>⭐</div>
              <div className="text-6xl mb-4 animate-pulse">📅</div>
              <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                Pas de défi cette semaine
              </h3>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Regarde les défis en cours pour cette semaine ! 🗓️
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 rounded-2xl p-3 mb-2 border border-blue-200/50 dark:border-blue-700/50">
                <p className="text-sm text-center font-medium text-blue-700 dark:text-blue-300">
                  🗓️ Défis à terminer cette semaine • Concentre-toi sur ceux-ci !
                </p>
              </div>
              {thisWeekChallenges.map(challenge => (
                <ThisWeekChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </>
          )}
        </div>
      ) : activeTab === 'active' ? (
        <div className="space-y-4">
          {activeChallenges.length === 0 ? (
            <div className="text-center py-10 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50 rounded-3xl shadow-lg border-2 border-purple-200/50 dark:border-purple-700/50 relative overflow-hidden">
              <div className="absolute top-4 left-8 text-2xl opacity-40 animate-bounce">🌟</div>
              <div className="absolute bottom-6 right-10 text-xl opacity-40 animate-bounce" style={{ animationDelay: '0.5s' }}>✨</div>
              <div className="text-6xl mb-4 animate-pulse">🎯</div>
              <h3 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
                Pas de défi en cours
              </h3>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Tes parents vont bientôt te proposer des défis ! 🚀
              </p>
            </div>
          ) : (
            activeChallenges.map(challenge => (
              <ActiveChallengeCard key={challenge.id} challenge={challenge} />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {completedChallenges.length === 0 ? (
            <div className="text-center py-10 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-green-900/50 dark:via-emerald-900/50 dark:to-teal-900/50 rounded-3xl shadow-lg border-2 border-green-200/50 dark:border-green-700/50 relative overflow-hidden">
              <div className="absolute top-4 right-8 text-2xl opacity-40 animate-bounce">💪</div>
              <div className="absolute bottom-6 left-10 text-xl opacity-40 animate-bounce" style={{ animationDelay: '0.5s' }}>🌈</div>
              <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🏆</div>
              <h3 className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent mb-2">
                Aucun défi terminé
              </h3>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Complète des défis pour les voir ici ! 💪
              </p>
            </div>
          ) : (
            completedChallenges.map(challenge => (
              <CompletedChallengeCard key={challenge.id} challenge={challenge} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ActiveChallengeCard({ challenge }: { challenge: ChallengeForChild }) {
  const isAlmostDone = challenge.progressPercentage >= 75
  const isHalfway = challenge.progressPercentage >= 50

  return (
    <div className="bg-gradient-to-br from-white/90 via-orange-50/80 to-pink-50/80 dark:from-slate-800/90 dark:via-orange-900/30 dark:to-pink-900/30 backdrop-blur-sm rounded-3xl p-5 shadow-xl border-2 border-orange-200/50 dark:border-orange-700/50 transform hover:scale-102 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-pulse" style={{ animationDuration: '2s' }}>
          {challenge.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-black text-gray-800 dark:text-gray-100 text-lg">{challenge.name}</h3>
          {challenge.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{challenge.description}</p>
          )}
        </div>
        {challenge.daysRemaining !== null && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            challenge.daysRemaining <= 2
              ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse'
              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
          }`}>
            ⏰ {challenge.daysRemaining}j
          </div>
        )}
      </div>

      <div className="mb-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl p-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1">
            {isAlmostDone ? '🔥' : isHalfway ? '💪' : '🎯'} Progression
          </span>
          <span className="font-black text-purple-600 dark:text-purple-400">
            {challenge.progress.current_count}/{challenge.required_count}
          </span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAlmostDone
                ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500'
            }`}
            style={{ width: `${challenge.progressPercentage}%` }}
          />
        </div>
        {isAlmostDone && (
          <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-1 text-center animate-pulse">
            🎉 Presque terminé ! Continue comme ça !
          </p>
        )}
      </div>

      <div className="flex items-center justify-between bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 rounded-2xl px-4 py-2">
        <span className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
          <span className="text-lg">🎁</span> Récompense
        </span>
        <div className="flex items-center gap-2">
          <span className="font-black text-amber-600 dark:text-amber-400 bg-amber-200 dark:bg-amber-800/50 px-2 py-0.5 rounded-full">+{challenge.reward_xp} XP</span>
          {challenge.reward_custom && (
            <span className="text-amber-700 dark:text-amber-300 font-medium">+ {challenge.reward_custom}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ThisWeekChallengeCard({ challenge }: { challenge: ChallengeForChild }) {
  const isAlmostDone = challenge.progressPercentage >= 75
  const isHalfway = challenge.progressPercentage >= 50
  const isUrgent = challenge.daysRemaining !== null && challenge.daysRemaining <= 2

  return (
    <div className={`bg-gradient-to-br from-white/90 via-blue-50/80 to-indigo-50/80 dark:from-slate-800/90 dark:via-blue-900/30 dark:to-indigo-900/30 backdrop-blur-sm rounded-3xl p-5 shadow-xl border-2 ${
      isUrgent ? 'border-red-300/70 dark:border-red-700/70' : 'border-blue-200/50 dark:border-blue-700/50'
    } transform hover:scale-102 transition-all`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-pulse" style={{ animationDuration: '2s' }}>
          {challenge.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-black text-gray-800 dark:text-gray-100 text-lg">{challenge.name}</h3>
          {challenge.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{challenge.description}</p>
          )}
        </div>
        {challenge.daysRemaining !== null && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
            isUrgent
              ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse'
              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
          }`}>
            {isUrgent ? '🚨' : '⏰'} {challenge.daysRemaining}j
          </div>
        )}
      </div>

      {/* Urgency banner for urgent challenges */}
      {isUrgent && (
        <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 rounded-xl p-2 mb-3 border border-red-200/50 dark:border-red-700/50">
          <p className="text-xs text-center font-bold text-red-600 dark:text-red-400 animate-pulse">
            ⚡ Défi urgent ! Plus que {challenge.daysRemaining} jour{challenge.daysRemaining !== 1 ? 's' : ''} !
          </p>
        </div>
      )}

      <div className="mb-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl p-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1">
            {isAlmostDone ? '🔥' : isHalfway ? '💪' : '📅'} Progression
          </span>
          <span className="font-black text-indigo-600 dark:text-indigo-400">
            {challenge.progress.current_count}/{challenge.required_count}
          </span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAlmostDone
                ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500'
            }`}
            style={{ width: `${challenge.progressPercentage}%` }}
          />
        </div>
        {isAlmostDone && (
          <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-1 text-center animate-pulse">
            🎉 Presque terminé ! Encore un effort !
          </p>
        )}
      </div>

      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-2xl px-4 py-2">
        <span className="text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1">
          <span className="text-lg">🎁</span> Récompense
        </span>
        <div className="flex items-center gap-2">
          <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-200 dark:bg-indigo-800/50 px-2 py-0.5 rounded-full">+{challenge.reward_xp} XP</span>
          {challenge.reward_custom && (
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">+ {challenge.reward_custom}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function CompletedChallengeCard({ challenge }: { challenge: CompletedChallenge }) {
  return (
    <div className="bg-gradient-to-br from-green-100/90 via-emerald-50/80 to-teal-50/80 dark:from-green-900/50 dark:via-emerald-900/30 dark:to-teal-900/30 backdrop-blur-sm rounded-3xl p-4 shadow-lg border-2 border-green-200/50 dark:border-green-700/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-md">
          {challenge.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{challenge.name}</h3>
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            ✅ Terminé le {new Date(challenge.progress.completed_at!).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xl">✓</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 rounded-2xl px-3 py-2">
        <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span className="text-lg">💎</span> +{challenge.progress.xp_awarded} XP
        </span>
        {challenge.badge && (
          <span className="bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/50 dark:to-blue-900/50 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full text-xs font-bold">
            {challenge.badge.icon} {challenge.badge.name}
          </span>
        )}
      </div>
    </div>
  )
}
