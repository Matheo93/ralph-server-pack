import { redirect } from 'next/navigation'
import { getKidsSession } from '@/lib/actions/kids-auth'
import {
  getActiveChallengesForChild,
  getCompletedChallengesForChild,
  getChallengeStatsForChild,
  getThisWeekChallengesForChild,
} from '@/lib/actions/kids-challenges'
import { ChallengesGrid } from './ChallengesGrid'

export default async function KidsChallengesPage() {
  const session = await getKidsSession()

  if (!session) {
    redirect('/kids')
  }

  const [activeResult, completedResult, statsResult, thisWeekResult] = await Promise.all([
    getActiveChallengesForChild(),
    getCompletedChallengesForChild(5),
    getChallengeStatsForChild(),
    getThisWeekChallengesForChild(),
  ])

  const activeChallenges = activeResult.success ? activeResult.data ?? [] : []
  const completedChallenges = completedResult.success ? completedResult.data ?? [] : []
  const thisWeekChallenges = thisWeekResult.success ? thisWeekResult.data ?? [] : []
  const stats = statsResult.success ? statsResult.data : null

  return (
    <div className="min-h-screen p-4">
      {/* Header - Style fun et coloré */}
      <header className="mb-6 bg-gradient-to-r from-orange-100 via-pink-100 to-purple-100 dark:from-orange-900/50 dark:via-pink-900/50 dark:to-purple-900/50 rounded-3xl p-4 shadow-lg border-2 border-orange-200/50 dark:border-orange-700/50 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>⚡</div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 dark:from-orange-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
              Mes Défis
            </h1>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              Relève des défis pour gagner des XP ! 🚀
            </p>
          </div>
        </div>
      </header>

      {/* Stats rapides - Style jeu vidéo */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-200 via-cyan-100 to-teal-100 dark:from-blue-900/50 dark:via-cyan-900/50 dark:to-teal-900/50 backdrop-blur-sm rounded-3xl p-4 text-center shadow-xl border-2 border-blue-300/50 dark:border-blue-700/50 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-1 animate-pulse">🎯</div>
            <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">{stats.activeCount}</div>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-300">En cours</div>
          </div>
          <div className="bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 dark:from-green-900/50 dark:via-emerald-900/50 dark:to-teal-900/50 backdrop-blur-sm rounded-3xl p-4 text-center shadow-xl border-2 border-green-300/50 dark:border-green-700/50 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-1 animate-bounce" style={{ animationDuration: '1.5s' }}>🏆</div>
            <div className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">{stats.completedCount}</div>
            <div className="text-xs font-bold text-green-700 dark:text-green-300">Terminés</div>
          </div>
          <div className="bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 dark:from-amber-900/50 dark:via-yellow-900/50 dark:to-orange-900/50 backdrop-blur-sm rounded-3xl p-4 text-center shadow-xl border-2 border-amber-300/50 dark:border-amber-700/50 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-1 animate-spin" style={{ animationDuration: '3s' }}>⭐</div>
            <div className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">{stats.totalXpEarned}</div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300">XP gagnés</div>
          </div>
        </div>
      )}

      <ChallengesGrid
        activeChallenges={activeChallenges}
        completedChallenges={completedChallenges}
        thisWeekChallenges={thisWeekChallenges}
      />
    </div>
  )
}

export const metadata = {
  title: 'Mes Défis',
}
