'use client'

import { useState } from 'react'
import type { ChallengeForChild, CompletedChallenge } from '@/types/database'

interface ChallengesGridProps {
  activeChallenges: ChallengeForChild[]
  completedChallenges: CompletedChallenge[]
}

export function ChallengesGrid({
  activeChallenges,
  completedChallenges,
}: ChallengesGridProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-orange-500 text-white shadow'
              : 'bg-white/50 text-gray-600'
          }`}
        >
          En cours ({activeChallenges.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-orange-500 text-white shadow'
              : 'bg-white/50 text-gray-600'
          }`}
        >
          Termines ({completedChallenges.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'active' ? (
        <div className="space-y-4">
          {activeChallenges.length === 0 ? (
            <div className="text-center py-12 bg-white/50 rounded-2xl">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Pas de defi en cours
              </h3>
              <p className="text-gray-500 text-sm">
                Tes parents vont bientot te proposer des defis !
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
            <div className="text-center py-12 bg-white/50 rounded-2xl">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Aucun defi termine
              </h3>
              <p className="text-gray-500 text-sm">
                Complete des defis pour les voir ici !
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
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow">
          {challenge.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">{challenge.name}</h3>
          {challenge.description && (
            <p className="text-sm text-gray-500 line-clamp-1">{challenge.description}</p>
          )}
        </div>
        {challenge.daysRemaining !== null && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
            challenge.daysRemaining <= 2
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {challenge.daysRemaining}j
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progression</span>
          <span className="font-medium text-gray-800">
            {challenge.progress.current_count}/{challenge.required_count}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${challenge.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Reward preview */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Recompense</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-500">+{challenge.reward_xp} XP</span>
          {challenge.reward_custom && (
            <span className="text-gray-600">+ {challenge.reward_custom}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function CompletedChallengeCard({ challenge }: { challenge: CompletedChallenge }) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">
          {challenge.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">{challenge.name}</h3>
          <p className="text-xs text-green-600">
            Termine le {new Date(challenge.progress.completed_at!).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="text-green-500 text-2xl">✓</div>
      </div>

      {/* Rewards earned */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-amber-500">+{challenge.progress.xp_awarded} XP</span>
        {challenge.badge && (
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
            {challenge.badge.icon} {challenge.badge.name}
          </span>
        )}
      </div>
    </div>
  )
}
