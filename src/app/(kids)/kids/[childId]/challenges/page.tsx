import { redirect } from 'next/navigation'
import { getKidsSession } from '@/lib/actions/kids-auth'
import {
  getActiveChallengesForChild,
  getCompletedChallengesForChild,
  getChallengeStatsForChild,
} from '@/lib/actions/kids-challenges'
import { ChallengesGrid } from './ChallengesGrid'

export default async function KidsChallengesPage() {
  const session = await getKidsSession()

  if (!session) {
    redirect('/kids')
  }

  const [activeResult, completedResult, statsResult] = await Promise.all([
    getActiveChallengesForChild(),
    getCompletedChallengesForChild(5),
    getChallengeStatsForChild(),
  ])

  const activeChallenges = activeResult.success ? activeResult.data ?? [] : []
  const completedChallenges = completedResult.success ? completedResult.data ?? [] : []
  const stats = statsResult.success ? statsResult.data : null

  return (
    <div className="min-h-screen p-4">
      {/* Header - Style fun et coloré */}
      <header className="mb-6 bg-gradient-to-r from-orange-100 via-pink-100 to-purple-100 rounded-3xl p-4 shadow-lg border-2 border-orange-200/50">
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>⚡</div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              Mes Défis
            </h1>
            <p className="text-gray-600 font-medium">
              Relève des défis pour gagner des XP ! 🚀
            </p>
          </div>
        </div>
      </header>

      {/* Stats rapides - Style jeu vidéo */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-200 via-cyan-100 to-teal-100 backdrop-blur-sm rounded-3xl p-4 text-center shadow-xl border-2 border-blue-300/50 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-1 animate-pulse">🎯</div>
            <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{stats.activeCount}</div>
            <div className="text-xs font-bold text-blue-700">En cours</div>
          </div>
          <div className="bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 backdrop-blur-sm rounded-3xl p-4 text-center shadow-xl border-2 border-green-300/50 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-1 animate-bounce" style={{ animationDuration: '1.5s' }}>🏆</div>
            <div className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.completedCount}</div>
            <div className="text-xs font-bold text-green-700">Terminés</div>
          </div>
          <div className="bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 backdrop-blur-sm rounded-3xl p-4 text-center shadow-xl border-2 border-amber-300/50 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-1 animate-spin" style={{ animationDuration: '3s' }}>⭐</div>
            <div className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{stats.totalXpEarned}</div>
            <div className="text-xs font-bold text-amber-700">XP gagnés</div>
          </div>
        </div>
      )}

      <ChallengesGrid
        activeChallenges={activeChallenges}
        completedChallenges={completedChallenges}
      />
    </div>
  )
}

export const metadata = {
  title: 'Mes Défis',
}
