import { redirect } from 'next/navigation'
import { getBadgesForChild, getLeaderboard } from '@/lib/actions/kids-gamification'
import { getKidsSession } from '@/lib/actions/kids-auth'
import { BadgesGrid } from './BadgesGrid'
import { Leaderboard } from './Leaderboard'

export default async function KidsBadgesPage() {
  const session = await getKidsSession()

  if (!session) {
    redirect('/kids')
  }

  const [badgesResult, leaderboardResult] = await Promise.all([
    getBadgesForChild(),
    getLeaderboard(),
  ])

  if (!badgesResult.success || !badgesResult.data) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 dark:text-red-400">{badgesResult.error}</p>
      </div>
    )
  }

  const { badges, totalXpFromBadges, unlockedCount } = badgesResult.data
  const leaderboard = leaderboardResult.data ?? []

  return (
    <div className="min-h-screen p-4">
      {/* Header - Style trophée fun et coloré */}
      <header className="mb-6 bg-gradient-to-r from-yellow-100 via-amber-100 to-orange-100 dark:from-yellow-900/50 dark:via-amber-900/50 dark:to-orange-900/50 rounded-3xl p-4 shadow-lg border-2 border-yellow-200/50 dark:border-yellow-700/50 relative overflow-hidden transition-colors duration-300">
        {/* Decorative elements */}
        <div className="absolute top-2 right-4 text-2xl opacity-40 animate-pulse">✨</div>
        <div className="absolute bottom-2 left-4 text-lg opacity-30 animate-bounce" style={{ animationDuration: '2s' }}>🌟</div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>🏆</div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 dark:from-yellow-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Mes Succès
            </h1>
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              {unlockedCount} badge{unlockedCount > 1 ? 's' : ''} débloqué{unlockedCount > 1 ? 's' : ''} sur {badges.length} 🎖️
            </p>
          </div>
        </div>
      </header>

      {/* Stats rapides - Style jeu vidéo avec animations */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-to-br from-purple-200 via-violet-100 to-indigo-100 dark:from-purple-900/50 dark:via-violet-900/50 dark:to-indigo-900/50 backdrop-blur-sm rounded-3xl p-5 text-center shadow-xl border-2 border-purple-300/50 dark:border-purple-700/50 transform hover:scale-105 transition-transform">
          <div className="text-4xl mb-2 animate-bounce" style={{ animationDuration: '1.5s' }}>🏆</div>
          <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400 bg-clip-text text-transparent">{unlockedCount}</div>
          <div className="text-sm font-bold text-purple-700 dark:text-purple-300">Badges gagnés</div>
        </div>
        <div className="bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 dark:from-amber-900/50 dark:via-yellow-900/50 dark:to-orange-900/50 backdrop-blur-sm rounded-3xl p-5 text-center shadow-xl border-2 border-amber-300/50 dark:border-amber-700/50 transform hover:scale-105 transition-transform">
          <div className="text-4xl mb-2 animate-spin" style={{ animationDuration: '4s' }}>⭐</div>
          <div className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">{totalXpFromBadges}</div>
          <div className="text-sm font-bold text-amber-700 dark:text-amber-300">XP bonus</div>
        </div>
      </div>

      {/* Tabs */}
      <BadgesGrid badges={badges} initialTab="badges" childId={session.childId}>
        <Leaderboard entries={leaderboard} currentChildId={session.childId} />
      </BadgesGrid>
    </div>
  )
}

export const metadata = {
  title: 'Mes Succès',
}
