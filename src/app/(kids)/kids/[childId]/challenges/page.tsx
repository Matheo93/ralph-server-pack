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
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mes defis</h1>
        <p className="text-gray-500">
          Releve des defis pour gagner des XP !
        </p>
      </header>

      {/* Stats rapides */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 text-center shadow">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xl font-bold text-gray-800">{stats.activeCount}</div>
            <div className="text-xs text-gray-500">En cours</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 text-center shadow">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-xl font-bold text-gray-800">{stats.completedCount}</div>
            <div className="text-xs text-gray-500">Termines</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 text-center shadow">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-xl font-bold text-gray-800">{stats.totalXpEarned}</div>
            <div className="text-xs text-gray-500">XP gagnes</div>
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
  title: 'Mes Defis',
}
